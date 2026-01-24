# builtby.win/dotfiles

My personal dotfiles with a fast shell setup, AI tool configs, and curated app list.

## Prerequisites

**Git** is required to clone and manage these dotfiles.

- **macOS:** Git is usually installed automatically when you run it. If not, run `xcode-select --install` or `brew install git`.
- **Windows:** Run `winget install Git.Git` in PowerShell.
- **Linux:** Install via your package manager (e.g., `sudo apt install git`).

## Quick Install

**For macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

**For Windows:**

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

More details in [Windows Setup Guide](WINDOWS_README.md).

This will:
1. Ask where to clone the dotfiles
2. Install Homebrew (if needed)
3. Install fnm + Node.js (if needed)
4. Run an interactive setup to select apps and configs

## What's Included

### Shell Setup

Uses [zinit](https://github.com/zdharma-continuum/zinit) (lightweight plugin manager) + [Starship](https://starship.rs) prompt.

| Component | Description |
|-----------|-------------|
| [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions) | Shows command suggestions from history as you type. Press `→` to accept |
| [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting) | Colors commands as you type (green = valid, red = invalid) |
| [zsh-vi-mode](https://github.com/jeffreytse/zsh-vi-mode) | Vim keybindings in terminal. `Esc` for normal mode, `i` for insert |
| git-auto-fetch | Automatically fetches git repos in background when you cd into them |
| [Starship](https://starship.rs) | Fast, customizable prompt showing git status, language versions, etc. |

### Optional Features

#### Beads - Global Task Manager
[Beads](https://github.com/steveyegge/beads) is a global task aggregation tool that lets you organize tasks across multiple repositories. When you enable it during setup, you can:

- Create and organize tasks with a `bd` command
- Aggregate tasks from all your projects in one place
- Synchronize tasks across repositories using git

**Installation**: Select "Beads (Global Task Manager)" during setup. It's completely optional - if you don't select it, nothing changes in your shell.

**Usage**: After enabling Beads, run `bd --help` to see available commands.

### Aliases

```bash
# Git shortcuts
p          # git add -p (interactive staging)
ggwip      # Quick "wip" commit
unwip      # Undo last commit (soft reset)
shipit     # Push current branch
amend      # Amend last commit

# Modern CLI replacements (if installed)
ls         # eza (better ls with colors, icons)
cat        # bat (syntax highlighted cat)
cd         # zoxide (smart cd that learns)

# Package managers
pp         # pnpm
ppr        # pnpm run
```

### CLI Tools

| Tool | Description | Link |
|------|-------------|------|
| [starship](https://starship.rs) | Fast, customizable shell prompt written in Rust | [GitHub](https://github.com/starship/starship) |
| [fzf](https://github.com/junegunn/fzf) | Fuzzy finder for files, history, and more | [GitHub](https://github.com/junegunn/fzf) |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | Blazing fast grep replacement | [GitHub](https://github.com/BurntSushi/ripgrep) |
| [bat](https://github.com/sharkdp/bat) | `cat` with syntax highlighting and git integration | [GitHub](https://github.com/sharkdp/bat) |
| [eza](https://github.com/eza-community/eza) | Modern `ls` replacement with colors and icons | [GitHub](https://github.com/eza-community/eza) |
| [zoxide](https://github.com/ajeetdsouza/zoxide) | Smarter `cd` that learns your habits | [GitHub](https://github.com/ajeetdsouza/zoxide) |
| [tmux](https://github.com/tmux/tmux) | Terminal multiplexer (split panes, sessions) | [GitHub](https://github.com/tmux/tmux) |

### Tmux Usage

Prefix key: `Ctrl+.` (or `jk` in terminals via Karabiner)

#### Ghostty Integration

When using tmux with Ghostty and mouse mode enabled (`set -g mouse on`):
- **Cmd+Click links**: Use `Cmd+Shift+Click` (Shift bypasses tmux)
- **Copy text**: Use `Cmd+Shift+Drag` to select, then `Cmd+C`
- **Alternative**: Use tmux copy mode (see below)

#### Session Management

| Binding | Action |
|---------|--------|
| `Leader+Space` | Session picker (sesh) - browse/create sessions |
| `Leader+t` | Session picker (alternative) |
| `Leader+T` | Quick switch to last session |
| `Leader+Tab` | Toggle between last 2 sessions |
| `Alt+(` / `Alt+)` | Previous/next session |
| `Leader+q` | Detach from session |

**Sesh picker navigation**:
- `j`/`k` - Navigate up/down in list (default mode)
- `f` - Enable fuzzy search mode (allows typing j/k/x)
- `Esc` - Close sesh (or exit search mode if searching)
- `x` - Kill selected session
- `Ctrl+A/T/G/X` - Switch between all/tmux/configs/zoxide views

#### Pane Navigation & Splits

| Binding | Action |
|---------|--------|
| `Leader+h/j/k/l` | Select pane (vim style) |
| `Alt+h/j/k/l` | Select pane (no prefix) |
| `Leader+d` | Split vertical (side by side) |
| `Leader+D` | Split horizontal (stacked) |
| `Leader+w` | Close pane |
| `Alt+\` | Split vertical (no prefix) |
| `Alt+-` | Split horizontal (no prefix) |
| `Leader+-` | Shrink pane |
| `Leader+=` | Grow pane |
| `Alt+Arrows` | Resize pane (no prefix) |

#### Window Navigation

| Binding | Action |
|---------|--------|
| `Alt+1-9` | Switch to window 1-9 |
| `Alt+c` | New window |

#### Copy Mode (Vim Style)

| Binding | Action |
|---------|--------|
| `Leader+c` | Enter copy mode |
| `h/j/k/l` | Navigate in copy mode |
| `v` | Start selection |
| `V` | Select whole lines |
| `y` | Yank/copy and exit |
| `q` | Quit copy mode |
| `/` | Search forward |
| `n` / `N` | Next/previous search result |

#### Other

| Binding | Action |
|---------|--------|
| `Leader+p` | Command palette (searchable keybindings) |
| `Leader+r` | Reload tmux config |
| `Leader+z` | Zoom/unzoom pane |

### Karabiner Elements Keybindings

Custom keyboard shortcuts for improved workflow:

| Binding | Action |
|---------|--------|
| `;;` (double semicolon) | Open AltTab window switcher (Ctrl+Opt+Tab) |
| `Caps Lock` | Control key |
| `Fn` key | Control key |
| `Delete` (forward delete) | Escape |

**External Keyboard (Windows layout)**:
- Left Alt → Command
- Left Windows → Option
- Right Alt → Command
- Menu key → Hyper (Ctrl+Opt+Shift+Cmd)

**Note**: Karabiner config is managed via `./scripts/sync-karabiner.sh` (not stow) because Karabiner rewrites its own config file.

### Apps (Optional)

All apps can be installed via `brew install --cask <name>` or through the interactive setup.

| App | Description | Install |
|-----|-------------|---------|
| [Ghostty](https://ghostty.org) | GPU-accelerated terminal by Mitchell Hashimoto | `brew install --cask ghostty` |
| [VS Code](https://code.visualstudio.com) | Popular code editor by Microsoft | `brew install --cask visual-studio-code` |
| [Cursor](https://cursor.sh) | AI-first code editor (VS Code fork) | `brew install --cask cursor` |
| [Raycast](https://raycast.com) | Spotlight replacement with extensions | `brew install --cask raycast` |
| [AltTab](https://alt-tab-macos.netlify.app) | Windows-style alt-tab window switcher | `brew install --cask alt-tab` |
| [Ice](https://github.com/jordanbaird/Ice) | Menu bar management - hide icons | `brew install --cask jordanbaird-ice` |
| [BetterTouchTool](https://folivora.ai) | Customize trackpad, keyboard, Touch Bar, window snapping | `brew install --cask bettertouchtool` |
| [LinearMouse](https://linearmouse.app) | Per-device mouse/trackpad settings, disable acceleration | `brew install --cask linearmouse` |
| [Karabiner Elements](https://karabiner-elements.pqrs.org) | Powerful keyboard customization and remapping | `brew install --cask karabiner-elements` |
| [Bitwarden](https://bitwarden.com) | Open source password manager | `brew install --cask bitwarden` |
| [Arc](https://arc.net) | Modern browser with spaces & profiles | `brew install --cask arc` |
| [Orion](https://browser.kagi.com) | WebKit browser with Chrome/Firefox extension support | `brew install --cask orion` |
| [Docker](https://docker.com) | Container runtime for development | `brew install --cask docker` |
| [Figma](https://figma.com) | Collaborative design tool | `brew install --cask figma` |
| [Discord](https://discord.com) | Chat for communities | `brew install --cask discord` |

### AI Tools

| Tool | Description | Install |
|------|-------------|---------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Anthropic's AI coding assistant for terminal | `brew install claude` |
| [Codex CLI](https://github.com/openai/codex) | OpenAI's coding assistant CLI | `npm install -g @openai/codex` |

### AI Tool Configs

- **Claude Code** - CLAUDE.md instructions, hooks
- **Codex CLI** - Base config template
- **Cursor** - Hooks config

## Manual Setup

```bash
# Clone
git clone https://github.com/builtby-win/dotfiles.git ~/dotfiles
cd ~/dotfiles

# Install deps
brew install stow fnm
fnm install --lts
npm install -g pnpm
pnpm install

# Run interactive setup
pnpm run setup
```

## Updating

```bash
cd ~/dotfiles
git pull
./bootstrap.sh
```

## Structure

```
dotfiles/
├── bootstrap.sh          # Main installer script
├── setup.ts              # Interactive CLI
├── shell/
│   ├── zinit.sh          # Plugin manager + prompt setup
│   ├── aliases.sh        # Shell aliases
│   ├── functions.sh      # Shell functions
│   ├── init.sh           # Main shell init
│   └── local.sh          # Personal config (gitignored)
├── stow-packages/        # Symlink-managed configs
│   ├── zsh/.zshrc
│   ├── zsh/.config/starship.toml
│   ├── tmux/.tmux.conf
│   ├── ghostty/
│   └── karabiner/
└── templates/            # Copy-managed configs
    ├── claude/
    ├── codex/
    └── cursor/
```

## How It Works

- **Shell configs** use [GNU Stow](https://www.gnu.org/software/stow/) to create symlinks
- **AI configs** are copied (not symlinked) since these tools write to their config dirs
- **Personal stuff** goes in `shell/local.sh` (gitignored)

## License

MIT
