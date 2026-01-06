#!/usr/bin/env npx tsx
import { checkbox, select, confirm } from "@inquirer/prompts";
import { execSync } from "child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, renameSync, lstatSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// Colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  step: (msg: string) => console.log(`${colors.blue}==>${colors.reset} ${colors.bold}${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`  ${colors.dim}${msg}${colors.reset}`),
};

// Get dotfiles directory from script location (where user cloned it)
const DOTFILES_DIR = dirname(new URL(import.meta.url).pathname);
const HOME = homedir();
const MANIFEST_PATH = join(DOTFILES_DIR, ".backup-manifest.json");
const DOTFILES_CONFIG_DIR = join(HOME, ".config", "dotfiles");
const DOTFILES_PATH_FILE = join(DOTFILES_CONFIG_DIR, "path");

// Backup manifest to track all backups
interface BackupEntry {
  original: string;
  backup: string;
  type: "file" | "stow";
  stowPackage?: string;
  timestamp: number;
}

interface BackupManifest {
  version: 1;
  entries: BackupEntry[];
}

function loadManifest(): BackupManifest {
  if (existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    } catch {
      return { version: 1, entries: [] };
    }
  }
  return { version: 1, entries: [] };
}

function saveManifest(manifest: BackupManifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function addToManifest(entry: Omit<BackupEntry, "timestamp">): void {
  const manifest = loadManifest();
  manifest.entries.push({ ...entry, timestamp: Date.now() });
  saveManifest(manifest);
}

// App definitions with their associated configs
interface App {
  name: string;
  value: string;
  brewName: string;
  cask?: boolean;
  configs?: string[];
  checked?: boolean;
  dependencies?: string[]; // Other brew packages to install alongside
  detectCmd?: string;      // Custom command to check if installed (e.g., "command -v claude")
  detectPath?: string;     // Custom path to check if exists (e.g., "/Applications/App.app")
  desc?: string;           // Short description for info display
  url?: string;            // Project URL
}

const APPS: App[] = [
  // Terminals & Editors
  { name: "Ghostty (terminal)", value: "ghostty", brewName: "ghostty", cask: true, checked: true, detectPath: "/Applications/Ghostty.app", desc: "GPU-accelerated terminal by Mitchell Hashimoto", url: "https://ghostty.org" },
  { name: "Visual Studio Code", value: "vscode", brewName: "visual-studio-code", cask: true, checked: true, detectPath: "/Applications/Visual Studio Code.app", desc: "Popular code editor by Microsoft", url: "https://code.visualstudio.com" },
  { name: "Cursor (AI editor)", value: "cursor", brewName: "cursor", cask: true, configs: ["cursor"], checked: false, detectPath: "/Applications/Cursor.app", desc: "AI-first code editor (VS Code fork)", url: "https://cursor.sh" },

  // AI Tools
  { name: "Claude Code (CLI)", value: "claude", brewName: "claude", configs: ["claude"], checked: false, detectCmd: "command -v claude", desc: "Anthropic's AI coding assistant for terminal", url: "https://docs.anthropic.com/en/docs/claude-code" },
  { name: "Codex CLI", value: "codex", brewName: "", configs: ["codex"], checked: false, detectCmd: "command -v codex", desc: "OpenAI's coding assistant CLI", url: "https://github.com/openai/codex" },

  // Productivity
  { name: "Raycast", value: "raycast", brewName: "raycast", cask: true, checked: true, detectPath: "/Applications/Raycast.app", desc: "Spotlight replacement with extensions", url: "https://raycast.com" },
  { name: "Velja", value: "velja", brewName: "velja", cask: true, detectPath: "/Applications/Velja.app", desc: "Browser picker - choose which browser opens links", url: "https://sindresorhus.com/velja" },
  { name: "AltTab", value: "alttab", brewName: "alt-tab", cask: true, detectPath: "/Applications/AltTab.app", desc: "Windows-style alt-tab window switcher", url: "https://alt-tab-macos.netlify.app" },
  { name: "Ice", value: "ice", brewName: "jordanbaird-ice", cask: true, detectPath: "/Applications/Ice.app", desc: "Menu bar management - hide icons", url: "https://github.com/jordanbaird/Ice" },
  { name: "BetterTouchTool", value: "bettertouchtool", brewName: "bettertouchtool", cask: true, detectPath: "/Applications/BetterTouchTool.app", desc: "Customize trackpad, keyboard, and Touch Bar", url: "https://folivora.ai" },

  // Input
  { name: "Karabiner Elements", value: "karabiner-elements", brewName: "karabiner-elements", cask: true, detectPath: "/Applications/Karabiner-Elements.app", desc: "Powerful keyboard customization", url: "https://karabiner-elements.pqrs.org" },
  { name: "LinearMouse", value: "linearmouse", brewName: "linearmouse", cask: true, detectPath: "/Applications/LinearMouse.app", desc: "Mouse and trackpad customization", url: "https://linearmouse.app" },

  // Security
  { name: "Bitwarden", value: "bitwarden", brewName: "bitwarden", cask: true, detectPath: "/Applications/Bitwarden.app", desc: "Open source password manager", url: "https://bitwarden.com" },

  // Browsers
  { name: "Google Chrome", value: "chrome", brewName: "google-chrome", cask: true, detectPath: "/Applications/Google Chrome.app", desc: "Google's web browser" },
  { name: "Arc", value: "arc", brewName: "arc", cask: true, detectPath: "/Applications/Arc.app", desc: "Modern browser with spaces & profiles", url: "https://arc.net" },
  { name: "Orion", value: "orion", brewName: "orion", cask: true, detectPath: "/Applications/Orion.app", desc: "WebKit browser with Chrome/Firefox extension support", url: "https://browser.kagi.com" },

  // Dev Tools
  { name: "Docker", value: "docker", brewName: "docker", cask: true, detectPath: "/Applications/Docker.app", desc: "Container runtime for development", url: "https://docker.com" },
  { name: "Figma", value: "figma", brewName: "figma", cask: true, detectPath: "/Applications/Figma.app", desc: "Collaborative design tool", url: "https://figma.com" },
  { name: "Discord", value: "discord", brewName: "discord", cask: true, detectPath: "/Applications/Discord.app", desc: "Chat for communities", url: "https://discord.com" },

  // CLI Tools
  { name: "tmux", value: "tmux", brewName: "tmux", checked: true, dependencies: ["sesh", "fzf"], desc: "Terminal multiplexer - split panes, sessions", url: "https://github.com/tmux/tmux" },
  { name: "fzf", value: "fzf", brewName: "fzf", desc: "Fuzzy finder for files, history, and more", url: "https://github.com/junegunn/fzf" },
  { name: "ripgrep", value: "ripgrep", brewName: "ripgrep", desc: "Blazing fast grep replacement", url: "https://github.com/BurntSushi/ripgrep" },
  { name: "bat", value: "bat", brewName: "bat", desc: "cat with syntax highlighting", url: "https://github.com/sharkdp/bat" },
  { name: "eza", value: "eza", brewName: "eza", desc: "Modern ls with colors and icons", url: "https://github.com/eza-community/eza" },
  { name: "zoxide", value: "zoxide", brewName: "zoxide", desc: "Smarter cd that learns your habits", url: "https://github.com/ajeetdsouza/zoxide" },
  { name: "starship", value: "starship", brewName: "starship", checked: true, desc: "Fast, customizable shell prompt", url: "https://starship.rs" },
];

// Stow-managed configs
const STOW_CONFIGS = [
  { name: "Shell config (zinit, starship, aliases)", value: "zsh", checked: true },
  { name: "Tmux (vim-style bindings, mouse support)", value: "tmux", checked: true },
  { name: "Karabiner Elements (key remapping)", value: "karabiner", checked: true },
  { name: "Ghostty (terminal config)", value: "ghostty", checked: true },
  { name: "Mackup (app settings backup to iCloud)", value: "mackup", checked: true },
];

// AI tool configs (template-based)
const AI_CONFIGS: Record<string, { name: string; templates: string[] }> = {
  claude: {
    name: "Claude Code",
    templates: ["CLAUDE.md", "settings.json"],
  },
  codex: {
    name: "Codex CLI",
    templates: ["config.toml", "hooks.json"],
  },
  cursor: {
    name: "Cursor",
    templates: ["hooks.json"],
  },
};

async function handleFileConflict(targetPath: string): Promise<"backup" | "skip" | "overwrite"> {
  if (!existsSync(targetPath)) return "overwrite";

  log.warning(`${targetPath} already exists`);
  const choice = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Backup & replace", value: "backup" as const },
      { name: "Skip", value: "skip" as const },
      { name: "Overwrite", value: "overwrite" as const },
    ],
  });

  return choice;
}

