#!/bin/bash
# builtby.win/dotfiles - Shell initialization
# This file is sourced from ~/.zshrc

# Get the directory where this script lives
DOTFILES_SHELL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
DOTFILES_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/dotfiles"
mkdir -p "$DOTFILES_CACHE_DIR"

# Local/personal config (early - for PATH/fpath setup)
[[ -f "$DOTFILES_SHELL_DIR/local.sh" ]] && source "$DOTFILES_SHELL_DIR/local.sh"

# User-local binaries (used by installers like starship/pnpm fallbacks)
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

# Source aliases
[[ -f "$DOTFILES_SHELL_DIR/aliases.sh" ]] && source "$DOTFILES_SHELL_DIR/aliases.sh"

# Source functions
[[ -f "$DOTFILES_SHELL_DIR/functions.sh" ]] && source "$DOTFILES_SHELL_DIR/functions.sh"

# Source agent helper functions
[[ -f "$DOTFILES_SHELL_DIR/agents.sh" ]] && source "$DOTFILES_SHELL_DIR/agents.sh"

# Load optional features based on setup manifest
MANIFEST="$HOME/.config/dotfiles/setup-manifest.json"
if [[ -f "$MANIFEST" ]]; then
  # Daily tips (optional)
  if command -v jq &> /dev/null && jq -e '.features.tips == true' "$MANIFEST" >/dev/null 2>&1; then
    [[ -f "$DOTFILES_SHELL_DIR/tips.sh" ]] && source "$DOTFILES_SHELL_DIR/tips.sh"
  fi
fi

# Homebrew
if [[ "$(uname -s)" == "Linux" ]]; then
  BREW_PATH="/home/linuxbrew/.linuxbrew/bin/brew"
elif [[ "$(uname -m)" == "arm64" ]]; then
  BREW_PATH="/opt/homebrew/bin/brew"
else
  BREW_PATH="/usr/local/bin/brew"
fi

if [[ ! -f "$BREW_PATH" ]] && command -v brew &> /dev/null; then
  BREW_PATH="$(command -v brew)"
fi

if [[ -f "$BREW_PATH" ]]; then
  BREW_CACHE_KEY="${BREW_PATH//\//_}"
  BREW_ENV_CACHE="$DOTFILES_CACHE_DIR/brew-shellenv-${BREW_CACHE_KEY}.zsh"
  # Cache brew shellenv if it doesn't exist or brew executable is newer
  if [[ ! -f "$BREW_ENV_CACHE" ]] || [[ "$BREW_PATH" -nt "$BREW_ENV_CACHE" ]]; then
    "$BREW_PATH" shellenv > "$BREW_ENV_CACHE"
  fi
  source "$BREW_ENV_CACHE"
fi

# Auto-attach tmux for SSH sessions (Termius)
if [[ -n "$SSH_CONNECTION" && -z "$TMUX" && -z "$NO_AUTO_TMUX" ]]; then
  if command -v tmux &> /dev/null; then
    command tmux new-session -A -s main
  fi
fi

# fnm (Fast Node Manager)
if command -v fnm &> /dev/null; then
  eval "$(fnm env --use-on-cd)"
fi

# zoxide (smart cd) - disable for Claude Code to avoid issues
if [[ "$CLAUDECODE" != "1" ]] && command -v zoxide &> /dev/null; then
  eval "$(zoxide init zsh --cmd cd)"
fi

# Cargo/Rust
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"

# Source zinit config (lightweight plugin manager + starship prompt)
# Falls back to oh-my-zsh if zinit.sh doesn't exist (for backwards compatibility)
# Loaded LAST to ensure all fpaths are set before compinit and plugins wrap correctly
if [[ -f "$DOTFILES_SHELL_DIR/zinit.sh" ]]; then
  source "$DOTFILES_SHELL_DIR/zinit.sh"
elif [[ -f "$DOTFILES_SHELL_DIR/oh-my-zsh.sh" ]]; then
  source "$DOTFILES_SHELL_DIR/oh-my-zsh.sh"
fi
