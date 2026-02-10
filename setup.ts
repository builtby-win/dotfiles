#!/usr/bin/env npx tsx
import { checkbox, select, confirm } from "@inquirer/prompts";
import { execSync } from "child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, renameSync, lstatSync, readlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import * as manifest from "./lib/manifest";

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

  // Detect installed stow configs using existing isStowConfigInstalled
  for (const config of STOW_CONFIGS) {
    if (isStowConfigInstalled(config.value)) {
      detected.configs.push(config.value);
    }
  }

  // Detect beads feature - check if beads.sh is sourced in user's shell config
  detected.features.beads = isBeadsFeatureActive();

  return detected;
}

/**
 * Check if beads feature is currently active in user's shell config.
 * Conservative: returns true only if we find explicit evidence.
 */
function isBeadsFeatureActive(): boolean {
  const HOME = homedir();
  
  // Check 1: Does ~/.zshrc source beads.sh from our dotfiles?
  const zshrcPath = join(HOME, ".zshrc");
  if (existsSync(zshrcPath)) {
    try {
      const content = readFileSync(zshrcPath, "utf-8");
      // Check if it sources our init.sh which would load beads
      if (content.includes("beads.sh") || content.includes("beads")) {
        // But also check if there's a manifest with beads enabled already
        // (this handles the case where they ran setup before but manifest got deleted)
        return true;
      }
    } catch {
      // Can't read, assume no
    }
  }

  // Check 2: Is the beads command available? (npm package installed)
  try {
    execSync("command -v bd", { stdio: "pipe", encoding: "utf-8" });
    return true;
  } catch {
    // Not installed
  }

  // Check 3: Does ~/.global-todos exist? (beads global repo)
  const globalTodosPath = join(HOME, ".global-todos");
  if (existsSync(globalTodosPath)) {
    return true;
  }

  return false;
}

/**
 * Check if setup manifest already exists.
 */
