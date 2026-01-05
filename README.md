# builtby.win/dotfiles

My personal dotfiles with a fast shell setup, AI tool configs, and curated app list.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

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
| `jk` (simultaneous in terminals) | Tmux prefix (Ctrl+.) |
| `f` in sesh search | Enable fuzzy search mode |
| `Esc` in sesh search | Return to navigation mode (j/k) |
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

| Category | Apps |
|----------|------|
| Terminals | [Ghostty](https://ghostty.org) |
| Editors | [VS Code](https://code.visualstudio.com), [Cursor](https://cursor.sh) |
| AI Tools | [Claude Code](https://claude.ai/code), [Codex CLI](https://github.com/openai/codex) |
| Productivity | [Raycast](https://raycast.com) |
| Browsers | Chrome, [Arc](https://arc.net), [Orion](https://browser.kagi.com) |
| Dev | [Docker](https://docker.com), Figma, Discord |

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
