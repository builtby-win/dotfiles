import { checkbox, select, confirm } from "@inquirer/prompts";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { appendSectionsToFile, DOTFILES_MARKER_END, DOTFILES_MARKER_START, findConflictingSections, findNewSections, generateDiff, parseShellFile, type ParsedSection } from "./shell-merge";
import { addToManifest, backupFile } from "./backups";
import { colors, log, DOTFILES_DIR, HOME } from "./context";

export interface MergeableConfig {
  name: string;
  description: string;
  userPath: string;
  dotfilesPath: string;
  type: "shell" | "config";
}

export const MERGEABLE_CONFIGS: MergeableConfig[] = [
  {
    name: "Shell Aliases",
    description: "Git shortcuts, directory jumping, package manager aliases, and more",
    userPath: join(HOME, ".zshrc"),
    dotfilesPath: join(DOTFILES_DIR, "shell", "aliases.sh"),
    type: "shell",
  },
  {
    name: "Shell Functions",
    description: "Git helpers, directory creation, archive extraction, etc.",
    userPath: join(HOME, ".zshrc"),
    dotfilesPath: join(DOTFILES_DIR, "shell", "functions.sh"),
    type: "shell",
  },
  {
    name: "Tmux Config",
    description: "Core profile plus optional basic keymap",
    userPath: join(HOME, ".tmux.conf"),
    dotfilesPath: join(DOTFILES_DIR, "chezmoi", "dot_config", "tmux", "builtby", "bootstrap.basic.conf"),
    type: "config",
  },
  {
    name: "Starship Prompt",
    description: "Fast, customizable shell prompt configuration",
    userPath: join(HOME, ".config", "starship.toml"),
    dotfilesPath: join(DOTFILES_DIR, "chezmoi", "dot_config", "starship.toml"),
    type: "config",
  },
  {
    name: "Ghostty Terminal",
    description: "GPU-accelerated terminal configuration",
    userPath: process.platform === "darwin"
      ? join(HOME, "Library", "Application Support", "com.mitchellh.ghostty", "config")
      : join(HOME, ".config", "ghostty", "config"),
    dotfilesPath: process.platform === "darwin"
      ? join(DOTFILES_DIR, "chezmoi", "dot_config", "ghostty", "config")
      : join(DOTFILES_DIR, "chezmoi", "dot_config", "ghostty", "config"),
    type: "config",
  },
];

export async function runMergeMode(): Promise<void> {
  console.log("");
  console.log(`${colors.cyan}${colors.bold}Merge Mode${colors.reset}`);
  console.log(`${colors.dim}Selectively adopt configurations without replacing your existing setup.${colors.reset}`);
  console.log(`${colors.dim}Your existing configs will be preserved - new items are appended with markers.${colors.reset}`);
  console.log("");

  // Check which configs have existing user files
  const availableConfigs: { config: MergeableConfig; hasUserFile: boolean }[] = [];

  for (const config of MERGEABLE_CONFIGS) {
    const hasUserFile = existsSync(config.userPath);
    const hasDotfilesFile = existsSync(config.dotfilesPath);
    if (hasDotfilesFile) {
      availableConfigs.push({ config, hasUserFile });
    }
  }

  if (availableConfigs.length === 0) {
    log.warning("No mergeable configurations found");
    return;
  }

  // Let user select which config to merge
  const selectedConfig = await select({
    message: "Which configuration would you like to explore?",
    choices: [
      ...availableConfigs.map(({ config, hasUserFile }) => ({
        name: `${config.name} ${hasUserFile ? colors.green + "(you have existing)" + colors.reset : colors.yellow + "(new file)" + colors.reset}`,
        value: config,
        description: config.description,
      })),
      { name: "← Back to main menu", value: null },
    ],
  });

  if (!selectedConfig) return;

  // Handle shell configs (aliases, functions) with section-by-section selection
  if (selectedConfig.type === "shell") {
    await mergeShellConfig(selectedConfig);
  } else {
    await mergeGenericConfig(selectedConfig);
  }

  // Ask if user wants to merge another
  const continueM = await confirm({
    message: "Merge another configuration?",
    default: true,
  });

  if (continueM) {
    await runMergeMode();
  }
}