function manifestExists(): boolean {
  const manifestPath = manifest.getManifestPath();
  return existsSync(manifestPath);
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

// ============================================
// Merge/Diff Utilities
// ============================================

interface ParsedSection {
  name: string;
  type: "alias" | "function" | "export" | "comment" | "code" | "conditional";
  content: string;
  description?: string;
}

// Parse shell file into logical sections
function parseShellFile(content: string): ParsedSection[] {
  const lines = content.split("\n");
  const sections: ParsedSection[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Comment block (potential section header)
    if (trimmed.startsWith("#") && !trimmed.startsWith("#!")) {
      // Collect consecutive comments
      let commentBlock = line + "\n";
      let description = trimmed.replace(/^#\s*/, "");
      i++;
      while (i < lines.length && lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("#!")) {
        commentBlock += lines[i] + "\n";
        i++;
      }
      // Check if followed by code
      if (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith("#")) {
        // This comment is a header for the next section, continue to parse that
        continue;
      }
      sections.push({
        name: description.slice(0, 50),
        type: "comment",
        content: commentBlock.trimEnd(),
        description,
      });
      continue;
    }

    // Alias definition
    if (trimmed.startsWith("alias ")) {
      const aliasMatch = trimmed.match(/^alias\s+([\w-]+)=/);
      if (aliasMatch) {
        sections.push({
          name: aliasMatch[1],
          type: "alias",
          content: line,
          description: `Alias: ${aliasMatch[1]}`,
        });
      }
      i++;
      continue;
    }

    // Export/environment variable
    if (trimmed.startsWith("export ")) {
      const exportMatch = trimmed.match(/^export\s+(\w+)=/);
      if (exportMatch) {
        sections.push({
          name: exportMatch[1],
          type: "export",
          content: line,
          description: `Environment: ${exportMatch[1]}`,
        });
      }
      i++;
      continue;
    }

    // Function definition (name() { or function name {)
    const funcMatch = trimmed.match(/^(\w+)\s*\(\)\s*\{/) || trimmed.match(/^function\s+(\w+)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      let funcContent = line + "\n";
      let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      i++;
      while (i < lines.length && braceCount > 0) {
        funcContent += lines[i] + "\n";
        braceCount += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
        i++;
      }
      sections.push({
        name: funcName,
        type: "function",
        content: funcContent.trimEnd(),
        description: `Function: ${funcName}()`,
      });
      continue;
    }

    // Conditional block (if/case)
    if (trimmed.startsWith("if ") || trimmed.startsWith("case ")) {
      let blockContent = line + "\n";
      let depth = 1;
      const isIf = trimmed.startsWith("if ");
      i++;
      while (i < lines.length && depth > 0) {
        const currentLine = lines[i];
        const currentTrimmed = currentLine.trim();
        if (isIf) {
          if (currentTrimmed.startsWith("if ")) depth++;
          if (currentTrimmed === "fi") depth--;
        } else {
          if (currentTrimmed.startsWith("case ")) depth++;
          if (currentTrimmed === "esac") depth--;
        }
        blockContent += currentLine + "\n";
        i++;
      }
      const desc = trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : "");
      sections.push({
        name: desc,
        type: "conditional",
        content: blockContent.trimEnd(),
        description: `Conditional: ${desc}`,
      });
      continue;
    }

    // Other code lines - group them together
    let codeBlock = line + "\n";
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      // Stop at comments, functions, aliases, exports, or conditionals
      if (nextTrimmed.startsWith("#") ||
          nextTrimmed.startsWith("alias ") ||
          nextTrimmed.startsWith("export ") ||
          nextTrimmed.match(/^\w+\s*\(\)\s*\{/) ||
          nextTrimmed.match(/^function\s+\w+/) ||
          nextTrimmed.startsWith("if ") ||
          nextTrimmed.startsWith("case ") ||
          !nextTrimmed) {
        break;
      }
      codeBlock += nextLine + "\n";
      i++;
    }
    sections.push({
      name: trimmed.slice(0, 40),
      type: "code",
      content: codeBlock.trimEnd(),
      description: "Code block",
    });
  }

  return sections;
}

// Generate a simple diff between two strings
function generateDiff(userContent: string, dotfilesContent: string): string {
  const userLines = userContent.split("\n");
  const dotfilesLines = dotfilesContent.split("\n");
  const diff: string[] = [];

  // Simple line-by-line comparison for display
  const maxLen = Math.max(userLines.length, dotfilesLines.length);

  for (let i = 0; i < maxLen; i++) {
    const userLine = userLines[i];
    const dotfilesLine = dotfilesLines[i];

    if (userLine === dotfilesLine) {
      diff.push(`  ${userLine ?? ""}`);
    } else if (userLine === undefined) {
      diff.push(`${colors.green}+ ${dotfilesLine}${colors.reset}`);
    } else if (dotfilesLine === undefined) {
      diff.push(`${colors.red}- ${userLine}${colors.reset}`);
    } else {
      diff.push(`${colors.red}- ${userLine}${colors.reset}`);
      diff.push(`${colors.green}+ ${dotfilesLine}${colors.reset}`);
    }
  }

  return diff.join("\n");
}

// Find items in dotfiles that don't exist in user's config
function findNewSections(userSections: ParsedSection[], dotfilesSections: ParsedSection[]): ParsedSection[] {
  const userNames = new Set(userSections.map(s => s.name.toLowerCase()));
  return dotfilesSections.filter(s => !userNames.has(s.name.toLowerCase()));
}

// Find items that exist in both but are different
function findConflictingSections(userSections: ParsedSection[], dotfilesSections: ParsedSection[]): { user: ParsedSection; dotfiles: ParsedSection }[] {
  const conflicts: { user: ParsedSection; dotfiles: ParsedSection }[] = [];

  for (const dotSection of dotfilesSections) {
    const userSection = userSections.find(s => s.name.toLowerCase() === dotSection.name.toLowerCase() && s.type === dotSection.type);
    if (userSection && userSection.content !== dotSection.content) {
      conflicts.push({ user: userSection, dotfiles: dotSection });
    }
  }

  return conflicts;
}

// Marker for dotfiles additions
const DOTFILES_MARKER_START = "# === Added from builtby.win/dotfiles ===";
const DOTFILES_MARKER_END = "# === End builtby.win/dotfiles ===";

// Append sections to a file with markers
function appendSectionsToFile(filePath: string, sections: ParsedSection[]): void {
  if (sections.length === 0) return;

  let content = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";

  // Remove existing dotfiles additions if present
  const startIdx = content.indexOf(DOTFILES_MARKER_START);
  const endIdx = content.indexOf(DOTFILES_MARKER_END);
  if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + content.slice(endIdx + DOTFILES_MARKER_END.length);
  }

  // Ensure file ends with newline
  if (content && !content.endsWith("\n")) {
    content += "\n";
  }

  // Add new sections
  content += "\n" + DOTFILES_MARKER_START + "\n";
  for (const section of sections) {
    content += section.content + "\n\n";
  }
  content += DOTFILES_MARKER_END + "\n";

  writeFileSync(filePath, content);
}

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
  configs?: string[];
  checked?: boolean;
  dependencies?: string[]; // Other brew packages to install alongside
  detectCmd?: string;      // Custom command to check if installed (e.g., "command -v claude")
  detectPath?: string;     // Custom path to check if exists (e.g., "/Applications/App.app")
  desc?: string;           // Short description for info display
  url?: string;            // Project URL
  platforms?: PlatformSupport; // Platform support (default: all platforms)
  category: AppCategory;   // Category for grouped display
}