function backupFile(filePath: string): string {
  const backupPath = `${filePath}.dotfiles-backup.${Date.now()}`;
  copyFileSync(filePath, backupPath);
  log.info(`Backed up to ${backupPath}`);
  return backupPath;
}

function runCommand(cmd: string, silent = false): boolean {
  try {
    execSync(cmd, { stdio: silent ? "pipe" : "inherit" });
    return true;
  } catch {
    return false;
  }
}

// Cache for installed brew packages (populated once, used many times)
let installedFormulasCache: Set<string> | null = null;
let installedCasksCache: Set<string> | null = null;

function getInstalledFormulas(): Set<string> {
  if (installedFormulasCache) return installedFormulasCache;
  try {
    const output = execSync("brew list --formula 2>/dev/null", { encoding: "utf-8" });
    installedFormulasCache = new Set(output.trim().split("\n").filter(Boolean));
  } catch {
    installedFormulasCache = new Set();
  }
  return installedFormulasCache;
}

function getInstalledCasks(): Set<string> {
  if (installedCasksCache) return installedCasksCache;
  try {
    const output = execSync("brew list --cask 2>/dev/null", { encoding: "utf-8" });
    installedCasksCache = new Set(output.trim().split("\n").filter(Boolean));
  } catch {
    installedCasksCache = new Set();
  }
  return installedCasksCache;
}