export async function mergeShellConfig(config: MergeableConfig): Promise<void> {
  console.log("");
  log.step(`Analyzing ${config.name}...`);

  const dotfilesContent = readFileSync(config.dotfilesPath, "utf-8");
  const dotfilesSections = parseShellFile(dotfilesContent);

  // Filter to only meaningful sections (aliases and functions)
  const meaningfulSections = dotfilesSections.filter(
    s => s.type === "alias" || s.type === "function" || s.type === "conditional"
  );

  if (meaningfulSections.length === 0) {
    log.warning("No mergeable sections found in this config");
    return;
  }

  // Check what the user already has
  let userSections: ParsedSection[] = [];
  if (existsSync(config.userPath)) {
    const userContent = readFileSync(config.userPath, "utf-8");
    userSections = parseShellFile(userContent);
  }

  // Find new items and conflicts
  const newSections = findNewSections(userSections, meaningfulSections);
  const conflicts = findConflictingSections(userSections, meaningfulSections);

  console.log("");
  if (newSections.length > 0) {
    console.log(`  ${colors.green}${newSections.length}${colors.reset} new items available to add`);
  }
  if (conflicts.length > 0) {
    console.log(`  ${colors.yellow}${conflicts.length}${colors.reset} items differ from yours (you can compare & adopt)`);
  }
  if (newSections.length === 0 && conflicts.length === 0) {
    log.success("Your config already includes everything from dotfiles!");
    return;
  }
  console.log("");

  // Build choices for selection
  const choices: { name: string; value: ParsedSection; checked: boolean }[] = [];

  if (newSections.length > 0) {
    for (const section of newSections) {
      const preview = section.content.split("\n")[0].slice(0, 60);
      choices.push({
        name: `${colors.green}[NEW]${colors.reset} ${section.description} ${colors.dim}${preview}${colors.reset}`,
        value: section,
        checked: true,
      });
    }
  }

  if (conflicts.length > 0) {
    for (const { dotfiles } of conflicts) {
      const preview = dotfiles.content.split("\n")[0].slice(0, 60);
      choices.push({
        name: `${colors.yellow}[DIFFERS]${colors.reset} ${dotfiles.description} ${colors.dim}${preview}${colors.reset}`,
        value: dotfiles,
        checked: false,
      });
    }
  }

  // Let user preview any item before selecting
  const wantPreview = await confirm({
    message: "Would you like to preview any items before selecting?",
    default: false,
  });

  if (wantPreview) {
    let previewMore = true;
    while (previewMore) {
      const itemToPreview = await select({
        message: "Select an item to preview:",
        choices: [
          ...choices.map(c => ({
            name: c.name,
            value: c.value,
          })),
          { name: "← Done previewing", value: null },
        ],
      });

      if (itemToPreview) {
        console.log("");
        console.log(`${colors.cyan}━━━ ${itemToPreview.description} ━━━${colors.reset}`);
        console.log(itemToPreview.content);
        console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log("");

        // If it's a conflict, show the diff
        const conflict = conflicts.find(c => c.dotfiles.name === itemToPreview.name);
        if (conflict) {
          console.log(`${colors.yellow}Your current version:${colors.reset}`);
          console.log(conflict.user.content);
          console.log("");
        }
      } else {
        previewMore = false;
      }
    }
  }

  // Select which items to adopt
  const selectedSections = await checkbox({
    message: "Select items to add to your config (space to toggle):",
    choices,
    pageSize: 15,
  });

  if (selectedSections.length === 0) {
    log.info("No items selected");
    return;
  }

  // Confirm and apply
  console.log("");
  log.info(`Will add ${selectedSections.length} items to ${config.userPath}`);

  const proceed = await confirm({
    message: "Apply these changes?",
    default: true,
  });

  if (!proceed) {
    log.info("Cancelled");
    return;
  }

  // Backup if file exists
  if (existsSync(config.userPath)) {
    const backupPath = backupFile(config.userPath);
    addToManifest({ original: config.userPath, backup: backupPath, type: "file" });
  }

  // Append selected sections
  appendSectionsToFile(config.userPath, selectedSections);

  console.log("");
  log.success(`Added ${selectedSections.length} items to ${config.userPath}`);
  log.info(`Look for the "${DOTFILES_MARKER_START}" section in your config`);
}