const APPS: App[] = [
  // CLI Tools
  { name: "tmux", value: "tmux", brewName: "tmux", checked: true, dependencies: ["sesh", "fzf"], desc: "Terminal multiplexer - split panes, sessions", url: "https://github.com/tmux/tmux", platforms: { macos: true, linux: true, windows: false }, category: "cli" },
  { name: "fzf", value: "fzf", brewName: "fzf", desc: "Fuzzy finder for files, history, and more", url: "https://github.com/junegunn/fzf", category: "cli" },
  { name: "ripgrep", value: "ripgrep", brewName: "ripgrep", desc: "Blazing fast grep replacement", url: "https://github.com/BurntSushi/ripgrep", category: "cli" },
  { name: "bat", value: "bat", brewName: "bat", desc: "cat with syntax highlighting", url: "https://github.com/sharkdp/bat", category: "cli" },
  { name: "eza", value: "eza", brewName: "eza", desc: "Modern ls with colors and icons", url: "https://github.com/eza-community/eza", category: "cli" },
  { name: "zoxide", value: "zoxide", brewName: "zoxide", desc: "Smarter cd that learns your habits", url: "https://github.com/ajeetdsouza/zoxide", category: "cli" },
  { name: "starship", value: "starship", brewName: "starship", checked: true, desc: "Fast, customizable shell prompt", url: "https://starship.rs", category: "cli" },

  // Terminals & Editors
  { name: "Ghostty", value: "ghostty", brewName: "ghostty", cask: true, checked: true, detectPath: "/Applications/Ghostty.app", desc: "GPU-accelerated terminal by Mitchell Hashimoto", url: "https://ghostty.org", platforms: { macos: true, linux: true, windows: false }, category: "terminals" },
  { name: "Visual Studio Code", value: "vscode", brewName: "visual-studio-code", cask: true, checked: true, detectPath: "/Applications/Visual Studio Code.app", desc: "Popular code editor by Microsoft", url: "https://code.visualstudio.com", category: "terminals" },
  { name: "Cursor", value: "cursor", brewName: "cursor", cask: true, configs: ["cursor"], checked: false, detectPath: "/Applications/Cursor.app", desc: "AI-first code editor (VS Code fork)", url: "https://cursor.sh", category: "terminals" },

  // AI Tools
  { name: "Claude Code", value: "claude", brewName: "claude", configs: ["claude"], checked: false, detectCmd: "command -v claude", desc: "Anthropic's AI coding assistant for terminal", url: "https://docs.anthropic.com/en/docs/claude-code", category: "ai" },
  { name: "Codex CLI", value: "codex", brewName: "", configs: ["codex"], checked: false, detectCmd: "command -v codex", desc: "OpenAI's coding assistant CLI", url: "https://github.com/openai/codex", category: "ai" },

  // Productivity (macOS only)
  { name: "Raycast", value: "raycast", brewName: "raycast", cask: true, checked: true, detectPath: "/Applications/Raycast.app", desc: "Spotlight replacement with extensions", url: "https://raycast.com", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "AltTab", value: "alttab", brewName: "alt-tab", cask: true, detectPath: "/Applications/AltTab.app", desc: "Windows-style alt-tab window switcher", url: "https://alt-tab-macos.netlify.app", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "Ice", value: "ice", brewName: "jordanbaird-ice", cask: true, detectPath: "/Applications/Ice.app", desc: "Menu bar management - hide icons", url: "https://github.com/jordanbaird/Ice", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
  { name: "BetterTouchTool", value: "bettertouchtool", brewName: "bettertouchtool", cask: true, detectPath: "/Applications/BetterTouchTool.app", desc: "Customize trackpad, keyboard, and Touch Bar", url: "https://folivora.ai", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },

  // Input (macOS only)
  { name: "Hammerspoon", value: "hammerspoon", brewName: "hammerspoon", cask: true, detectPath: "/Applications/Hammerspoon.app", desc: "Lua automation and system hotkeys for macOS", url: "https://www.hammerspoon.org", platforms: { macos: true, windows: false, linux: false }, category: "input" },
  { name: "Karabiner Elements", value: "karabiner-elements", brewName: "karabiner-elements", cask: true, detectPath: "/Applications/Karabiner-Elements.app", desc: "Powerful keyboard customization", url: "https://karabiner-elements.pqrs.org", platforms: { macos: true, windows: false, linux: false }, category: "input" },
  { name: "LinearMouse", value: "linearmouse", brewName: "linearmouse", cask: true, detectPath: "/Applications/LinearMouse.app", desc: "Mouse and trackpad customization", url: "https://linearmouse.app", platforms: { macos: true, windows: false, linux: false }, category: "input" },

  // Security (cross-platform)
  { name: "Bitwarden", value: "bitwarden", brewName: "bitwarden", cask: true, detectPath: "/Applications/Bitwarden.app", desc: "Open source password manager", url: "https://bitwarden.com", category: "security" },

  // Browsers (cross-platform except Orion)
  { name: "Google Chrome", value: "chrome", brewName: "google-chrome", cask: true, detectPath: "/Applications/Google Chrome.app", desc: "Google's web browser", url: "https://google.com/chrome", category: "browsers" },
  { name: "Arc", value: "arc", brewName: "arc", cask: true, detectPath: "/Applications/Arc.app", desc: "Modern browser with spaces & profiles", url: "https://arc.net", platforms: { macos: true, windows: true, linux: false }, category: "browsers" },
  { name: "Orion", value: "orion", brewName: "orion", cask: true, detectPath: "/Applications/Orion.app", desc: "WebKit browser with Chrome/Firefox extension support", url: "https://browser.kagi.com", platforms: { macos: true, windows: false, linux: false }, category: "browsers" },

  // Dev Tools (cross-platform)
  { name: "Docker", value: "docker", brewName: "docker", cask: true, detectPath: "/Applications/Docker.app", desc: "Container runtime for development", url: "https://docker.com", category: "devtools" },
  { name: "Figma", value: "figma", brewName: "figma", cask: true, detectPath: "/Applications/Figma.app", desc: "Collaborative design tool", url: "https://figma.com", category: "devtools" },
  { name: "Discord", value: "discord", brewName: "discord", cask: true, detectPath: "/Applications/Discord.app", desc: "Chat for communities", url: "https://discord.com", category: "devtools" },
];

// Stow-managed configs
interface StowConfig {
  name: string;
  value: string;
  checked?: boolean;
  platforms?: PlatformSupport;
  desc?: string;
}

const STOW_CONFIGS: StowConfig[] = [
  { name: "Shell config", value: "zsh", checked: true, desc: "zinit plugins, starship prompt, aliases, PATH setup" },
  { name: "Tmux", value: "tmux", checked: true, platforms: { macos: true, linux: true, windows: false }, desc: "vim-style bindings, mouse support, sesh integration" },
  { name: "Hammerspoon", value: "hammerspoon", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "Hyper app launcher and Ghostty automation" },
  { name: "Karabiner Elements", value: "karabiner", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "Caps Lock → Escape/Ctrl, keyboard customization" },
  { name: "Ghostty", value: "ghostty", checked: true, platforms: { macos: true, linux: true, windows: false }, desc: "Font, theme, keybindings for GPU terminal" },
  { name: "Mackup", value: "mackup", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "Sync app settings to iCloud/Dropbox" },
];

// Optional features (opt-in, don't load in shell unless selected)
const OPTIONAL_FEATURES = [
  { 
    name: "Beads (Global Task Manager)", 
    value: "beads", 
    checked: false,
    desc: "Global task aggregation across repositories - organize tasks from multiple projects"
  },
  {
    name: "Shell Tips (Daily)",
    value: "tips",
    checked: true,
    desc: "Show a short dotfiles tip once per day when the shell starts"
  },
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

type LinuxPackageManager = "apt" | "dnf" | "pacman";

let linuxPackageManagerCache: LinuxPackageManager | null | undefined = undefined;
let aptUpdated = false;

const LINUX_PACKAGE_NAME_OVERRIDES: Record<string, Partial<Record<LinuxPackageManager, string>>> = {
  "visual-studio-code": { apt: "code", dnf: "code", pacman: "code" },
  "google-chrome": { apt: "google-chrome-stable", dnf: "google-chrome-stable", pacman: "google-chrome" },
};

function getLinuxPackageManager(): LinuxPackageManager | null {
  if (linuxPackageManagerCache !== undefined) return linuxPackageManagerCache;

  if (runCommand("command -v apt-get", true)) {
    linuxPackageManagerCache = "apt";
  } else if (runCommand("command -v dnf", true)) {
    linuxPackageManagerCache = "dnf";
  } else if (runCommand("command -v pacman", true)) {
    linuxPackageManagerCache = "pacman";
  } else {
    linuxPackageManagerCache = null;
  }

  return linuxPackageManagerCache;
}

function getLinuxPackageName(name: string): string | null {
  const manager = getLinuxPackageManager();
  if (!manager) return null;

  const override = LINUX_PACKAGE_NAME_OVERRIDES[name]?.[manager];
  if (override) return override;
  return name;
}

// Cache for installed package manager data (populated once, used many times)
let installedFormulasCache: Set<string> | null = null;
let installedCasksCache: Set<string> | null = null;
let installedLinuxPackagesCache: Set<string> | null = null;

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
  if (installedLinuxPackagesCache) return installedLinuxPackagesCache;

  if (getCurrentPlatform() !== "linux") {
    installedLinuxPackagesCache = new Set();
    return installedLinuxPackagesCache;
  }

  const manager = getLinuxPackageManager();
  if (!manager) {
    installedLinuxPackagesCache = new Set();
    return installedLinuxPackagesCache;
  }

  try {
    const command = manager === "apt"
      ? "dpkg-query -W -f='${binary:Package}\n'"
      : manager === "dnf"
        ? "rpm -qa --qf '%{NAME}\n'"
        : "pacman -Qq";
    const output = execSync(command, { encoding: "utf-8" });
    installedLinuxPackagesCache = new Set(output.trim().split("\n").filter(Boolean));
  } catch {
    installedLinuxPackagesCache = new Set();
  }

  return installedLinuxPackagesCache;
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
        // Read the symlink path itself, not the file content
        const linkPath = readlinkSync(targetPath);
        return linkPath.includes("builtby.win/dotfiles") || linkPath.includes("stow-packages");
      }
    } catch {
      // Not our symlink
    }
    return false;
  });
}

