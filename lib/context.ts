import { join, dirname } from "path";
import { homedir } from "os";
import { getBuiltbyBackupDir } from "./backup-policy";

// Colors
export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export const log = {
  step: (msg: string) => console.log(`${colors.blue}==>${colors.reset} ${colors.bold}${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`  ${colors.dim}${msg}${colors.reset}`),
};

// Get dotfiles directory from script location (where user cloned it)
export const DOTFILES_DIR = dirname(dirname(new URL(import.meta.url).pathname));

export const HOME = homedir();

export const MANIFEST_PATH = join(DOTFILES_DIR, ".backup-manifest.json");

export const DOTFILES_BACKUP_DIR = getBuiltbyBackupDir(HOME);

export const DOTFILES_CONFIG_DIR = join(HOME, ".config", "dotfiles");

export const DOTFILES_PATH_FILE = join(DOTFILES_CONFIG_DIR, "path");

export const DOTFILES_LOCAL_SHELL_FILE = join(DOTFILES_CONFIG_DIR, "local.sh");

export const TMUX_BOOTSTRAP_BASIC_SOURCE = join(DOTFILES_DIR, "chezmoi", "dot_config", "tmux", "builtby", "bootstrap.basic.conf");

export const TMUX_BASIC_CONF_SOURCE = join(DOTFILES_DIR, "chezmoi", "dot_config", "tmux", "builtby", "basic.conf");

export const ZSHRC_MARKER_START = "# === Added from builtby.win/dotfiles (zsh) ===";

export const ZSHRC_MARKER_END = "# === End builtby.win/dotfiles (zsh) ===";
