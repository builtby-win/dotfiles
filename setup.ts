#!/usr/bin/env npx tsx
import { checkbox, select, confirm } from "@inquirer/prompts";
import { execSync } from "child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, renameSync, lstatSync, readlinkSync, readdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { homedir, platform } from "os";
import * as manifest from "./lib/manifest";
import { createLinuxPackageManager, type SystemCommands } from "./lib/linux";
import { backupExistingPath, getBuiltbyBackupDir, getSafeBackupName } from "./lib/backup-policy";
import {
  appendSectionsToFile,
  DOTFILES_MARKER_END,
  DOTFILES_MARKER_START,
  findConflictingSections,
  findNewSections,
  generateDiff,
  parseShellFile,
  type ParsedSection,
} from "./lib/shell-merge";
import {
  generateTmuxEntrypoint,
  hasBuiltbyTmuxBootstrap,
  normalizeTmuxEntrypoint,
  TMUX_MERGE_MARKER_START,
  upsertTmuxMergeBlock,
} from "./lib/tmux-config";

// ============================================
// Auto-Detection for Existing Users
// ============================================

interface DetectedSetup {
  apps: string[];
  configs: string[];
  features: Record<string, boolean>;
}

/**
 * Detect what apps/configs/features the user already has installed.
 * Used for first-run migration when no setup manifest exists.
 */
function autoDetectExistingSetup(): DetectedSetup {
  const detected: DetectedSetup = {
    apps: [],
    configs: [],
    features: {},
  };

  // Detect installed apps using existing getAppInstallState
  for (const app of APPS) {
    const state = getAppInstallState(app);
    if (state === "installed" || state === "partial") {
      detected.apps.push(app.value);
    }
  }

  // Detect installed managed configs using existing isManagedConfigApplied
  for (const config of MANAGED_CONFIGS) {
    if (isManagedConfigApplied(config.value)) {
      detected.configs.push(config.value);
    }
  }

  return detected;
}

/**
 * Check if setup manifest already exists.
 */
function manifestExists(): boolean {
  const manifestPath = manifest.getManifestPath();
  return existsSync(manifestPath);
}

type SetupPathChoice = "focus" | "standard" | "minimal" | "customize" | "ai_agent";

function getBootstrapSetupPath(argv: string[]): SetupPathChoice | null {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] !== "--setup-path") continue;

    const value = argv[index + 1];
    if (value === "focus" || value === "standard" || value === "minimal" || value === "customize" || value === "ai_agent") {
      return value;
    }

    return null;
  }

  return null;
}

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
const DOTFILES_BACKUP_DIR = getBuiltbyBackupDir(HOME);
const DOTFILES_CONFIG_DIR = join(HOME, ".config", "dotfiles");
const DOTFILES_PATH_FILE = join(DOTFILES_CONFIG_DIR, "path");
const DOTFILES_LOCAL_SHELL_FILE = join(DOTFILES_CONFIG_DIR, "local.sh");
const TMUX_BOOTSTRAP_BASIC_SOURCE = join(DOTFILES_DIR, "chezmoi", "dot_config", "tmux", "builtby", "bootstrap.basic.conf");
const TMUX_BASIC_CONF_SOURCE = join(DOTFILES_DIR, "chezmoi", "dot_config", "tmux", "builtby", "basic.conf");
const ZSHRC_MARKER_START = "# === Added from builtby.win/dotfiles (zsh) ===";
const ZSHRC_MARKER_END = "# === End builtby.win/dotfiles (zsh) ===";