type AppInstallState = "installed" | "partial" | "not_installed";

function getAppInstallState(app: App): AppInstallState {
  // Check the main app first
  let mainAppInstalled = false;

  // Priority 1: Custom path check (fastest - no shell execution)
  if (app.detectPath) {
    mainAppInstalled = existsSync(app.detectPath);
  }
  // Priority 2: Custom command check
  else if (app.detectCmd) {
    mainAppInstalled = runCommand(app.detectCmd, true);
  }
  // Priority 3: Brew check (using cached results)
  else if (app.brewName) {
    mainAppInstalled = app.cask
      ? getInstalledCasks().has(app.brewName)
      : getInstalledFormulas().has(app.brewName);
  }

  if (!mainAppInstalled) return "not_installed";

  // Check dependencies are also installed
  if (app.dependencies) {
    const formulas = getInstalledFormulas();
    for (const dep of app.dependencies) {
      if (!formulas.has(dep)) {
        return "partial"; // Main app installed, but missing dependencies
      }
    }
  }

  return "installed";
}

function isAppInstalled(app: App): boolean {
  return getAppInstallState(app) === "installed";
}

function isStowConfigInstalled(config: string): boolean {
  const targets = STOW_TARGETS[config];
  if (!targets) return false;

  return targets.every((target) => {
    const targetPath = join(HOME, target);
    if (!existsSync(targetPath)) return false;

    try {
      const stats = lstatSync(targetPath);
      if (stats.isSymbolicLink()) {
        const content = readFileSync(targetPath, "utf-8");
        return content.includes("builtby.win/dotfiles") || content.includes("stow-packages");
      }
    } catch {
      // Not our symlink
    }
    return false;
  });
}

