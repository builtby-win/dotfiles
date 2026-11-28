// Platform detection
export type Platform = "macos" | "windows" | "linux";

export interface PlatformSupport {
  macos?: boolean;
  windows?: boolean;
  linux?: boolean;
}

export function getCurrentPlatform(): Platform {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "linux";
}

export function isPlatformSupported(platforms: PlatformSupport | undefined, currentPlatform: Platform): boolean {
  // If no platforms specified, default to showing (backward compatibility)
  if (!platforms) return true;
  // Show if current platform is not explicitly set to false
  return platforms[currentPlatform] !== false;
}

// App categories for organized display
export type AppCategory = "cli" | "terminals" | "ai" | "productivity" | "input" | "security" | "browsers" | "devtools";

export const CATEGORY_ORDER: AppCategory[] = ["cli", "terminals", "ai", "productivity", "input", "security", "browsers", "devtools"];

export const CATEGORY_LABELS: Record<AppCategory, string> = {
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
export interface App {
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
  brewTap?: { name: string; url: string }; // Optional tap required before a Homebrew package
  category: AppCategory;   // Category for grouped display
}

export const APPS: App[] = [
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
  { name: "GitButler CLI", value: "gitbutler", brewName: "", detectCmd: "command -v but", installCommand: "curl -fsSL https://gitbutler.com/install.sh | sh", desc: "Stacked and parallel branches from the terminal (but)", url: "https://docs.gitbutler.com/cli-overview", platforms: { macos: true, linux: true, windows: false }, category: "cli" },
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
  { name: "back2vibing", value: "back2vibing", brewName: "back2vibing", brewTap: { name: "builtby-win/back2vibing", url: "https://github.com/builtby-win/back2vibing" }, cask: true, detectPath: "/Applications/back2vibing.app", desc: "Focus & productivity for AI developers", url: "https://back2vibing.builtby.win/downloads/", platforms: { macos: true, windows: false, linux: false }, category: "productivity" },
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
export interface ManagedConfig {
  name: string;
  value: string;
  checked?: boolean;
  platforms?: PlatformSupport;
  desc?: string;
}

export const MANAGED_CONFIGS: ManagedConfig[] = [
  { name: "Shell config", value: "zsh", checked: true, desc: "zinit plugins, starship prompt, aliases, PATH setup" },
  { name: "Tmux", value: "tmux", checked: true, platforms: { macos: true, linux: true, windows: false }, desc: "core profile + optional basic keymap, preserves existing setups" },
  { name: "Neovim", value: "nvim", checked: false, platforms: { macos: true, linux: true, windows: false }, desc: "Bleeding-edge vim.pack Neovim config (requires Neovim 0.12+)" },
  { name: "Hammerspoon", value: "hammerspoon", checked: false, platforms: { macos: true, windows: false, linux: false }, desc: "Ghostty automation and the jk window leader" },
  { name: "Karabiner Elements", value: "karabiner", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "App-aware chords, Hyper, and Neru keyboard modes" },
  { name: "Omarchy", value: "omarchy", checked: true, platforms: { macos: false, windows: false, linux: true }, desc: "Omarchy shell settings (idle/lock, bar layout) and the jk leader bar plugin" },
  { name: "iTerm2 defaults", value: "iterm2", checked: true, platforms: { macos: true, windows: false, linux: false }, desc: "Command-Backspace, word delete, prompt navigation, and terminal key hacks" },
  { name: "Oh My Pi config", value: "omp", checked: true, platforms: { macos: true, linux: true, windows: false }, desc: "~/.omp/agent config, MCP settings, agent prompts, and extensions" },
  { name: "Ghostty", value: "ghostty", checked: false, platforms: { macos: true, linux: true, windows: false }, desc: "Font, theme, keybindings for optional GPU terminal" },
];

// Optional features (opt-in, don't load in shell unless selected)
export const OPTIONAL_FEATURES = [
  {
    name: "Shell Tips (Daily)",
    value: "tips",
    checked: true,
    desc: "Show a short dotfiles tip once per day when the shell starts"
  },
];

// AI tool configs (template-based)
export const AI_CONFIGS: Record<string, {
  name: string;
  templates: string[];
  targetDir?: string;
  skill?: { template: string; targetDir: string };
}> = {
  claude: {
    name: "Claude Code",
    templates: ["settings.json", "settings.local.json"],
    skill: { template: "skills/setup/skill.md", targetDir: ".claude" },
  },
  codex: {
    name: "Codex CLI",
    templates: ["config.toml", "hooks.json"],
  },
  opencode: {
    name: "OpenCode",
    templates: ["opencode.json", "oh-my-openagent.json", "tui.json"],
    targetDir: ".config/opencode",
    skill: { template: "skills/setup/skill.md", targetDir: ".agents" },
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
