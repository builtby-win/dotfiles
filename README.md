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