function installBrewPackage(name: string, cask = false): boolean {
  const checkCmd = cask
    ? `brew list --cask ${name} 2>/dev/null`
    : `brew list ${name} 2>/dev/null`;

  if (runCommand(checkCmd, true)) {
    log.success(`${name} already installed`);
    return true;
  }

  log.info(`Installing ${name}...`);
  const cmd = cask ? `brew install --cask ${name}` : `brew install ${name}`;
  if (runCommand(cmd, true)) {
    log.success(`${name} installed`);
    return true;
  } else {
    log.warning(`Failed to install ${name}`);
    return false;
  }
}

async function installApps(apps: string[]): Promise<void> {
  if (apps.length === 0) return;

  const appsToInstall = APPS.filter((a) => apps.includes(a.value) && a.brewName);
  if (appsToInstall.length === 0) return;

  log.step("Installing apps via Homebrew...");

  for (const app of appsToInstall) {
    installBrewPackage(app.brewName, app.cask);

    // Install dependencies
    if (app.dependencies) {
      for (const dep of app.dependencies) {
        installBrewPackage(dep);
      }
    }
  }

  if (apps.includes("codex")) {
    log.info("Installing Codex CLI...");
    if (runCommand("npm install -g @openai/codex", true)) {
      log.success("Codex CLI installed");
    } else {
      log.warning("Failed to install Codex CLI");
    }
  }
}

function ensureStowInstalled(): boolean {
  if (runCommand("command -v stow", true)) {
    return true;
  }
  log.info("Installing stow via Homebrew...");
  if (runCommand("brew install stow", true)) {
    log.success("stow installed");
    return true;
  }
  log.error("Failed to install stow");
  return false;
}

