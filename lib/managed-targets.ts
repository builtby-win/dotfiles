import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AI_CONFIGS } from "./catalog";
import { colors, log, DOTFILES_DIR, HOME, DOTFILES_CONFIG_DIR, DOTFILES_PATH_FILE, DOTFILES_LOCAL_SHELL_FILE } from "./context";

export function writeDotfilesPath(): void {
  if (!existsSync(DOTFILES_CONFIG_DIR)) {
    mkdirSync(DOTFILES_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(DOTFILES_PATH_FILE, DOTFILES_DIR);
  log.success(`Saved dotfiles path to ${DOTFILES_PATH_FILE}`);
}

// Map managed config names to their target files for migration/backups.
export const CHEZMOI_TARGETS: Record<string, string[]> = {
  zsh: [".config/starship.toml"],
  tmux: [
    ".config/tmux",
    ".local/bin/b2v",
    ".local/bin/coolify",
    ".local/bin/sesh",
    ".local/bin/tmux-smart",
  ],
  nvim: [".config/nvim"],
  hammerspoon: [".hammerspoon"],
  omarchy: [".config/omarchy/shell.json", ".config/omarchy/plugins/builtby.leader"],
  karabiner: [
    ".config/karabiner/karabiner.json",
    ".config/neru/config.toml",
    ".local/bin/karabiner-layer",
  ],
  omp: [
    ".omp/agent/config.yml",
    ".omp/agent/settings.json",
    ".omp/agent/mcp.json",
    ".omp/agent/RULES.md",
    ".omp/agent/agents/reviewer.md",
    ".omp/agent/agents/scout.md",
    ".omp/agent/agents/security-reviewer.md",
    ".omp/agent/agents/sonic.md",
    ".omp/agent/agents/task.md",
    ".omp/agent/extensions/agy-exec.ts",
    ".omp/agent/extensions/herdr-children.ts",
    ".omp/agent/extensions/herdr-omp-agent-state.ts",
  ],
  ghostty: process.platform === "darwin"
    ? [
        ".config/ghostty/config",
        "Library/Application Support/com.mitchellh.ghostty/config",
      ]
    : [".config/ghostty/config"],
};

export function formatHomePath(path: string): string {
  return path.startsWith(HOME) ? path.replace(HOME, "~") : path;
}

export function selectedManagedTargetPaths(configs: string[]): string[] {
  const paths = new Set<string>();

  if (configs.length > 0) {
    paths.add(DOTFILES_PATH_FILE);
  }

  if (configs.includes("zsh")) {
    paths.add(join(HOME, ".zshrc"));
    paths.add(DOTFILES_LOCAL_SHELL_FILE);
  }

  if (configs.includes("tmux")) {
    paths.add(join(HOME, ".tmux.conf"));
    paths.add(join(HOME, ".tmux", "plugins", "tpm"));
  }

  if (configs.includes("iterm2")) {
    paths.add(join(HOME, "Library/Preferences/com.googlecode.iterm2.plist"));
  }

  for (const config of configs) {
    for (const target of CHEZMOI_TARGETS[config] ?? []) {
      paths.add(join(HOME, target));
    }
  }

  return [...paths].sort();
}

export function selectedChezmoiApplyTargets(configs: string[]): string[] {
  const paths = new Set<string>();

  if (configs.includes("zsh")) {
    paths.add(join(HOME, ".zshrc"));
    paths.add(join(HOME, ".config/dotfiles/path"));
    paths.add(join(HOME, ".config/starship.toml"));
  }

  for (const config of configs) {
    for (const target of CHEZMOI_TARGETS[config] ?? []) {
      paths.add(join(HOME, target));
    }
  }

  return [...paths].sort();
}

export function selectedAIConfigPaths(configs: string[]): string[] {
  const paths = new Set<string>();

  for (const config of configs) {
    const configInfo = AI_CONFIGS[config];
    if (!configInfo) continue;

    const targetDir = join(HOME, configInfo.targetDir ?? `.${config}`);
    for (const template of configInfo.templates) {
      paths.add(join(targetDir, template));
    }

    if (configInfo.skill) {
      paths.add(join(HOME, configInfo.skill.targetDir, configInfo.skill.template));
    }
  }

  return [...paths].sort();
}

export function printPathList(paths: string[], emptyMessage: string): void {
  if (paths.length === 0) {
    console.log(`    ${colors.dim}${emptyMessage}${colors.reset}`);
    return;
  }

  for (const path of paths) {
    console.log(`    ${colors.dim}${formatHomePath(path)}${colors.reset}`);
  }
}