// Backup manifest to track all backups
interface BackupEntry {
  original: string;
  backup: string;
  type: "file" | "chezmoi";
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

function pruneBackupFiles(prefix: string, keep = 1): void {
  if (!existsSync(DOTFILES_BACKUP_DIR)) {
    return;
  }

  const backups = readdirSync(DOTFILES_BACKUP_DIR)
    .filter((name) => name.startsWith(prefix))
    .sort((a, b) => b.localeCompare(a));

  if (backups.length <= keep) {
    return;
  }

  const staleBackups = new Set(backups.slice(keep));
  const manifest = loadManifest();

  for (const backupName of staleBackups) {
    rmSync(join(DOTFILES_BACKUP_DIR, backupName), { force: true });
  }

  manifest.entries = manifest.entries.filter((entry) => !staleBackups.has(entry.backup.split("/").pop() ?? ""));
  saveManifest(manifest);
}

// Platform detection
type Platform = "macos" | "windows" | "linux";
interface PlatformSupport {
  macos?: boolean;
  windows?: boolean;
  linux?: boolean;
}

function getCurrentPlatform(): Platform {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "linux";
}

function isPlatformSupported(platforms: PlatformSupport | undefined, currentPlatform: Platform): boolean {
  // If no platforms specified, default to showing (backward compatibility)
  if (!platforms) return true;
  // Show if current platform is not explicitly set to false
  return platforms[currentPlatform] !== false;
}

// App categories for organized display
type AppCategory = "cli" | "terminals" | "ai" | "productivity" | "input" | "security" | "browsers" | "devtools";

const CATEGORY_ORDER: AppCategory[] = ["cli", "terminals", "ai", "productivity", "input", "security", "browsers", "devtools"];

const CATEGORY_LABELS: Record<AppCategory, string> = {
  cli: "CLI Tools",
  terminals: "Terminals & Editors",
  ai: "AI Tools",
  productivity: "Productivity",
  input: "Input",
  security: "Security",
  browsers: "Browsers",
  devtools: "Dev Tools",
};

// App definitions with their associated configs
interface App {
  name: string;
  value: string;
  brewName: string;
  cask?: boolean;
  manualDownload?: boolean;
  configs?: string[];
  checked?: boolean;
  dependencies?: string[]; // Other brew packages to install alongside
  detectCmd?: string;      // Custom command to check if installed (e.g., "command -v claude")
  detectPath?: string;     // Custom path to check if exists (e.g., "/Applications/App.app")
  desc?: string;           // Short description for info display
  url?: string;            // Project URL
  platforms?: PlatformSupport; // Platform support (default: all platforms)
  installCommand?: string;     // Custom installer for tools without a package manager entry
  linuxInstallCommand?: string; // Custom Linux installer when Homebrew is unavailable
  category: AppCategory;   // Category for grouped display
}

const APPS: App[] = [
  // CLI Tools
  { name: "tmux", value: "tmux", brewName: "tmux", checked: true, dependencies: ["sesh", "fzf", "xclip"], desc: "Terminal multiplexer - split panes, sessions", url: "https://github.com/tmux/tmux", platforms: { macos: true, linux: true, windows: false }, category: "cli" },
  { name: "btop", value: "btop", brewName: "btop", desc: "Modern resource monitor (better than htop)", url: "https://github.com/aristocratos/btop", category: "cli" },
  { name: "fzf", value: "fzf", brewName: "fzf", desc: "Fuzzy finder for files, history, and more", url: "https://github.com/junegunn/fzf", category: "cli" },
  { name: "ripgrep", value: "ripgrep", brewName: "ripgrep", desc: "Blazing fast grep replacement", url: "https://github.com/BurntSushi/ripgrep", category: "cli" },
  { name: "gh", value: "gh", brewName: "gh", checked: true, desc: "GitHub CLI - PRs, issues, auth from terminal", url: "https://cli.github.com", category: "cli" },
  { name: "bat", value: "bat", brewName: "bat", desc: "cat with syntax highlighting", url: "https://github.com/sharkdp/bat", category: "cli" },
  { name: "eza", value: "eza", brewName: "eza", desc: "Modern ls with colors and icons", url: "https://github.com/eza-community/eza", category: "cli" },
  { name: "zoxide", value: "zoxide", brewName: "zoxide", desc: "Smarter cd that learns your habits", url: "https://github.com/ajeetdsouza/zoxide", category: "cli" },
  { name: "sesh", value: "sesh", brewName: "sesh", desc: "Smart session manager for tmux", url: "https://github.com/joshmedeski/sesh", category: "cli" },
  { name: "Herdr", value: "herdr", brewName: "herdr", linuxInstallCommand: "curl -fsSL https://herdr.dev/install.sh | sh", checked: true, detectCmd: "command -v herdr", desc: "Agent-aware terminal multiplexer", url: "https://herdr.dev", platforms: { macos: true, linux: true, windows: false }, category: "cli" },
  { name: "Conductor", value: "conductor", brewName: "conductor", cask: true, detectPath: "/Applications/Conductor.app", desc: "Run parallel coding agents in isolated workspaces", url: "https://www.conductor.build/", platforms: { macos: true, linux: false, windows: false }, category: "productivity" },

  { name: "starship", value: "starship", brewName: "starship", checked: true, desc: "Fast, customizable shell prompt", url: "https://starship.rs", platforms: { macos: true, linux: true, windows: false }, category: "cli" },

  // Terminals & Editors
  { name: "iTerm2", value: "iterm2", brewName: "iterm2", cask: true, configs: ["iterm2"], checked: true, detectPath: "/Applications/iTerm.app", desc: "Recommended first terminal with BuiltBy key defaults", url: "https://iterm2.com", platforms: { macos: true, linux: false, windows: false }, category: "terminals" },
  { name: "Ghostty", value: "ghostty", brewName: "ghostty", cask: true, configs: ["ghostty"], checked: false, detectPath: "/Applications/Ghostty.app", desc: "Optional GPU-accelerated terminal by Mitchell Hashimoto", url: "https://ghostty.org", platforms: { macos: true, linux: false, windows: false }, category: "terminals" },
  { name: "Visual Studio Code", value: "vscode", brewName: "visual-studio-code", cask: true, checked: true, detectPath: "/Applications/Visual Studio Code.app", desc: "Popular code editor by Microsoft", url: "https://code.visualstudio.com", platforms: { macos: true, linux: false, windows: false }, category: "terminals" },
  { name: "Cursor", value: "cursor", brewName: "cursor", cask: true, configs: ["cursor"], checked: false, detectPath: "/Applications/Cursor.app", desc: "AI-first code editor (VS Code fork)", url: "https://cursor.sh", platforms: { macos: true, linux: false, windows: false }, category: "terminals" },
  { name: "Zed", value: "zed", brewName: "zed", cask: true, checked: true, detectPath: "/Applications/Zed.app", desc: "High-performance code editor by the Atom creators", url: "https://zed.dev", platforms: { macos: true, linux: true, windows: false }, category: "terminals" },

  // AI Tools
  { name: "Claude Code", value: "claude", brewName: "", configs: ["claude"], checked: true, detectCmd: "command -v claude", desc: "Anthropic's AI coding assistant for terminal", url: "https://docs.anthropic.com/en/docs/claude-code", platforms: { macos: true, linux: true, windows: false }, category: "ai" },
  { name: "OpenCode", value: "opencode", brewName: "", configs: ["opencode"], checked: true, detectCmd: "command -v opencode", desc: "Default AI coding assistant CLI by opencode.ai", url: "https://opencode.ai", platforms: { macos: true, linux: true, windows: false }, category: "ai" },
  { name: "Codex CLI", value: "codex", brewName: "", configs: ["codex"], checked: false, detectCmd: "command -v codex", desc: "Optional OpenAI coding assistant CLI", url: "https://github.com/openai/codex", category: "ai" },
  { name: "Oh My Pi", value: "omp", brewName: "", checked: true, detectCmd: "command -v omp", installCommand: "curl -fsSL https://omp.sh/install | sh", desc: "Batteries-included terminal coding agent", url: "https://github.com/can1357/oh-my-pi", platforms: { macos: true, linux: true, windows: false }, category: "ai" },
  { name: "Gemini CLI", value: "gemini", brewName: "", configs: ["gemini"], checked: false, detectCmd: "command -v gemini", desc: "Google's AI coding assistant CLI", url: "https://gemini.google.com/app", platforms: { macos: true, linux: true, windows: false }, category: "ai" },

  // Productivity (macOS only)
  { name: "Back2Vibing", value: "back2vibing", brewName: "back2vibing", cask: true, detectPath: "/Applications/back2vibing.app", desc: "Focus & productivity for AI developers", url: "https://back2vibing.builtby.win", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "Raycast", value: "raycast", brewName: "raycast", cask: true, checked: true, detectPath: "/Applications/Raycast.app", desc: "Spotlight replacement with extensions", url: "https://raycast.com", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "TypeWhisper", value: "typewhisper", brewName: "", manualDownload: true, detectPath: "/Applications/TypeWhisper.app", desc: "Private voice dictation app for macOS", url: "https://www.typewhisper.com/en/", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "Cotypist", value: "cotypist", brewName: "", manualDownload: true, detectPath: "/Applications/Cotypist.app", desc: "Voice-to-text writing assistant for macOS", url: "https://cotypist.app/", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "Neru", value: "neru", brewName: "y3owk1n/tap/neru", cask: true, detectPath: "/Applications/Neru.app", desc: "Keyboard-driven screen navigation for macOS", url: "https://github.com/y3owk1n/neru", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "AltTab", value: "alttab", brewName: "alt-tab", cask: true, detectPath: "/Applications/AltTab.app", desc: "Windows-style alt-tab window switcher", url: "https://alt-tab-macos.netlify.app", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "Ice", value: "ice", brewName: "jordanbaird-ice", cask: true, detectPath: "/Applications/Ice.app", desc: "Menu bar management - hide icons", url: "https://github.com/jordanbaird/Ice", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "BetterTouchTool", value: "bettertouchtool", brewName: "bettertouchtool", cask: true, detectPath: "/Applications/BetterTouchTool.app", desc: "Customize trackpad, keyboard, and Touch Bar", url: "https://folivora.ai", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },

  // Input (macOS only)
  { name: "Hammerspoon", value: "hammerspoon", brewName: "hammerspoon", cask: true, detectPath: "/Applications/Hammerspoon.app", desc: "Lua automation and system hotkeys for macOS", url: "https://www.hammerspoon.org", platforms: { macos: true, windows: false, linux: false }, category: "input" },
  { name: "Karabiner Elements", value: "karabiner-elements", brewName: "karabiner-elements", cask: true, detectPath: "/Applications/Karabiner-Elements.app", desc: "Powerful keyboard customization", url: "https://karabiner-elements.pqrs.org", platforms: { macos: true, windows: false, linux: false }, category: "input" },
  { name: "LinearMouse", value: "linearmouse", brewName: "linearmouse", cask: true, detectPath: "/Applications/LinearMouse.app", desc: "Mouse and trackpad customization", url: "https://linearmouse.app", platforms: { macos: true, windows: false, linux: false }, category: "input" },

  // Security (cross-platform)
  { name: "Bitwarden", value: "bitwarden", brewName: "bitwarden", cask: true, detectPath: "/Applications/Bitwarden.app", desc: "Open source password manager", url: "https://bitwarden.com", platforms: { macos: true, linux: false, windows: false }, category: "security" },

  // Browsers (cross-platform except Orion)
  { name: "Google Chrome", value: "chrome", brewName: "google-chrome", cask: true, detectPath: "/Applications/Google Chrome.app", desc: "Google's web browser", url: "https://google.com/chrome", platforms: { macos: true, linux: false, windows: false }, category: "browsers" },
  { name: "Arc", value: "arc", brewName: "arc", cask: true, detectPath: "/Applications/Arc.app", desc: "Modern browser with spaces & profiles", url: "https://arc.net", platforms: { macos: true, windows: true, linux: false }, category: "browsers" },
  { name: "Orion", value: "orion", brewName: "orion", cask: true, detectPath: "/Applications/Orion.app", desc: "WebKit browser with Chrome/Firefox extension support", url: "https://browser.kagi.com", platforms: { macos: true, windows: false, linux: false }, category: "browsers" },

  // Dev Tools (cross-platform)
  { name: "Docker", value: "docker", brewName: "docker", cask: true, detectPath: "/Applications/Docker.app", desc: "Container runtime for development", url: "https://docker.com", platforms: { macos: true, linux: false, windows: false }, category: "devtools" },
  { name: "Figma", value: "figma", brewName: "figma", cask: true, detectPath: "/Applications/Figma.app", desc: "Collaborative design tool", url: "https://figma.com", platforms: { macos: true, linux: false, windows: false }, category: "devtools" },
  { name: "Discord", value: "discord", brewName: "discord", cask: true, detectPath: "/Applications/Discord.app", desc: "Chat for communities", url: "https://discord.com", platforms: { macos: true, linux: false, windows: false }, category: "devtools" },
];

// Chezmoi-managed configs
interface ManagedConfig {
  name: string;
  value: string;
  checked?: boolean;
  platforms?: PlatformSupport;
  desc?: string;
}

const MANAGED_CONFIGS: ManagedConfig[] = [
  { name: "Shell config", value: "zsh", checked: true, desc: "zinit plugins, starship prompt, aliases, PATH setup" },
  { name: "Tmux", value: "tmux", checked: true, platforms: { macos: true, linux: true, windows: false }, desc: "core profile + optional basic keymap, preserves existing setups" },
  { name: "Neovim", value: "nvim", checked: false, platforms: { macos: true, linux: true, windows: false }, desc: "Bleeding-edge vim.pack Neovim config (requires Neovim 0.12+)" },
  { name: "Hammerspoon", value: "hammerspoon", checked: false, platforms: { macos: true, windows: false, linux: false }, desc: "Hyper app launcher and Ghostty automation" },
  { name: "Karabiner Elements", value: "karabiner", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "App-aware chords, Hyper, and Neru keyboard modes" },
  { name: "iTerm2 defaults", value: "iterm2", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "Command-Backspace, word delete, prompt navigation, and terminal key hacks" },
  { name: "Ghostty", value: "ghostty", checked: false, platforms: { macos: true, linux: true, windows: false }, desc: "Font, theme, keybindings for optional GPU terminal" },
];

// Optional features (opt-in, don't load in shell unless selected)
const OPTIONAL_FEATURES = [
  {
    name: "Shell Tips (Daily)",
    value: "tips",
    checked: true,
    desc: "Show a short dotfiles tip once per day when the shell starts"
  },
];

// AI tool configs (template-based)
const AI_CONFIGS: Record<string, { name: string; templates: string[]; targetDir?: string }> = {
  claude: {
    name: "Claude Code",
    templates: ["settings.json", "settings.local.json"],
  },
  codex: {
    name: "Codex CLI",
    templates: ["config.toml", "hooks.json"],
  },
  opencode: {
    name: "OpenCode",
    templates: ["opencode.json", "oh-my-openagent.json", "tui.json"],
    targetDir: ".config/opencode",
  },
  gemini: {
    name: "Gemini CLI",
    templates: ["settings.json"],
  },
  cursor: {
    name: "Cursor",
    templates: ["hooks.json"],
  },
};

async function handleFileConflict(targetPath: string): Promise<"backup" | "skip" | "overwrite"> {
  if (!existsSync(targetPath)) return "overwrite";

  log.warning(`${targetPath} already exists; backing it up before replacing`);
  return "backup";
}

function backupFile(filePath: string): string {
  const safeName = getSafeBackupName(filePath, HOME);
  const backupPath = backupExistingPath(filePath, HOME);
  pruneBackupFiles(`${safeName}.dotfiles-backup.`);
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

function getCommandOutput(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

const systemCommands: SystemCommands = {
  runCommand,
  getCommandOutput,
};

const linuxPM = createLinuxPackageManager(systemCommands);

function getLinuxPackageManager() { return linuxPM.detect(); }
function getLinuxPackageName(name: string) { return linuxPM.getPackageName(name); }

// Cache for installed package manager data (populated once, used many times)
let installedFormulasCache: Set<string> | null = null;
let installedCasksCache: Set<string> | null = null;

function getInstalledFormulas(): Set<string> {
  if (installedFormulasCache) return installedFormulasCache;

  if (getCurrentPlatform() !== "macos") {
    installedFormulasCache = new Set();
    return installedFormulasCache;
  }

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

  if (getCurrentPlatform() !== "macos") {
    installedCasksCache = new Set();
    return installedCasksCache;
  }

  try {
    const output = execSync("brew list --cask 2>/dev/null", { encoding: "utf-8" });
    installedCasksCache = new Set(output.trim().split("\n").filter(Boolean));
  } catch {
    installedCasksCache = new Set();
  }
  return installedCasksCache;
}

function getInstalledLinuxPackages(): Set<string> {
  if (getCurrentPlatform() !== "linux") return new Set();
  return linuxPM.getInstalledPackages();
}

type AppInstallState = "installed" | "partial" | "not_installed";

function getAppInstallState(app: App): AppInstallState {
  const currentPlatform = getCurrentPlatform();

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
  // Priority 3: Package manager / command checks
  else if (app.brewName) {
    if (currentPlatform === "linux") {
      const linuxPackage = getLinuxPackageName(app.brewName);
      const linuxPackages = getInstalledLinuxPackages();
      mainAppInstalled = (linuxPackage ? linuxPackages.has(linuxPackage) : false)
        || runCommand(`command -v ${app.value}`, true)
        || (linuxPackage ? runCommand(`command -v ${linuxPackage}`, true) : false);
    } else {
      mainAppInstalled = app.cask
        ? getInstalledCasks().has(app.brewName)
        : getInstalledFormulas().has(app.brewName);
    }
  }

  if (!mainAppInstalled) return "not_installed";

  // Check dependencies are also installed
  if (app.dependencies) {
    if (currentPlatform === "linux") {
      const linuxPackages = getInstalledLinuxPackages();
      for (const dep of app.dependencies) {
        const linuxDep = getLinuxPackageName(dep);
        if (!linuxDep) {
          return "partial";
        }
        const depInstalled = linuxPackages.has(linuxDep) || runCommand(`command -v ${linuxDep}`, true);
        if (!depInstalled) {
          return "partial";
        }
      }
    } else {
      const formulas = getInstalledFormulas();
      for (const dep of app.dependencies) {
        if (!formulas.has(dep)) {
          return "partial"; // Main app installed, but missing dependencies
        }
      }
    }
  }

  return "installed";
}

function formatAppChoiceName(app: App, state: AppInstallState): string {
  const descPart = app.desc ? ` ${colors.dim}- ${app.desc}${colors.reset}` : "";
  if (state === "installed") {
    return `${app.name}${descPart} ${colors.green}(installed)${colors.reset}`;
  }
  if (state === "partial") {
    return `${app.name}${descPart} ${colors.yellow}(missing extras)${colors.reset}`;
  }
  return `${app.name}${descPart}`;
}

async function selectFocusedWorkflowApps(
  selectableApps: App[],
  appStates: Map<string, AppInstallState>,
  installItemLabel: string,
): Promise<string[]> {
  console.log(`  ${colors.dim}Focused setup starts with the recommended AI/dev workflow selected, including OpenCode. Codex and Ghostty stay optional.${colors.reset}`);
  console.log("");

  return checkbox({
    message: `Select ${installItemLabel} for the full AI/dev workflow:`,
    choices: selectableApps.map((app) => {
      const state = appStates.get(app.value) ?? "not_installed";
      return {
        name: formatAppChoiceName(app, state),
        value: app.value,
        checked: state !== "not_installed" || (app.checked ?? false),
        disabled: false,
      };
    }),
    pageSize: 20,
    loop: false,
  });
}

function isAppInstalled(app: App): boolean {
  return getAppInstallState(app) === "installed";
}

function isManagedConfigApplied(config: string): boolean {
  if (config === "iterm2") {
    if (getCurrentPlatform() !== "macos") return false;
    const globalKeyMap = getCommandOutput('defaults read com.googlecode.iterm2 GlobalKeyMap 2>/dev/null') ?? "";
    return globalKeyMap.includes('0x7f-0x100000-0x33') && globalKeyMap.includes('0x7f-0x80000-0x33');
  }

  const targets = CHEZMOI_TARGETS[config];
  if (!targets) return false;

  if (config === "zsh") {
    const zshrcPath = join(HOME, ".zshrc");
    if (!existsSync(zshrcPath)) return false;

    try {
      const stats = lstatSync(zshrcPath);
      if (stats.isSymbolicLink()) {
        return false;
      }

      const zshrcContent = readFileSync(zshrcPath, "utf-8");
      if (!zshrcContent.includes(ZSHRC_MARKER_START)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return targets.every((target) => {
    const targetPath = join(HOME, target);
    if (!existsSync(targetPath)) return false;

    try {
      const stats = lstatSync(targetPath);
      if (stats.isSymbolicLink()) {
        // Read the symlink path itself, not the file content
        const linkPath = readlinkSync(targetPath);
        return linkPath.includes("builtby.win/dotfiles") || linkPath.includes("chezmoi");
      }
    } catch {
      return false;
    }

    return true;
  });
}

function installLinuxPackages(packages: string[]): boolean {
  if (!linuxPM.detect()) {
    log.warning("No supported Linux package manager found (need apt-get, dnf, or pacman)");
    return false;
  }
  return linuxPM.install(packages);
}

function ensureLocalBinInPath(): void {
  const localBin = join(HOME, ".local", "bin");
  const currentPath = process.env.PATH ?? "";
  const pathEntries = currentPath.split(":").filter(Boolean);

  if (!pathEntries.includes(localBin)) {
    process.env.PATH = currentPath ? `${localBin}:${currentPath}` : localBin;
  }
}

function installStarshipOnLinux(): boolean {
  if (runCommand("command -v starship", true)) {
    log.success("starship already installed");
    return true;
  }

  log.info("Installing starship...");
  ensureLocalBinInPath();

  const installerUrl = "https://starship.rs/install.sh";
  if (!runCommand(`curl -fsSL \"${installerUrl}\" -o /dev/null`, true)) {
    log.error(`Cannot access ${installerUrl}`);
    log.error("Third-party URL access is required to install starship on Linux");
    return false;
  }

  const installCommand = "curl -sS https://starship.rs/install.sh | sh";
  if (!runCommand(installCommand)) {
    log.error("Starship installer failed");
    log.error("Please ensure third-party URLs are reachable and retry");
    return false;
  }

  ensureLocalBinInPath();
  if (runCommand("command -v starship", true)) {
    log.success("starship installed");
    return true;
  }

  const localCandidates = [
    join(HOME, ".local", "bin", "starship"),
    join(HOME, ".cargo", "bin", "starship"),
    join(HOME, ".nix-profile", "bin", "starship"),
  ];

  for (const candidate of localCandidates) {
    if (!existsSync(candidate)) continue;
    const candidateDir = dirname(candidate);
    const currentPath = process.env.PATH ?? "";
    if (!currentPath.split(":").includes(candidateDir)) {
      process.env.PATH = currentPath ? `${candidateDir}:${currentPath}` : candidateDir;
    }
    log.success("starship installed");
    return true;
  }

  log.error("Starship installation completed but binary was not found in PATH");
  return false;
}


function installSeshOnLinux(): boolean {
  if (runCommand("command -v sesh", true)) {
    log.success("sesh already installed");
    return true;
  }

  log.info("Installing sesh...");
  ensureLocalBinInPath();
  const arch = getCommandOutput("uname -m");
  if (!arch || arch !== "x86_64") {
    log.warning("sesh automatic install currently only supports x86_64 architecture on Linux");
    return false;
  }

  const latestTag = getCommandOutput('curl -s https://api.github.com/repos/joshmedeski/sesh/releases/latest | grep "tag_name" | cut -d\'"\' -f4');
  if (!latestTag) {
    log.warning("Failed to detect latest sesh version");
    return false;
  }
  const version = latestTag.startsWith('v') ? latestTag.substring(1) : latestTag;

  const url = `https://github.com/joshmedeski/sesh/releases/download/${latestTag}/sesh_Linux_x86_64.tar.gz`;
  const localBin = join(HOME, ".local", "bin");
  if (!existsSync(localBin)) {
    mkdirSync(localBin, { recursive: true });
  }

  const installCommand = `curl -L "${url}" | tar -xz -C "${localBin}" sesh`;
  if (!runCommand(installCommand)) {
    log.error("Sesh binary download failed");
    return false;
  }

  if (runCommand("command -v sesh", true)) {
    log.success("sesh installed");
    return true;
  }

  log.warning("sesh installation completed but binary was not found in PATH");
  return false;
}

function installPackage(name: string, cask = false): boolean {
  const platform = getCurrentPlatform();

  if (platform === "linux") {
    if (name === "starship") {
      return installStarshipOnLinux();
    }
    if (name === "sesh") {
      return installSeshOnLinux();
    }

    const linuxManager = getLinuxPackageManager();
    if (!linuxManager) {
      log.warning(`Skipping ${name}: no supported Linux package manager and no curl installer is configured`);
      return false;
    }

    const linuxPackage = getLinuxPackageName(name) ?? name;

    const installed = getInstalledLinuxPackages();
    if (installed.has(linuxPackage) || runCommand(`command -v ${linuxPackage}`, true)) {
      log.success(`${linuxPackage} already installed`);
      return true;
    }

    if (cask) {
      log.info(`Installing ${linuxPackage} as a regular Linux package`);
    } else {
      log.info(`Installing ${linuxPackage}...`);
    }

    if (installLinuxPackages([linuxPackage])) {
      log.success(`${linuxPackage} installed`);
      return true;
    }

    log.warning(`Failed to install ${linuxPackage}`);
    return false;
  }

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
  }

  log.warning(`Failed to install ${name}`);
  return false;
}

function getManualDownloadApps(apps: string[]): App[] {
  return APPS.filter((app) => apps.includes(app.value) && app.manualDownload);
}

function printManualDownloadApps(apps: App[]): void {
  if (apps.length === 0) return;

  console.log(`  ${colors.yellow}${colors.bold}Manual download required:${colors.reset}`);
  console.log(`  ${colors.dim}Download these manually:${colors.reset}`);

  for (const app of apps) {
    const url = app.url ?? "";
    console.log(`    • ${app.name}: ${colors.cyan}${url}${colors.reset}`);
  }

  console.log("");
}

async function installApps(apps: string[]): Promise<void> {
  if (apps.length === 0) return;

  const appsToInstall = APPS.filter((a) => apps.includes(a.value) && (a.brewName || a.installCommand));
  const platform = getCurrentPlatform();
  if (appsToInstall.length > 0) {
    if (platform === "linux") {
      const manager = getLinuxPackageManager();
      log.step(`Installing commands via ${manager ?? "Linux package manager"}...`);
    } else if (appsToInstall.some((app) => app.brewName)) {
      log.step("Installing apps via Homebrew...");
    }

    for (const app of appsToInstall) {
      if (app.brewName && !(platform === "linux" && app.linuxInstallCommand)) {
        installPackage(app.brewName, app.cask);
      }
      const customInstallCommand = platform === "linux"
        ? app.linuxInstallCommand ?? app.installCommand
        : app.installCommand;
      if (customInstallCommand) {
        log.info(`Installing ${app.name}...`);
        if (runCommand(customInstallCommand, false)) {
          log.success(`${app.name} installed`);
        } else {
          log.warning(`Failed to install ${app.name}`);
        }
      }

      if (app.dependencies) {
        for (const dep of app.dependencies) {
          installPackage(dep);
        }
      }
    }
  }

  const manualDownloadApps = getManualDownloadApps(apps);
  if (manualDownloadApps.length > 0) {
    log.step("Manual app downloads");
    printManualDownloadApps(manualDownloadApps);
  }

  if (apps.includes("claude")) {
    log.info("Installing Claude Code CLI...");
    if (runCommand("npm install -g @anthropic-ai/claude-code", false)) {
      log.success("Claude Code CLI installed");
    } else {
      log.warning("Failed to install Claude Code CLI");
    }
  }

  if (apps.includes("gemini")) {
    log.info("Installing Gemini CLI...");
    if (runCommand("npm install -g @google/gemini-cli", false)) {
      log.success("Gemini CLI installed");
    } else {
      log.warning("Failed to install Gemini CLI");
    }
  }

  if (apps.includes("codex")) {
    log.info("Installing Codex CLI...");
    if (runCommand("npm install -g @openai/codex", false)) {
      log.success("Codex CLI installed");
    } else {
      log.warning("Failed to install Codex CLI");
    }
  }

  if (apps.includes("opencode")) {
    log.info("Installing OpenCode CLI...");
    const installCommand = getCurrentPlatform() === "linux"
      ? "curl -fsSL https://opencode.ai/install | bash"
      : "npm install -g opencode-ai";
    if (runCommand(installCommand, false)) {
      log.success("OpenCode CLI installed");
    } else {
      log.warning("Failed to install OpenCode CLI");
    }
  }

}

function writeDotfilesPath(): void {
  if (!existsSync(DOTFILES_CONFIG_DIR)) {
    mkdirSync(DOTFILES_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(DOTFILES_PATH_FILE, DOTFILES_DIR);
  log.success(`Saved dotfiles path to ${DOTFILES_PATH_FILE}`);
}

// Map managed config names to their target files for migration/backups.
const CHEZMOI_TARGETS: Record<string, string[]> = {
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
  karabiner: [
    ".config/karabiner/karabiner.json",
    ".config/neru/config.toml",
    ".local/bin/karabiner-layer",
  ],
  ghostty: process.platform === "darwin"
    ? [
        ".config/ghostty/config",
        "Library/Application Support/com.mitchellh.ghostty/config",
      ]
    : [".config/ghostty/config"],
};

function formatHomePath(path: string): string {
  return path.startsWith(HOME) ? path.replace(HOME, "~") : path;
}

function selectedManagedTargetPaths(configs: string[]): string[] {
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

function selectedChezmoiApplyTargets(configs: string[]): string[] {
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

function selectedAIConfigPaths(configs: string[]): string[] {
  const paths = new Set<string>();

  for (const config of configs) {
    const configInfo = AI_CONFIGS[config];
    if (!configInfo) continue;

    const targetDir = join(HOME, configInfo.targetDir ?? `.${config}`);
    for (const template of configInfo.templates) {
      paths.add(join(targetDir, template));
    }
  }

  return [...paths].sort();
}

function printPathList(paths: string[], emptyMessage: string): void {
  if (paths.length === 0) {
    console.log(`    ${colors.dim}${emptyMessage}${colors.reset}`);
    return;
  }

  for (const path of paths) {
    console.log(`    ${colors.dim}${formatHomePath(path)}${colors.reset}`);
  }
}

function upsertZshrcMergeBlock(content: string): string {
  const block = [
    ZSHRC_MARKER_START,
    'if [[ -f "$HOME/.config/dotfiles/path" ]]; then',
    '  DOTFILES_DIR="$(cat "$HOME/.config/dotfiles/path")"',
    "  export DOTFILES_DIR",
    '  [[ -f "$DOTFILES_DIR/shell/init.sh" ]] && source "$DOTFILES_DIR/shell/init.sh"',
    "fi",
    ZSHRC_MARKER_END,
  ].join("\n");

  const startIdx = content.indexOf(ZSHRC_MARKER_START);
  const endIdx = content.indexOf(ZSHRC_MARKER_END);
  let next = content;

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    next = content.slice(0, startIdx) + content.slice(endIdx + ZSHRC_MARKER_END.length);
  }

  if (next && !next.endsWith("\n")) {
    next += "\n";
  }

  if (!next.trim()) {
    return `${block}\n`;
  }

  return `${next}\n${block}\n`;
}

function ensureLocalShellOverridesFile(): void {
  if (!existsSync(DOTFILES_CONFIG_DIR)) {
    mkdirSync(DOTFILES_CONFIG_DIR, { recursive: true });
  }

  if (existsSync(DOTFILES_LOCAL_SHELL_FILE)) {
    return;
  }

  const content = [
    "# Local machine-only shell overrides",
    "# This file is not symlinked and is never committed by dotfiles.",
    "",
    "# Add aliases/functions for this computer only.",
    "# alias ll='ls -lah'",
    "# alias gs='git status'",
    "",
  ].join("\n");

  writeFileSync(DOTFILES_LOCAL_SHELL_FILE, content);
  log.success(`Created local shell overrides at ${DOTFILES_LOCAL_SHELL_FILE}`);
}


function setupZshEntrypoint(): void {
  const zshrcPath = join(HOME, ".zshrc");
  let existingContent = "";
  let hasRegularFile = false;

  if (existsSync(zshrcPath)) {
    const stats = lstatSync(zshrcPath);

    if (stats.isSymbolicLink()) {
      try {
        const backupPath = backupFile(zshrcPath);
        addToManifest({ original: zshrcPath, backup: backupPath, type: "file" });
      } catch {
        log.warning("Could not back up ~/.zshrc symlink target before migration");
      }

      unlinkSync(zshrcPath);
      log.info("Converted ~/.zshrc symlink to local file");
    } else {
      existingContent = readFileSync(zshrcPath, "utf-8");
      hasRegularFile = true;
    }
  }

  const nextContent = upsertZshrcMergeBlock(existingContent);
  if (!hasRegularFile || nextContent !== existingContent) {
    if (hasRegularFile) {
      const backupPath = backupFile(zshrcPath);
      addToManifest({ original: zshrcPath, backup: backupPath, type: "file" });
    }
    writeFileSync(zshrcPath, nextContent);
    log.success(hasRegularFile
      ? "Updated ~/.zshrc to source dotfiles without symlinking"
      : "Created ~/.zshrc that sources dotfiles");
  } else {
    log.success("~/.zshrc already configured for dotfiles source mode");
  }

  ensureLocalShellOverridesFile();
}

async function setupTmuxEntrypoint(): Promise<boolean> {
  const tmuxConfPath = join(HOME, ".tmux.conf");

  if (!existsSync(tmuxConfPath)) {
    try {
      const stats = lstatSync(tmuxConfPath);
      if (stats.isSymbolicLink()) {
        unlinkSync(tmuxConfPath);
        log.info("Removed stale ~/.tmux.conf symlink");
      }
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }

  if (!existsSync(tmuxConfPath)) {
    if (!existsSync(TMUX_BOOTSTRAP_BASIC_SOURCE)) {
      log.warning("tmux bootstrap.basic.conf not found - skipping ~/.tmux.conf setup");
      return false;
    }

    const content = generateTmuxEntrypoint();
    writeFileSync(tmuxConfPath, content);
    log.success("Created ~/.tmux.conf with builtby basic profile");
    return true;
  }

  const currentContent = readFileSync(tmuxConfPath, "utf-8");
  if (
    currentContent.includes(TMUX_MERGE_MARKER_START) ||
    hasBuiltbyTmuxBootstrap(currentContent) ||
    currentContent.includes("$HOME/.config/tmux/builtby/core.conf") ||
    currentContent.includes("$HOME/.config/tmux/builtby/basic.conf")
  ) {
    const normalizedContent = normalizeTmuxEntrypoint(currentContent);
    if (normalizedContent !== currentContent) {
      writeFileSync(tmuxConfPath, normalizedContent);
      log.success("Normalized ~/.tmux.conf to source the builtby tmux profile once");
      return true;
    }

    log.success("~/.tmux.conf already includes builtby tmux integration");
    return true;
  }

  log.warning("~/.tmux.conf already exists");
  const choice = await select({
    message: "How should we integrate tmux config?",
    choices: [
      { name: "Keep my existing keybinds (recommended)", value: "append-pro" as const },
      { name: "Replace with builtby basic profile (backup mine first)", value: "replace-basic" as const },
      { name: "Skip tmux config changes", value: "skip" as const },
    ],
  });

  if (choice === "skip") {
    log.info("Skipping tmux config changes");
    return false;
  }

  const backupPath = backupFile(tmuxConfPath);
  addToManifest({ original: tmuxConfPath, backup: backupPath, type: "file" });

  if (choice === "replace-basic") {
    if (!existsSync(TMUX_BOOTSTRAP_BASIC_SOURCE)) {
      log.error("tmux bootstrap.basic.conf not found");
      return false;
    }

    const content = generateTmuxEntrypoint();
    writeFileSync(tmuxConfPath, content);
    log.success("Replaced ~/.tmux.conf with builtby basic profile");
    return true;
  }

  const merged = upsertTmuxMergeBlock(currentContent);
  writeFileSync(tmuxConfPath, merged);
  log.success("Appended builtby tmux pro bootstrap without replacing your keybinds");
  return true;
}

function isLegacyStowSymlink(targetPath: string): boolean {
  try {
    const stats = lstatSync(targetPath);
    if (!stats.isSymbolicLink()) return false;
    const linkPath = readlinkSync(targetPath);
    return linkPath.includes(`${DOTFILES_DIR}/stow-packages`) || linkPath.includes("stow-packages");
  } catch {
    return false;
  }
}

function migrateLegacyStowSymlinks(configs: string[]): void {
  const targets = new Set<string>();
  for (const config of configs) {
    for (const target of CHEZMOI_TARGETS[config] ?? []) {
      targets.add(join(HOME, target));
    }
  }

  for (const targetPath of targets) {
    if (!isLegacyStowSymlink(targetPath)) continue;
    unlinkSync(targetPath);
    log.info(`Removed legacy stow symlink: ${targetPath}`);
  }
}

function backupRealManagedTargets(configs: string[]): void {
  const targets = new Set<string>();
  for (const config of configs) {
    for (const target of CHEZMOI_TARGETS[config] ?? []) {
      targets.add(join(HOME, target));
    }
  }

  for (const targetPath of targets) {
    if (!existsSync(targetPath)) continue;

    const stats = lstatSync(targetPath);
    if (stats.isSymbolicLink()) continue;

    const backupPath = backupFile(targetPath);
    addToManifest({ original: targetPath, backup: backupPath, type: "chezmoi" });
    rmSync(targetPath, { recursive: true, force: true });
    log.info(`Backed up existing managed path before chezmoi apply: ${targetPath}`);
  }
}

function applyChezmoi(configs: string[]): boolean {
  const applyScript = join(DOTFILES_DIR, "scripts", "apply-chezmoi.sh");
  if (!existsSync(applyScript)) {
    log.error(`chezmoi apply helper not found: ${applyScript}`);
    return false;
  }

  const targets = selectedChezmoiApplyTargets(configs);
  if (targets.length === 0) {
    log.info("No selected chezmoi targets to apply");
    return true;
  }

  const quotedTargets = targets.map((target) => `"${target.replace(/"/g, '\\"')}"`).join(" ");
  return runCommand(`bash "${applyScript}" ${quotedTargets}`);
}

async function setupManagedConfigs(configs: string[]): Promise<void> {
  if (configs.length === 0) return;

  log.step("Applying selected configs...");
  writeDotfilesPath();

  const chezmoiConfigs = configs.filter((config) => config !== "iterm2");

  if (configs.includes("zsh")) {
    setupZshEntrypoint();
  }

  if (configs.includes("tmux")) {
    const shouldContinue = await setupTmuxEntrypoint();
    if (!shouldContinue) {
      log.info("Skipping tmux entrypoint changes");
    }
  }

  migrateLegacyStowSymlinks(chezmoiConfigs);
  backupRealManagedTargets(chezmoiConfigs);

  if (applyChezmoi(chezmoiConfigs)) {
    log.success("Selected chezmoi-managed configs applied");
    if (configs.includes("tmux")) {
      setupTpm();
    }
  } else {
    log.error("Failed to apply chezmoi-managed configs");
  }

  if (configs.includes("iterm2")) {
    applyITermDefaults();
  }
}

function applyITermDefaults(): void {
  if (getCurrentPlatform() !== "macos") return;

  const scriptPath = join(DOTFILES_DIR, "scripts", "setup-iterm-defaults.sh");
  if (!existsSync(scriptPath)) {
    log.warning(`iTerm2 defaults helper not found: ${scriptPath}`);
    return;
  }

  if (runCommand(`bash "${scriptPath}"`)) {
    log.success("iTerm2 defaults applied");
  } else {
    log.warning("Failed to apply iTerm2 defaults");
  }
}
async function maybeSetDefaultShellToZsh(selectedManagedConfigs: string[]): Promise<void> {
  const platform = getCurrentPlatform();
  if (platform === "windows") return;
  if (!selectedManagedConfigs.includes("zsh")) return;

  const currentShell = (process.env.SHELL ?? "").trim();
  const currentShellName = currentShell.split("/").pop() ?? currentShell;
  if (currentShellName === "zsh") return;

  const shouldSwitch = await confirm({
    message: "Set zsh as your default shell (login shell)?",
    default: true,
  });

  if (!shouldSwitch) {
    if (currentShell) {
      log.info(`Keeping current default shell: ${currentShell}`);
    }
    return;
  }

  let zshPath = getCommandOutput("command -v zsh");
  if (!zshPath && platform === "linux") {
    log.info("zsh is not installed. Installing via Linux package manager...");
    if (!installLinuxPackages(["zsh"])) {
      log.warning("Could not install zsh automatically");
      log.warning('Install zsh and run: chsh -s "$(command -v zsh)"');
      return;
    }
    zshPath = getCommandOutput("command -v zsh");
  }

  if (!zshPath) {
    log.warning("zsh was not found in PATH");
    log.warning('Install zsh and run: chsh -s "$(command -v zsh)"');
    return;
  }

  if (runCommand(`chsh -s "${zshPath}"`)) {
    log.success("Default shell changed to zsh");
    log.info("Open a new terminal or run: exec zsh");
  } else {
    log.warning("Could not change default shell automatically");
    log.warning(`Run manually: chsh -s "${zshPath}"`);
  }
}

async function maybeLoginGhCli(selectedApps: string[]): Promise<void> {
  if (!selectedApps.includes("gh")) return;

  const ghInstalled = runCommand("command -v gh", true);
  if (!ghInstalled) return;

  // Check if already authenticated
  const authStatus = getCommandOutput("gh auth status 2>&1");
  if (authStatus && authStatus.includes("Logged in to github.com")) {
    log.success("GitHub CLI already authenticated");
    return;
  }

  log.warning("GitHub CLI is installed but not authenticated");
  const shouldLogin = await confirm({
    message: "Login to GitHub now via gh auth login? (opens browser)",
    default: true,
  });

  if (!shouldLogin) {
    log.info("Skipping GitHub auth. Run 'gh auth login' later to set it up.");
    return;
  }

  console.log("");
  log.step("Launching GitHub CLI login...");
  log.info("Follow the prompts in your terminal to authenticate.");
  console.log("");

  runCommand("gh auth login");
}

function installTpmPlugins(tpmPath: string): void {
  const tmuxConfPath = join(HOME, ".tmux.conf");
  const installScript = join(tpmPath, "bin", "install_plugins");

  if (!existsSync(tmuxConfPath)) {
    log.warning("~/.tmux.conf not found - skipping TPM plugin install");
    return;
  }

  if (!existsSync(installScript)) {
    log.warning("TPM install script not found - skipping plugin install");
    return;
  }

  log.info("Installing tmux plugins via TPM...");
  const installed =
    runCommand(`"${installScript}"`, true) ||
    runCommand(`bash "${installScript}"`, true);

  if (installed) {
    log.success("Tmux plugins installed");
  } else {
    log.warning("Failed to install tmux plugins - you can run prefix + I later");
  }
}

function setupTmuxFingersOnLinux(): void {
  const fingersPath = join(HOME, ".tmux", "plugins", "tmux-fingers");
  if (!existsSync(fingersPath)) return;

  const arch = getCommandOutput("uname -m");
  if (arch !== "x86_64") return;

  const binaryPath = join(fingersPath, "bin", "tmux-fingers");
  if (existsSync(binaryPath)) return;

  log.info("Initializing tmux-fingers for Linux...");
  runCommand(`bash "${join(fingersPath, "install-wizard.sh")}" download-binary`, true);
}

function setupTpm(): void {
  const tpmPath = join(HOME, ".tmux", "plugins", "tpm");
  let tpmReady = false;

  if (existsSync(tpmPath)) {
    log.success("TPM already installed");
    tpmReady = true;
  } else {
    log.info("Installing TPM (Tmux Plugin Manager)...");
    const tpmDir = join(HOME, ".tmux", "plugins");
    if (!existsSync(tpmDir)) {
      mkdirSync(tpmDir, { recursive: true });
    }

    if (runCommand(`git clone https://github.com/tmux-plugins/tpm "${tpmPath}"`, true)) {
      log.success("TPM installed");
      tpmReady = true;
    } else {
      log.warning("Failed to install TPM - you can install manually later");
    }
  }

  if (tpmReady) {
    installTpmPlugins(tpmPath);
    if (getCurrentPlatform() === "linux") {
      setupTmuxFingersOnLinux();
    }
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

    const targetDir = join(HOME, configInfo.targetDir ?? `.${config}`);

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
      // Check if backup still exists
      if (!existsSync(entry.backup)) {
        log.error(`Backup file not found: ${entry.backup}`);
        continue;
      }

      // Restore the backup. Use rmSync because chezmoi-managed backups can be
      // directories such as ~/.config/tmux or ~/.config/nvim.
      if (existsSync(entry.original)) {
        rmSync(entry.original, { recursive: true, force: true });
      }
      renameSync(entry.backup, entry.original);
      log.success(`Restored ${entry.original}`);

      // Remove from manifest
      manifest.entries = manifest.entries.filter(
        (e) => !(e.original === entry.original && e.backup === entry.backup)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Failed to restore ${entry.original}: ${message}`);
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
  console.log(`    ${colors.dim}https://back2vibing.builtby.win${colors.reset}`);
  console.log("");
  console.log(`  ${colors.yellow}→${colors.reset} zerostack`);
  console.log(`    ${colors.dim}https://zerostack.builtby.win${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  console.log("");
}

// ============================================
// Merge Mode - À la carte adoption
// ============================================

interface MergeableConfig {
  name: string;
  description: string;
  userPath: string;
  dotfilesPath: string;
  type: "shell" | "config";
}

const MERGEABLE_CONFIGS: MergeableConfig[] = [
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

async function runMergeMode(): Promise<void> {
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

async function mergeShellConfig(config: MergeableConfig): Promise<void> {
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

async function mergeGenericConfig(config: MergeableConfig): Promise<void> {
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

async function mainMenu(): Promise<void> {
  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Setup dotfiles (full install)", value: "setup" as const },
      { name: "Merge with existing (à la carte)", value: "merge" as const },
      { name: "Revert to backups", value: "revert" as const },
      { name: "Exit", value: "exit" as const },
    ],
  });

  switch (action) {
    case "setup":
      return runSetup();
    case "merge":
      return runMergeMode();
    case "revert":
      return revertBackups();
    case "exit":
      process.exit(0);
  }
}

async function runSetup(): Promise<void> {
  // Filter apps and configs by current platform
  const currentPlatform = getCurrentPlatform();
  const platformApps = APPS.filter(app => isPlatformSupported(app.platforms, currentPlatform));
  const platformManagedConfigs = MANAGED_CONFIGS.filter(config => isPlatformSupported(config.platforms, currentPlatform));
  const linuxCommandCategories = new Set<AppCategory>(["cli", "ai"]);
  const selectableApps = currentPlatform === "linux"
    ? platformApps.filter((app) => !app.cask && linuxCommandCategories.has(app.category))
    : platformApps;
  const selectableManagedConfigs = currentPlatform === "linux"
    ? platformManagedConfigs.filter((config) => config.value === "zsh" || config.value === "tmux" || config.value === "nvim")
    : platformManagedConfigs;
  const installItemLabel = currentPlatform === "linux" ? "commands" : "apps";

  // Check what's already installed
  log.step(`Checking installed ${installItemLabel}...`);
  const appStates = new Map<string, AppInstallState>();
  const installedConfigs = new Set<string>();

  for (const app of selectableApps) {
    appStates.set(app.value, getAppInstallState(app));
  }

  for (const config of selectableManagedConfigs) {
    if (isManagedConfigApplied(config.value)) {
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

  // ============================================
  // Auto-Detection for First Run (No Manifest)
  // ============================================
  let selectedApps: string[] = [];
  let selectedManagedConfigs: string[] = [];
  let selectedFeatures: string[] = [];
  let aiConfigs: string[] = [];
  let currentStep = 1;
  let skipToRecap = false;

  if (!manifestExists()) {
    // First run - detect what's already installed
    const detected = autoDetectExistingSetup();
    const detectedAppsOnPlatform = detected.apps.filter(a => selectableApps.some(p => p.value === a));
    const detectedConfigsOnPlatform = detected.configs.filter(c => selectableManagedConfigs.some(p => p.value === c));
    const detectedFeaturesList = Object.entries(detected.features).filter(([_, v]) => v).map(([k]) => k);

    const hasDetectedItems = detectedAppsOnPlatform.length > 0 || 
                             detectedConfigsOnPlatform.length > 0 || 
                             detectedFeaturesList.length > 0;

    console.log(`${colors.cyan}${colors.bold}Welcome to builtby.win/dotfiles!${colors.reset}`);
    console.log(`${colors.dim}Setup starts with the recommended full AI/dev workflow, with iTerm2 as the first terminal and OpenCode as the default AI coding CLI. You can also select Codex before install.${colors.reset}`);
    console.log("");

    // Support --focus flag and bootstrap handoff
    const bootstrapSetupPath = getBootstrapSetupPath(process.argv.slice(2));
    const isFocusFlag = process.argv.includes("--focus");
    let setupPath: SetupPathChoice | "use_detected" = bootstrapSetupPath ?? (isFocusFlag ? "focus" : "focus");

    if (!bootstrapSetupPath && !isFocusFlag && hasDetectedItems) {
      setupPath = await select({
        message: "Use the recommended setup or keep what is already here?",
        choices: [
          {
            name: "Recommended full AI/dev workflow",
            value: "focus",
            description: "iTerm2 and OpenCode are selected by default; optional alternatives like Codex can be checked."
          },
          {
            name: `Keep detected setup (${detectedAppsOnPlatform.length} apps, ${detectedConfigsOnPlatform.length} configs)`,
            value: "use_detected",
            description: "Keeps only the tools and configs already found on this machine.",
          },
          {
            name: "Customize manually",
            value: "customize",
            description: "Walk through each group yourself.",
          },
        ],
        default: "focus",
      });
    }

    if (setupPath === "use_detected") {
      selectedApps = detectedAppsOnPlatform;
      selectedManagedConfigs = detectedConfigsOnPlatform;
      selectedFeatures = detectedFeaturesList;
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Using detected settings");
      console.log("");
    } else if (setupPath === "focus") {
      selectedApps = await selectFocusedWorkflowApps(selectableApps, appStates, installItemLabel);
      selectedManagedConfigs = ["zsh", "tmux", "iterm2"];
      selectedFeatures = ["tips"];
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected focused full AI/dev workflow defaults");
      console.log("");
    } else if (setupPath === "standard") {
      selectedApps = selectableApps.filter(a => a.checked).map(a => a.value);
      selectedManagedConfigs = selectableManagedConfigs.filter(c => c.checked).map(c => c.value);
      selectedFeatures = OPTIONAL_FEATURES.filter(f => f.checked).map(f => f.value);
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected standard defaults");
      console.log("");
    } else if (setupPath === "minimal") {
      selectedApps = ["starship", "fzf", "zoxide"]; // Core CLI dependencies
      selectedManagedConfigs = ["zsh"];
      selectedFeatures = ["tips"];
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected minimal shell foundation");
      console.log("");
    } else if (setupPath === "ai_agent") {
      selectedApps = selectableApps.filter(a => a.checked).map(a => a.value);
      if (!selectedApps.includes("opencode")) selectedApps.push("opencode");
      selectedManagedConfigs = selectableManagedConfigs.filter(c => c.checked).map(c => c.value);
      selectedFeatures = OPTIONAL_FEATURES.filter(f => f.checked).map(f => f.value);
      aiConfigs = ["opencode"];
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected OpenCode with AI agent configs");
      console.log(`  ${colors.dim}Includes: opencode CLI install, oh-my-openagent.json agent configs, TUI theme${colors.reset}`);
      console.log("");
    } else {
      console.log("");
      log.info("Proceeding to manual selection...");
      console.log("");
    }
  }

  // If not skipping, show info and do normal flow
  if (!skipToRecap) {
    // Ask if user wants to see what each tool does
    const showInfo = await confirm({
      message: "Want to see what each tool does first?",
      default: false,
    });

    if (showInfo) {
      console.log("");
      for (const category of CATEGORY_ORDER) {
        const appsInCategory = selectableApps.filter(app => app.category === category);
        if (appsInCategory.length === 0) continue;
        console.log(`${colors.cyan}${colors.bold}=== ${CATEGORY_LABELS[category]} ===${colors.reset}`);
        for (const app of appsInCategory) {
          const urlPart = app.url ? ` ${colors.dim}${app.url}${colors.reset}` : "";
          console.log(`  ${colors.bold}${app.name}${colors.reset} - ${app.desc || ""}${urlPart}`);
        }
        console.log("");
      }
    }
  }

  const TOTAL_STEPS = 5;

  // Step navigation loop
  while (currentStep >= 1) {
    // Step 1: Select app groups (categories)
    if (currentStep === 1) {
      log.step(`[Step 1 of ${TOTAL_STEPS}] Select ${installItemLabel} to install`);

      const categoryChoices: Array<{ name: string; value: string; checked: boolean; disabled?: string | false }> = [];

      for (const category of CATEGORY_ORDER) {
        const appsInCategory = selectableApps.filter(app => app.category === category);
        if (appsInCategory.length === 0) continue;

        const totalCount = appsInCategory.length;
        const installedCount = appsInCategory.filter(a => appStates.get(a.value) === "installed").length;
        const partialCount = appsInCategory.filter(a => appStates.get(a.value) === "partial").length;
        const allInstalled = installedCount === totalCount;
        const label = CATEGORY_LABELS[category];

        if (allInstalled && partialCount === 0) {
          categoryChoices.push({
            name: `${label} ${colors.green}(all ${totalCount} installed)${colors.reset}`,
            value: `__cat_${category}__`,
            checked: true,
            disabled: " ",
          });
        } else {
          const parts: string[] = [];
          if (installedCount > 0) parts.push(`${installedCount} installed`);
          if (partialCount > 0) parts.push(`${partialCount} partial`);
          const toInstall = totalCount - installedCount - partialCount;
          if (toInstall > 0) parts.push(`${toInstall} to install`);
          const status = parts.length > 0 ? ` ${colors.dim}(${parts.join(", ")})${colors.reset}` : "";
          const isPowerUser = category === "input";
          categoryChoices.push({
            name: isPowerUser ? `${label} ${colors.yellow}(power user)${colors.reset}${status}` : `${label}${status}`,
            value: `__cat_${category}__`,
            checked: !isPowerUser,
            disabled: false,
          });
        }
      }

      const selectedCats = await checkbox({
        message: `Select groups to install (space to toggle, enter when done)${colors.reset}:`,
        choices: categoryChoices,
        pageSize: 15,
        loop: false,
      });

      selectedApps = [];
      for (const app of selectableApps) {
        const catTag = `__cat_${app.category}__`;
        if (selectedCats.includes(catTag)) {
          selectedApps.push(app.value);
        } else if (appStates.get(app.value) === "installed" || appStates.get(app.value) === "partial") {
          // Keep already-installed apps selected even if category wasn't chosen
          selectedApps.push(app.value);
        }
      }

      console.log("");
      const toInstall = selectedApps.filter(a => appStates.get(a) !== "installed").length;
      log.success(`Selected ${selectedApps.length} ${installItemLabel} (${toInstall} to install)`);
      if (toInstall === 0) {
        log.info("All selected tools are already installed — proceed or go back to add more.");
      }

      const step1Nav = await select({
        message: "Next step?",
        choices: [
          { name: "Continue to step 2 (configs)", value: "next" as const },
          { name: "Back to main menu", value: "menu" as const },
        ],
      });

      if (step1Nav === "menu") {
        return mainMenu();
      }

      console.log("");
      currentStep = 2;
    }

    // Step 2: Select chezmoi-managed configs
    if (currentStep === 2) {
      log.step(`[Step 2 of ${TOTAL_STEPS}] Select configs to apply`);
      const managedChoices = selectableManagedConfigs.map((config) => {
          const installed = installedConfigs.has(config.value);
          const descPart = config.desc ? ` ${colors.dim}- ${config.desc}${colors.reset}` : "";
          return {
            name: installed 
              ? `${config.name}${descPart} ${colors.green}(installed)${colors.reset}` 
              : `${config.name}${descPart}`,
            value: config.value,
            checked: installed ? true : (config.checked ?? false),
            disabled: installed ? "(already installed)" : false,
          };
        });
      
      selectedManagedConfigs = await checkbox({
        message: `Select configs to install (space to toggle, enter when done — you can go back after) ${colors.dim}[${managedChoices.length} items]${colors.reset}:`,
        choices: managedChoices,
        pageSize: 20,
        loop: false,
      });

      console.log("");
      const step2Nav = await select({
        message: "Next step?",
        choices: [
          { name: "Continue to step 3 (optional features)", value: "next" as const },
          { name: "Back to step 1 (apps)", value: "back" as const },
        ],
      });

      if (step2Nav === "back") {
        currentStep = 1;
        continue;
      }

      currentStep = 3;
    }

    // Step 3: Select optional features
    if (currentStep === 3) {
      log.step(`[Step 3 of ${TOTAL_STEPS}] Select optional features`);
      const featureChoices = OPTIONAL_FEATURES.map((feature) => ({
          name: feature.desc ? `${feature.name} ${colors.dim}- ${feature.desc}${colors.reset}` : feature.name,
          value: feature.value,
          checked: feature.checked ?? false,
          disabled: false,
        }));

      selectedFeatures = await checkbox({
        message: `Select optional features (space to toggle, enter when done — you can go back after) ${colors.dim}[${featureChoices.length} items]${colors.reset}:`,
        choices: featureChoices,
        pageSize: 20,
        loop: false,
      });

      console.log("");
      const step3Nav = await select({
        message: "Next step?",
        choices: [
          { name: "Continue to step 4 (review selections)", value: "next" as const },
          { name: "Back to step 2 (configs)", value: "back" as const },
        ],
      });

      if (step3Nav === "back") {
        currentStep = 2;
        continue;
      }

      currentStep = 4;
    }

    // Step 4: Recap and confirm
    if (currentStep === 4) {
      const autoSelectedAppConfigs = selectedApps
        .filter((app) => {
          const appDef = APPS.find((a) => a.value === app);
          return appDef?.configs && appDef.configs.length > 0;
        })
        .flatMap((app) => APPS.find((a) => a.value === app)?.configs ?? []);

      const managedConfigValues = new Set(MANAGED_CONFIGS.map((config) => config.value));
      const autoSelectedManagedConfigs = autoSelectedAppConfigs.filter((config) => managedConfigValues.has(config));
      selectedManagedConfigs = [...new Set([...selectedManagedConfigs, ...autoSelectedManagedConfigs])];

      // Auto-select AI configs based on app selection
      const autoSelectedAIConfigs = autoSelectedAppConfigs.filter((config) => AI_CONFIGS[config]);

      aiConfigs = [...new Set(autoSelectedAIConfigs)];

      // Show recap screen
      log.step(`[Step 4 of ${TOTAL_STEPS}] Review your selections`);
      console.log("");

      // Count what will actually be installed (not already installed)
      const appsToInstallCount = selectedApps.filter(app => {
        const state = appStates.get(app);
        return state === "not_installed" || state === "partial";
      }).length;
      const configsToInstallCount = selectedManagedConfigs.filter(c => !installedConfigs.has(c)).length;

      // Apps summary
      console.log(`  ${colors.bold}${installItemLabel[0].toUpperCase() + installItemLabel.slice(1)}:${colors.reset} ${selectedApps.length} selected (${appsToInstallCount} to install)`);
      if (selectedApps.length > 0) {
        // Group by category for display
        for (const category of CATEGORY_ORDER) {
          const appsInCat = selectedApps
            .map(v => APPS.find(a => a.value === v))
            .filter((a): a is App => a !== undefined && a.category === category);
          if (appsInCat.length > 0) {
            console.log(`    ${colors.dim}${CATEGORY_LABELS[category]}:${colors.reset} ${appsInCat.map(a => a.name).join(", ")}`);
          }
        }
      }

      const manualDownloadApps = getManualDownloadApps(selectedApps);
      if (manualDownloadApps.length > 0) {
        console.log("");
        printManualDownloadApps(manualDownloadApps);
      }

      // Configs summary
      console.log(`  ${colors.bold}Configs:${colors.reset} ${selectedManagedConfigs.length} selected (${configsToInstallCount} to install)`);
      if (selectedManagedConfigs.length > 0) {
        const configNames = selectedManagedConfigs
          .map(v => MANAGED_CONFIGS.find(c => c.value === v)?.name)
          .filter(Boolean)
          .join(", ");
        console.log(`    ${colors.dim}${configNames}${colors.reset}`);
      }

      // Features summary
      console.log(`  ${colors.bold}Features:${colors.reset} ${selectedFeatures.length} selected`);
      if (selectedFeatures.length > 0) {
        const featureNames = selectedFeatures
          .map(v => OPTIONAL_FEATURES.find(f => f.value === v)?.name)
          .filter(Boolean)
          .join(", ");
        console.log(`    ${colors.dim}${featureNames}${colors.reset}`);
      }

      // AI configs (auto-selected)
      if (aiConfigs.length > 0) {
        console.log(`  ${colors.bold}AI Configs:${colors.reset} ${aiConfigs.length} auto-selected`);
        console.log(`    ${colors.dim}${aiConfigs.map(c => AI_CONFIGS[c]?.name).join(", ")}${colors.reset}`);
      }

      console.log("");
      console.log(`  ${colors.bold}Will modify or create:${colors.reset}`);
      printPathList(
        [
          ...selectedManagedTargetPaths(selectedManagedConfigs),
          ...selectedAIConfigPaths(aiConfigs),
          manifest.getManifestPath(),
        ],
        "No file changes selected"
      );

      const skippedConfigs = selectableManagedConfigs
        .filter((config) => !selectedManagedConfigs.includes(config.value))
        .map((config) => config.name);
      if (skippedConfigs.length > 0) {
        console.log(`  ${colors.bold}Will not touch:${colors.reset}`);
        console.log(`    ${colors.dim}${skippedConfigs.join(", ")}${colors.reset}`);
      }

      console.log(`  ${colors.bold}Backups:${colors.reset}`);
      console.log(`    ${colors.dim}Guided setup backs up managed files before optional replacements.${colors.reset}`);
      console.log(`    ${colors.dim}Restore later with: bb setup revert${colors.reset}`);

      if (appsToInstallCount === 0 && configsToInstallCount === 0 && aiConfigs.length === 0) {
        console.log(`  ${colors.bold}Already installed:${colors.reset}`);
        console.log(`    ${colors.dim}Selected apps/configs already appear to be present; setup will refresh the manifest and shell checks.${colors.reset}`);
      }

      console.log("");

      const proceed = await confirm({
        message: "Apply these installs and file changes?",
        default: true,
      });

      if (!proceed) {
        const goBack = await confirm({
          message: "Go back to edit selections?",
          default: true,
        });

        if (goBack) {
          console.log("");
          currentStep = 3;
          continue;
        } else {
          console.log("Aborted.");
          process.exit(0);
        }
      }

      console.log("");
      currentStep = 5;
    }

    // Step 5: Install everything
    if (currentStep === 5) {
      break;
    }
  }

  // Step 5: Install everything
  log.step(`[Step 5 of ${TOTAL_STEPS}] Installing...`);
  console.log("");

  // Filter: include apps that are not_installed OR partial (need deps)
  const appsToInstall = selectedApps.filter((app) => {
    const state = appStates.get(app);
    return state === "not_installed" || state === "partial";
  });
  const configsToInstall = selectedManagedConfigs.filter((config) => !installedConfigs.has(config));

  if (appsToInstall.length === 0 && configsToInstall.length === 0 && aiConfigs.length === 0) {
    log.success("Everything is already installed!");
  } else {
    await installApps(appsToInstall);
    console.log("");

    await setupManagedConfigs(configsToInstall);
    console.log("");

    await setupAIConfigs(aiConfigs);
  }

  await maybeSetDefaultShellToZsh(selectedManagedConfigs);
  console.log("");

  await maybeLoginGhCli(selectedApps);

  // Save setup manifest (tracks what user selected for features)
  const setupManifest = manifest.getEmptyManifest();
  manifest.setInstalledApps(setupManifest, selectedApps);
  manifest.setInstalledConfigs(setupManifest, selectedManagedConfigs);
  manifest.setFeatures(
    setupManifest,
    selectedFeatures.reduce((acc, feature) => {
      acc[feature] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );
  manifest.saveManifest(setupManifest);
  log.success(`Setup manifest saved to ${manifest.getManifestPath()}`);

  // Done!
  console.log("");
  console.log(`${colors.green}${colors.bold}✅ Your dotfiles are set up!${colors.reset}`);
  console.log("");
  
  console.log(`  ${colors.bold}Next steps:${colors.reset}`);
  console.log(`  1. ${colors.cyan}exec zsh${colors.reset} (or open a new terminal)`);
  console.log(`  2. Try the dotfiles helper: ${colors.cyan}bb help${colors.reset}`);
  console.log(`  3. Change or restore setup later: ${colors.cyan}bb setup${colors.reset}`);
  console.log("");

  const bootstrapCommand = getCurrentPlatform() === "linux" ? "./bootstrap-linux.sh" : "./bootstrap.sh";
  console.log(`${colors.dim}  To update manually: cd ${DOTFILES_DIR} && git pull && ${bootstrapCommand}${colors.reset}`);
  console.log(`${colors.dim}  Setup manifest: ${manifest.getManifestPath()}${colors.reset}`);
}

async function main(): Promise<void> {
  try {
    console.log("");
    const action = process.argv[2];
    if (action === "menu") {
      await mainMenu();
    } else if (action === "merge") {
      await runMergeMode();
    } else if (action === "revert") {
      await revertBackups();
    } else {
      await runSetup();
    }
  } catch (error) {
    if ((error as Error).name === "ExitPromptError") {
      console.log("\nAborted.");
      process.exit(0);
    }
    throw error;
  }
}

main().catch(console.error);
