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

DOTFILES_DIR="$DOTFILES_DIR" chezmoi init --apply --source="$CHEZMOI_SOURCE_DIR"