function writeDotfilesPath(): void {
  if (!existsSync(DOTFILES_CONFIG_DIR)) {
    mkdirSync(DOTFILES_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(DOTFILES_PATH_FILE, DOTFILES_DIR);
  log.success(`Saved dotfiles path to ${DOTFILES_PATH_FILE}`);
}

// Map stow package names to their target files (for conflict detection)
const STOW_TARGETS: Record<string, string[]> = {
  zsh: [".zshrc", ".config/starship.toml"],
  tmux: [".tmux.conf"],
  karabiner: [".config/karabiner/karabiner.json"],
  ghostty: [".config/ghostty/config"],
  mackup: [".mackup.cfg"],
};

async function setupStowConfigs(configs: string[]): Promise<void> {
  if (configs.length === 0) return;

  log.step("Setting up stow configs...");

  // Write dotfiles path so .zshrc can find it
  writeDotfilesPath();

  // Ensure stow is installed
  if (!ensureStowInstalled()) {
    log.error("Cannot proceed without stow");
    return;
  }

  const stowPackages = join(DOTFILES_DIR, "stow-packages");

  for (const config of configs) {
    const targets = STOW_TARGETS[config];
    if (!targets) {
      log.warning(`Unknown stow package: ${config}`);
      continue;
    }

    // Check if the stow package exists
    const packagePath = join(stowPackages, config);
    if (!existsSync(packagePath)) {
      log.warning(`Stow package not found: ${config}`);
      continue;
    }

    let needsStow = false;

    for (const target of targets) {
      const targetPath = join(HOME, target);

      if (existsSync(targetPath)) {
        const stats = lstatSync(targetPath);

        // Check if it's already our symlink
        if (stats.isSymbolicLink()) {
          try {
            const content = readFileSync(targetPath, "utf-8");
            if (content.includes("builtby.win/dotfiles") || content.includes(DOTFILES_DIR)) {
              log.success(`${config} already configured via stow`);
              continue;
            }
          } catch {
            // If we can't read it, it might be a broken symlink
          }
        }

        // Ask user what to do with existing file
        log.warning(`~/${target} already exists`);
        const choice = await select({
          message: `What should we do with your existing ${target}?`,
          choices: [
            { name: "Backup & replace with stow symlink (recommended)", value: "backup" as const },
            { name: "Skip", value: "skip" as const },
          ],
        });

        if (choice === "skip") {
          log.info(`Skipping ${config}`);
          continue;
        }

        // Backup existing file
        const backupPath = backupFile(targetPath);
        addToManifest({ original: targetPath, backup: backupPath, type: "stow", stowPackage: config });
        unlinkSync(targetPath);
        needsStow = true;
      } else {
        // Ensure parent directory exists
        const parentDir = dirname(targetPath);
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }
        needsStow = true;
      }
    }

    if (needsStow || !targets.some(t => existsSync(join(HOME, t)))) {
      // Run stow to create the symlinks
      const stowCmd = `stow -d "${stowPackages}" -t "${HOME}" ${config}`;
      if (runCommand(stowCmd, true)) {
        log.success(`${config} configured via stow`);

        // Install TPM for tmux
        if (config === "tmux") {
          setupTpm();
        }
      } else {
        log.error(`Failed to stow ${config}`);
      }
    }
  }
}

function setupTpm(): void {
  const tpmPath = join(HOME, ".tmux", "plugins", "tpm");

  if (existsSync(tpmPath)) {
    log.success("TPM already installed");
    return;
  }

  log.info("Installing TPM (Tmux Plugin Manager)...");
  const tpmDir = join(HOME, ".tmux", "plugins");
  if (!existsSync(tpmDir)) {
    mkdirSync(tpmDir, { recursive: true });
  }

  if (runCommand(`git clone https://github.com/tmux-plugins/tpm "${tpmPath}"`, true)) {
    log.success("TPM installed");
    log.info("To install plugins: open tmux and press Ctrl+a I");
  } else {
    log.warning("Failed to install TPM - you can install manually later");
  }
}

async function setupAIConfigs(configs: string[]): Promise<void> {
  if (configs.length === 0) return;

  log.step("Setting up AI tool configs...");

  for (const config of configs) {
    const configInfo = AI_CONFIGS[config];
    if (!configInfo) continue;

    const templateDir = join(DOTFILES_DIR, "templates", config);
    if (!existsSync(templateDir)) {
      log.warning(`Templates for ${configInfo.name} not found, skipping`);
      continue;
    }

    const targetDir = join(HOME, `.${config}`);

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    for (const template of configInfo.templates) {
      const sourcePath = join(templateDir, template);
      const targetPath = join(targetDir, template);

      if (!existsSync(sourcePath)) {
        continue;
      }

      const choice = await handleFileConflict(targetPath);
      if (choice === "skip") {
        log.info(`Skipping ${template}`);
        continue;
      } else if (choice === "backup" && existsSync(targetPath)) {
        const backupPath = backupFile(targetPath);
        addToManifest({ original: targetPath, backup: backupPath, type: "file" });
      }

      copyFileSync(sourcePath, targetPath);
      log.success(`${configInfo.name}: ${template} installed`);
    }
  }
}

async function revertBackups(): Promise<void> {
  const manifest = loadManifest();

  if (manifest.entries.length === 0) {
    log.warning("No backups found to revert");
    return;
  }

  console.log("");
  log.step("Available backups to revert:");
  console.log("");

  // Group by original file
  const grouped = new Map<string, BackupEntry[]>();
  for (const entry of manifest.entries) {
    const existing = grouped.get(entry.original) || [];
    existing.push(entry);
    grouped.set(entry.original, existing);
  }

  // Show each original file with its backups
  const choices: { name: string; value: BackupEntry }[] = [];
  for (const [original, backups] of grouped) {
    // Sort by timestamp descending (most recent first)
    backups.sort((a, b) => b.timestamp - a.timestamp);
    const mostRecent = backups[0];
    const date = new Date(mostRecent.timestamp).toLocaleString();
    choices.push({
      name: `${original} (backup from ${date})`,
      value: mostRecent,
    });
  }

  const toRevert = await checkbox({
    message: "Select backups to restore:",
    choices,
  });

  if (toRevert.length === 0) {
    log.info("No backups selected");
    return;
  }

  const confirmed = await confirm({
    message: `Restore ${toRevert.length} backup(s)? This will overwrite current files.`,
    default: false,
  });

  if (!confirmed) {
    log.info("Cancelled");
    return;
  }

  console.log("");
  log.step("Reverting...");

  for (const entry of toRevert) {
    try {
      // For stow entries, first unstow
      if (entry.type === "stow" && entry.stowPackage) {
        const unstowCmd = `stow -d "${join(DOTFILES_DIR, "stow-packages")}" -t "${HOME}" -D ${entry.stowPackage}`;
        runCommand(unstowCmd, true);
      }

      // Check if backup still exists
      if (!existsSync(entry.backup)) {
        log.error(`Backup file not found: ${entry.backup}`);
        continue;
      }

      // Restore the backup
      if (existsSync(entry.original)) {
        unlinkSync(entry.original);
      }
      renameSync(entry.backup, entry.original);
      log.success(`Restored ${entry.original}`);

      // Remove from manifest
      manifest.entries = manifest.entries.filter(
        (e) => !(e.original === entry.original && e.backup === entry.backup)
      );
    } catch (err) {
      log.error(`Failed to restore ${entry.original}: ${err}`);
    }
  }

  saveManifest(manifest);
  console.log("");
  log.success("Revert complete!");
}

function printAdBanner(): void {
  console.log("");
  console.log(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  Speed up your workflow even more:${colors.reset}`);
  console.log("");
  console.log(`  ${colors.yellow}→${colors.reset} back2vibing - Focus & productivity for devs`);
  console.log(`    ${colors.dim}https://back2vibing.com${colors.reset}`);
  console.log("");
  console.log(`  ${colors.yellow}→${colors.reset} builtby.win/web - Next.js + tRPC + Prisma starter`);
  console.log(`    ${colors.dim}https://builtby.win/web${colors.reset}`);
  console.log("");
  console.log(`  ${colors.yellow}→${colors.reset} builtby.win/desktop - Electron + React starter`);
  console.log(`    ${colors.dim}https://builtby.win/desktop${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  console.log("");
}

async function mainMenu(): Promise<void> {
  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Setup dotfiles", value: "setup" as const },
      { name: "Revert to backups", value: "revert" as const },
      { name: "Exit", value: "exit" as const },
    ],
  });

  return action === "setup" ? runSetup() : action === "revert" ? revertBackups() : process.exit(0);
}

async function runSetup(): Promise<void> {
  // Check what's already installed
  log.step("Checking installed apps...");
  const appStates = new Map<string, AppInstallState>();
  const installedConfigs = new Set<string>();

  for (const app of APPS) {
    appStates.set(app.value, getAppInstallState(app));
  }

  for (const config of STOW_CONFIGS) {
    if (isStowConfigInstalled(config.value)) {
      installedConfigs.add(config.value);
    }
  }

  const installedCount = [...appStates.values()].filter(s => s === "installed").length + installedConfigs.size;
  const partialCount = [...appStates.values()].filter(s => s === "partial").length;
  if (installedCount > 0) {
    log.success(`Found ${installedCount} already installed`);
  }
  if (partialCount > 0) {
    log.warning(`Found ${partialCount} with missing extras`);
  }
  console.log("");

  // Ask if user wants to see what each tool does
  const showInfo = await confirm({
    message: "Want to see what each tool does first?",
    default: false,
  });

  if (showInfo) {
    console.log("");
    console.log(`${colors.cyan}${colors.bold}=== CLI Tools ===${colors.reset}`);
    for (const app of APPS.filter(a => !a.cask)) {
      const urlPart = app.url ? ` ${colors.dim}${app.url}${colors.reset}` : "";
      console.log(`  ${colors.bold}${app.name}${colors.reset} - ${app.desc || ""}${urlPart}`);
    }
    console.log("");
    console.log(`${colors.cyan}${colors.bold}=== Apps ===${colors.reset}`);
    for (const app of APPS.filter(a => a.cask)) {
      const urlPart = app.url ? ` ${colors.dim}${app.url}${colors.reset}` : "";
      console.log(`  ${colors.bold}${app.name}${colors.reset} - ${app.desc || ""}${urlPart}`);
    }
    console.log("");
  }

  // Step 1: Select apps to install
  log.step("[1/3] Select apps to install");
  const selectedApps = await checkbox({
    message: "Select apps (space to toggle, enter to confirm):",
    choices: APPS.map((app) => {
      const state = appStates.get(app.value) ?? "not_installed";
      const descPart = app.desc ? ` ${colors.dim}- ${app.desc}${colors.reset}` : "";
      if (state === "installed") {
        return {
          name: `${app.name}${descPart} ${colors.green}(installed)${colors.reset}`,
          value: app.value,
          checked: true,
          disabled: "(already installed)",
        };
      } else if (state === "partial") {
        return {
          name: `${app.name}${descPart} ${colors.green}(installed)${colors.reset} ${colors.yellow}(missing extras)${colors.reset}`,
          value: app.value,
          checked: true,
          disabled: false,
        };
      } else {
        return {
          name: `${app.name}${descPart}`,
          value: app.value,
          checked: app.checked ?? false,
          disabled: false,
        };
      }
    }),
    pageSize: 20,
  });

  console.log("");

  // Step 2: Select stow-managed configs
  log.step("[2/3] Select configs to stow");
  const selectedStowConfigs = await checkbox({
    message: "Select configs to install (managed via stow):",
    choices: STOW_CONFIGS.map((config) => {
      const installed = installedConfigs.has(config.value);
      return {
        name: installed ? `${config.name} ${colors.green}(installed)${colors.reset}` : config.name,
        value: config.value,
        checked: installed ? true : (config.checked ?? false),
        disabled: installed ? "(already installed)" : false,
      };
    }),
  });

  // Auto-select AI configs based on app selection
  const autoSelectedAIConfigs = selectedApps
    .filter((app) => {
      const appDef = APPS.find((a) => a.value === app);
      return appDef?.configs && appDef.configs.length > 0;
    })
    .flatMap((app) => APPS.find((a) => a.value === app)?.configs ?? []);

  const aiConfigs = [...new Set(autoSelectedAIConfigs)];

  if (aiConfigs.length > 0) {
    log.info(`Auto-selecting configs for: ${aiConfigs.map((c) => AI_CONFIGS[c]?.name).join(", ")}`);
  }

  console.log("");

  const proceed = await confirm({
    message: "Ready to install?",
    default: true,
  });

  if (!proceed) {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("");

  // Step 3: Install everything
  log.step("[3/3] Installing...");
  console.log("");

  // Filter: include apps that are not_installed OR partial (need deps)
  const appsToInstall = selectedApps.filter((app) => {
    const state = appStates.get(app);
    return state === "not_installed" || state === "partial";
  });
  const configsToInstall = selectedStowConfigs.filter((config) => !installedConfigs.has(config));

  if (appsToInstall.length === 0 && configsToInstall.length === 0 && aiConfigs.length === 0) {
    log.success("Everything is already installed!");
  } else {
    await installApps(appsToInstall);
    console.log("");

    await setupStowConfigs(configsToInstall);
    console.log("");

    await setupAIConfigs(aiConfigs);
  }

  // Done!
  console.log("");
  console.log(`${colors.green}${colors.bold}✅ Your dotfiles are set up!${colors.reset}`);
  console.log("");
  console.log(`  To update: ${colors.cyan}cd ${DOTFILES_DIR} && git pull && ./bootstrap.sh${colors.reset}`);
  console.log(`  To revert: ${colors.cyan}cd ${DOTFILES_DIR} && pnpm run setup${colors.reset} → select "Revert"`);

  printAdBanner();
}

async function main(): Promise<void> {
  try {
    console.log("");
    await mainMenu();
  } catch (error) {
    if ((error as Error).name === "ExitPromptError") {
      console.log("\nAborted.");
      process.exit(0);
    }
    throw error;
  }
}

main().catch(console.error);