function installLinuxPackages(packages: string[]): boolean {
  const manager = getLinuxPackageManager();
  if (!manager) {
    log.warning("No supported Linux package manager found (need apt, dnf, or pacman)");
    return false;
  }

  const normalizedPackages = [...new Set(packages.filter(Boolean))];
  if (normalizedPackages.length === 0) return true;

  if (manager === "apt" && !aptUpdated) {
    if (!runCommand("sudo apt-get update")) {
      return false;
    }
    aptUpdated = true;
  }

  const command = manager === "apt"
    ? `sudo apt-get install -y ${normalizedPackages.join(" ")}`
    : manager === "dnf"
      ? `sudo dnf install -y ${normalizedPackages.join(" ")}`
      : `sudo pacman -S --noconfirm --needed ${normalizedPackages.join(" ")}`;

  if (runCommand(command)) {
    installedLinuxPackagesCache = null;
    return true;
  }

  return false;
}

function installPackage(name: string, cask = false): boolean {
  const platform = getCurrentPlatform();

  if (platform === "linux") {
    const linuxPackage = getLinuxPackageName(name);
    if (!linuxPackage) {
      log.warning(`No Linux package mapping for ${name}`);
      return false;
    }

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

async function installApps(apps: string[]): Promise<void> {
  if (apps.length === 0) return;

  const appsToInstall = APPS.filter((a) => apps.includes(a.value) && a.brewName);
  if (appsToInstall.length === 0) return;

  const platform = getCurrentPlatform();
  if (platform === "linux") {
    const manager = getLinuxPackageManager();
    log.step(`Installing apps via ${manager ?? "Linux package manager"}...`);
  } else {
    log.step("Installing apps via Homebrew...");
  }

  for (const app of appsToInstall) {
    installPackage(app.brewName, app.cask);

    // Install dependencies
    if (app.dependencies) {
      for (const dep of app.dependencies) {
        installPackage(dep);
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

  if (getCurrentPlatform() === "linux") {
    log.info("Installing stow via Linux package manager...");
    if (installLinuxPackages(["stow"])) {
      log.success("stow installed");
      return true;
    }
    log.error("Failed to install stow via Linux package manager");
    return false;
  }

  log.info("Installing stow via Homebrew...");
  if (installPackage("stow")) {
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
  hammerspoon: [".hammerspoon/init.lua"],
  karabiner: [".config/karabiner/karabiner.json"],
  ghostty: process.platform === "darwin"
    ? [
        ".config/ghostty/config",
        "Library/Application Support/com.mitchellh.ghostty/config",
      ]
    : [".config/ghostty/config"],
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
            const linkPath = readlinkSync(targetPath);
            if (linkPath.includes("builtby.win/dotfiles") || linkPath.includes(DOTFILES_DIR)) {
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
  console.log(`    ${colors.dim}https://back2vibing.builtby.win${colors.reset}`);
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
    description: "Vim-style bindings, mouse support, better splits",
    userPath: join(HOME, ".tmux.conf"),
    dotfilesPath: join(DOTFILES_DIR, "stow-packages", "tmux", ".tmux.conf"),
    type: "config",
  },
  {
    name: "Starship Prompt",
    description: "Fast, customizable shell prompt configuration",
    userPath: join(HOME, ".config", "starship.toml"),
    dotfilesPath: join(DOTFILES_DIR, "stow-packages", "zsh", ".config", "starship.toml"),
    type: "config",
  },
  {
    name: "Ghostty Terminal",
    description: "GPU-accelerated terminal configuration",
    userPath: process.platform === "darwin"
      ? join(HOME, "Library", "Application Support", "com.mitchellh.ghostty", "config")
      : join(HOME, ".config", "ghostty", "config"),
    dotfilesPath: process.platform === "darwin"
      ? join(DOTFILES_DIR, "stow-packages", "ghostty", "Library", "Application Support", "com.mitchellh.ghostty", "config")
      : join(DOTFILES_DIR, "stow-packages", "ghostty", ".config", "ghostty", "config"),
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
  const platformStowConfigs = STOW_CONFIGS.filter(config => isPlatformSupported(config.platforms, currentPlatform));

  // Check what's already installed
  log.step("Checking installed apps...");
  const appStates = new Map<string, AppInstallState>();
  const installedConfigs = new Set<string>();

  for (const app of platformApps) {
    appStates.set(app.value, getAppInstallState(app));
  }

  for (const config of platformStowConfigs) {
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

  // ============================================
  // Auto-Detection for First Run (No Manifest)
  // ============================================
  let selectedApps: string[] = [];
  let selectedStowConfigs: string[] = [];
  let selectedFeatures: string[] = [];
  let aiConfigs: string[] = [];
  let currentStep = 1;
  let skipToRecap = false;

  if (!manifestExists()) {
    // First run - detect what's already installed
    const detected = autoDetectExistingSetup();
    const detectedAppsOnPlatform = detected.apps.filter(a => platformApps.some(p => p.value === a));
    const detectedConfigsOnPlatform = detected.configs.filter(c => platformStowConfigs.some(p => p.value === c));
    const detectedFeaturesList = Object.entries(detected.features).filter(([_, v]) => v).map(([k]) => k);

    const hasDetectedItems = detectedAppsOnPlatform.length > 0 || 
                             detectedConfigsOnPlatform.length > 0 || 
                             detectedFeaturesList.length > 0;

    if (hasDetectedItems) {
      console.log(`${colors.cyan}${colors.bold}🔍 First run detected - found existing setup:${colors.reset}`);
      console.log("");

      // Show detected apps
      if (detectedAppsOnPlatform.length > 0) {
        console.log(`  ${colors.bold}Apps already installed:${colors.reset} ${detectedAppsOnPlatform.length}`);
        const appNames = detectedAppsOnPlatform
          .map(v => APPS.find(a => a.value === v)?.name)
          .filter(Boolean)
          .join(", ");
        console.log(`    ${colors.dim}${appNames}${colors.reset}`);
      }

      // Show detected configs
      if (detectedConfigsOnPlatform.length > 0) {
        console.log(`  ${colors.bold}Configs already linked:${colors.reset} ${detectedConfigsOnPlatform.length}`);
        const configNames = detectedConfigsOnPlatform
          .map(v => STOW_CONFIGS.find(c => c.value === v)?.name)
          .filter(Boolean)
          .join(", ");
        console.log(`    ${colors.dim}${configNames}${colors.reset}`);
      }

      // Show detected features
      if (detectedFeaturesList.length > 0) {
        console.log(`  ${colors.bold}Features detected:${colors.reset} ${detectedFeaturesList.length}`);
        const featureNames = detectedFeaturesList
          .map(v => OPTIONAL_FEATURES.find(f => f.value === v)?.name || v)
          .join(", ");
        console.log(`    ${colors.dim}${featureNames}${colors.reset}`);
      }

      console.log("");

      const useDetected = await select({
        message: "Should I use these as your settings?",
        choices: [
          { name: "Yes, use detected settings", value: "use" },
          { name: "Let me customize", value: "customize" },
        ],
      });

      if (useDetected === "use") {
        // Pre-populate selections with detected items
        selectedApps = detectedAppsOnPlatform;
        selectedStowConfigs = detectedConfigsOnPlatform;
        selectedFeatures = detectedFeaturesList;
        skipToRecap = true;
        currentStep = 4; // Jump to recap step
        console.log("");
        log.success("Using detected settings");
        console.log("");
      } else {
        console.log("");
        log.info("Proceeding to manual selection...");
        console.log("");
      }
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
      console.log(`${colors.cyan}${colors.bold}=== CLI Tools ===${colors.reset}`);
      for (const app of platformApps.filter(a => !a.cask)) {
        const urlPart = app.url ? ` ${colors.dim}${app.url}${colors.reset}` : "";
        console.log(`  ${colors.bold}${app.name}${colors.reset} - ${app.desc || ""}${urlPart}`);
      }
      console.log("");
      console.log(`${colors.cyan}${colors.bold}=== Apps ===${colors.reset}`);
      for (const app of platformApps.filter(a => a.cask)) {
        const urlPart = app.url ? ` ${colors.dim}${app.url}${colors.reset}` : "";
        console.log(`  ${colors.bold}${app.name}${colors.reset} - ${app.desc || ""}${urlPart}`);
      }
      console.log("");
    }
  }

  // Helper: Build categorized choices for apps
  const buildCategorizedAppChoices = () => {
    const choices: Array<{ name: string; value: string; checked: boolean; disabled?: string | false }> = [
      {
        name: `${colors.yellow}↩ Back to menu${colors.reset}`,
        value: "__back__",
        checked: false,
      },
    ];

    // Group apps by category
    for (const category of CATEGORY_ORDER) {
      const appsInCategory = platformApps.filter(app => app.category === category);
      if (appsInCategory.length === 0) continue;

      // Add category separator
      choices.push({
        name: `${colors.cyan}─── ${CATEGORY_LABELS[category]} ───${colors.reset}`,
        value: `__separator_${category}__`,
        checked: false,
        disabled: " ",
      });

      // Add apps in this category
      for (const app of appsInCategory) {
        const state = appStates.get(app.value) ?? "not_installed";
        const descPart = app.desc ? ` ${colors.dim}- ${app.desc}${colors.reset}` : "";
        if (state === "installed") {
          choices.push({
            name: `${app.name}${descPart} ${colors.green}(installed)${colors.reset}`,
            value: app.value,
            checked: true,
            disabled: "(already installed)",
          });
        } else if (state === "partial") {
          choices.push({
            name: `${app.name}${descPart} ${colors.green}(installed)${colors.reset} ${colors.yellow}(missing extras)${colors.reset}`,
            value: app.value,
            checked: true,
            disabled: false,
          });
        } else {
          choices.push({
            name: `${app.name}${descPart}`,
            value: app.value,
            checked: app.checked ?? false,
            disabled: false,
          });
        }
      }
    }

    return choices;
  };

  const TOTAL_STEPS = 5;

  // Step navigation loop
  while (currentStep >= 1) {
    // Step 1: Select apps to install
    if (currentStep === 1) {
      log.step(`[Step 1 of ${TOTAL_STEPS}] Select apps to install`);
      const appsChoices = buildCategorizedAppChoices();
      
      selectedApps = await checkbox({
        message: `Select apps (space to toggle, enter to confirm) ${colors.dim}[${platformApps.length} items]${colors.reset}:`,
        choices: appsChoices,
        pageSize: 25,
        loop: false,
      });

      // Filter out separators and back
      selectedApps = selectedApps.filter(a => !a.startsWith("__"));
      if (appsChoices.find(c => c.value === "__back__" && selectedApps.includes("__back__"))) {
        return mainMenu();
      }

      console.log("");
      currentStep = 2;
    }

    // Step 2: Select stow-managed configs
    if (currentStep === 2) {
      log.step(`[Step 2 of ${TOTAL_STEPS}] Select configs to stow`);
      const stowChoices = [
        {
          name: `${colors.yellow}↩ Back to step 1${colors.reset}`,
          value: "__back__",
          checked: false,
        },
        ...platformStowConfigs.map((config) => {
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
        }),
      ];
      
      selectedStowConfigs = await checkbox({
        message: `Select configs to install ${colors.dim}[${stowChoices.length - 1} items]${colors.reset}:`,
        choices: stowChoices,
        pageSize: 20,
        loop: false,
      });

      if (selectedStowConfigs.includes("__back__")) {
        selectedStowConfigs = selectedStowConfigs.filter(s => s !== "__back__");
        console.log("");
        currentStep = 1;
        continue;
      }

      console.log("");
      currentStep = 3;
    }

    // Step 3: Select optional features
    if (currentStep === 3) {
      log.step(`[Step 3 of ${TOTAL_STEPS}] Select optional features`);
      const featureChoices = [
        {
          name: `${colors.yellow}↩ Back to step 2${colors.reset}`,
          value: "__back__",
          checked: false,
        },
        ...OPTIONAL_FEATURES.map((feature) => ({
          name: feature.desc ? `${feature.name} ${colors.dim}- ${feature.desc}${colors.reset}` : feature.name,
          value: feature.value,
          checked: feature.checked ?? false,
          disabled: false,
        })),
      ];

      selectedFeatures = await checkbox({
        message: `Select optional features ${colors.dim}[${featureChoices.length - 1} items]${colors.reset}:`,
        choices: featureChoices,
        pageSize: 20,
        loop: false,
      });

      if (selectedFeatures.includes("__back__")) {
        selectedFeatures = selectedFeatures.filter(f => f !== "__back__");
        console.log("");
        currentStep = 2;
        continue;
      }

      console.log("");
      currentStep = 4;
    }

    // Step 4: Recap and confirm
    if (currentStep === 4) {
      // Auto-select AI configs based on app selection
      const autoSelectedAIConfigs = selectedApps
        .filter((app) => {
          const appDef = APPS.find((a) => a.value === app);
          return appDef?.configs && appDef.configs.length > 0;
        })
        .flatMap((app) => APPS.find((a) => a.value === app)?.configs ?? []);

      aiConfigs = [...new Set(autoSelectedAIConfigs)];

      // Show recap screen
      log.step(`[Step 4 of ${TOTAL_STEPS}] Review your selections`);
      console.log("");

      // Count what will actually be installed (not already installed)
      const appsToInstallCount = selectedApps.filter(app => {
        const state = appStates.get(app);
        return state === "not_installed" || state === "partial";
      }).length;
      const configsToInstallCount = selectedStowConfigs.filter(c => !installedConfigs.has(c)).length;

      // Apps summary
      console.log(`  ${colors.bold}Apps:${colors.reset} ${selectedApps.length} selected (${appsToInstallCount} to install)`);
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

      // Configs summary
      console.log(`  ${colors.bold}Configs:${colors.reset} ${selectedStowConfigs.length} selected (${configsToInstallCount} to install)`);
      if (selectedStowConfigs.length > 0) {
        const configNames = selectedStowConfigs
          .map(v => STOW_CONFIGS.find(c => c.value === v)?.name)
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

      const proceed = await confirm({
        message: "Proceed with these selections?",
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

  // Save setup manifest (tracks what user selected for features)
  const setupManifest = manifest.getEmptyManifest();
  manifest.setInstalledApps(setupManifest, selectedApps);
  manifest.setInstalledConfigs(setupManifest, selectedStowConfigs);
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
  const bootstrapCommand = getCurrentPlatform() === "linux" ? "./bootstrap-linux.sh" : "./bootstrap.sh";
  console.log(`  To update: ${colors.cyan}cd ${DOTFILES_DIR} && git pull && ${bootstrapCommand}${colors.reset}`);
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
