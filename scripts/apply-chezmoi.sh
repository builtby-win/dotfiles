#!/bin/bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHEZMOI_SOURCE_DIR="$DOTFILES_DIR/chezmoi"

if [[ ! -d "$CHEZMOI_SOURCE_DIR" ]]; then
  echo "chezmoi source directory not found: $CHEZMOI_SOURCE_DIR"
  exit 1
fi

if ! command -v chezmoi >/dev/null 2>&1; then
  echo "chezmoi is not installed. Install it first."
  exit 1
fi

remove_legacy_stow_symlink() {
  local target="$1"
  if [[ ! -L "$target" ]]; then
    return 0
  fi

  local link_path
  link_path="$(readlink "$target")"
  if [[ "$link_path" == *"$DOTFILES_DIR/stow-packages"* || "$link_path" == *"stow-packages"* ]]; then
    rm "$target"
    echo "Removed legacy stow symlink: $target"
  fi
}

remove_legacy_stow_symlink "$HOME/.config/tmux"
remove_legacy_stow_symlink "$HOME/.config/nvim"
remove_legacy_stow_symlink "$HOME/.hammerspoon"
remove_legacy_stow_symlink "$HOME/.config/karabiner/karabiner.json"
remove_legacy_stow_symlink "$HOME/.config/kanata/kanata.kbd"
remove_legacy_stow_symlink "$HOME/.config/ghostty/config"
remove_legacy_stow_symlink "$HOME/Library/Application Support/com.mitchellh.ghostty/config"
remove_legacy_stow_symlink "$HOME/.config/starship.toml"
remove_legacy_stow_symlink "$HOME/.local/bin/b2v"
remove_legacy_stow_symlink "$HOME/.local/bin/coolify"
remove_legacy_stow_symlink "$HOME/.local/bin/sesh"
remove_legacy_stow_symlink "$HOME/.local/bin/tmux-smart"

DOTFILES_DIR="$DOTFILES_DIR" chezmoi init --apply --source="$CHEZMOI_SOURCE_DIR"
