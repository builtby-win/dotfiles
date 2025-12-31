#!/bin/bash
# builtby.win/dotfiles - Shell initialization
# This file is sourced from ~/.zshrc

# Get the directory where this script lives
DOTFILES_SHELL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# Source oh-my-zsh config
[[ -f "$DOTFILES_SHELL_DIR/oh-my-zsh.sh" ]] && source "$DOTFILES_SHELL_DIR/oh-my-zsh.sh"

# Source aliases
[[ -f "$DOTFILES_SHELL_DIR/aliases.sh" ]] && source "$DOTFILES_SHELL_DIR/aliases.sh"

# Source functions
[[ -f "$DOTFILES_SHELL_DIR/functions.sh" ]] && source "$DOTFILES_SHELL_DIR/functions.sh"

# Homebrew
if [[ "$(uname -m)" == "arm64" ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null
else
  eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null
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