export async function mergeGenericConfig(config: MergeableConfig): Promise<void> {
  console.log("");
  log.step(`Comparing ${config.name}...`);

  const dotfilesContent = readFileSync(config.dotfilesPath, "utf-8");
  const hasuserFile = existsSync(config.userPath);

  if (!hasuserFile) {
    // No existing file - offer to copy
    console.log("");
    console.log(`${colors.dim}You don't have this config yet. Here's what it includes:${colors.reset}`);
    console.log("");
    console.log(`${colors.cyan}━━━ Preview ━━━${colors.reset}`);
    const lines = dotfilesContent.split("\n").slice(0, 30);
    console.log(lines.join("\n"));
    if (dotfilesContent.split("\n").length > 30) {
      console.log(`${colors.dim}... (${dotfilesContent.split("\n").length - 30} more lines)${colors.reset}`);
    }
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━${colors.reset}`);
    console.log("");

    const install = await confirm({
      message: `Install ${config.name}?`,
      default: true,
    });

    if (install) {
      const targetDir = dirname(config.userPath);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      copyFileSync(config.dotfilesPath, config.userPath);
      log.success(`Installed ${config.name} to ${config.userPath}`);
    }
    return;
  }

  // Both files exist - show diff
  const userContent = readFileSync(config.userPath, "utf-8");

  if (userContent === dotfilesContent) {
    log.success("Your config matches the dotfiles version exactly!");
    return;
  }

  console.log("");
  console.log(`${colors.dim}Your config differs from dotfiles. Here's the comparison:${colors.reset}`);
  console.log("");

  // Show a simplified diff summary
  const userLines = userContent.split("\n");
  const dotfilesLines = dotfilesContent.split("\n");

  console.log(`  Your version: ${colors.yellow}${userLines.length} lines${colors.reset}`);
  console.log(`  Dotfiles version: ${colors.green}${dotfilesLines.length} lines${colors.reset}`);
  console.log("");

  const showDiff = await confirm({
    message: "Show full diff?",
    default: false,
  });

  if (showDiff) {
    console.log("");
    console.log(`${colors.cyan}━━━ Diff (${colors.red}- yours${colors.reset} ${colors.green}+ dotfiles${colors.reset}${colors.cyan}) ━━━${colors.reset}`);
    console.log(generateDiff(userContent, dotfilesContent));
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log("");
  }

  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Keep my version", value: "keep" as const },
      { name: "Replace with dotfiles version (backup yours first)", value: "replace" as const },
      { name: "Append dotfiles to mine (marked section)", value: "append" as const },
    ],
  });

  if (action === "keep") {
    log.info("Keeping your version");
    return;
  }

  if (action === "replace") {
    const backupPath = backupFile(config.userPath);
    addToManifest({ original: config.userPath, backup: backupPath, type: "file" });
    copyFileSync(config.dotfilesPath, config.userPath);
    log.success(`Replaced with dotfiles version (yours backed up)`);
    return;
  }

  if (action === "append") {
    const backupPath = backupFile(config.userPath);
    addToManifest({ original: config.userPath, backup: backupPath, type: "file" });

    let content = userContent;
    if (!content.endsWith("\n")) content += "\n";
    content += `\n${DOTFILES_MARKER_START}\n`;
    content += dotfilesContent;
    content += `\n${DOTFILES_MARKER_END}\n`;
    writeFileSync(config.userPath, content);

    log.success(`Appended dotfiles content (yours backed up)`);
    log.info(`Look for the "${DOTFILES_MARKER_START}" section in your config`);
  }
}
