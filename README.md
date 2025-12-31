# builtby.win/dotfiles

My personal dotfiles with shell configs, AI tool settings, and curated app list.

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

### Shell Configs
- **zsh** - Main shell config with oh-my-zsh, vi-mode, plugins
- **aliases** - Git shortcuts, modern CLI replacements (eza, bat)
- **functions** - Quick git helpers, yt-dlp wrappers

### AI Tool Configs
- **Claude Code** - CLAUDE.md instructions, recommended plugins
- **Codex CLI** - Base config template
- **Cursor** - Hooks config

### Apps (Optional)
- Terminals: Ghostty
- Editors: VS Code, Cursor
- Productivity: Raycast, 1Password
- Browsers: Chrome, Arc, Orion
- Dev: Docker, Figma, Discord
- CLI: fzf, ripgrep, bat, eza, zoxide

## Manual Setup

If you prefer to set things up manually:

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
├── stow-packages/        # Symlink-managed configs
│   ├── zsh/.zshrc
│   └── shell/.config/shell/
├── templates/            # Copy-managed configs
│   ├── claude/
│   ├── codex/
│   └── cursor/
└── apps/Brewfile         # Reference app list
```

## How It Works

- **Shell configs** use [GNU Stow](https://www.gnu.org/software/stow/) to create symlinks
- **AI configs** are copied (not symlinked) since these tools write to their config dirs

## License

MIT
