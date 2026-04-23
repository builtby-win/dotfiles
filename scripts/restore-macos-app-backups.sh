#!/bin/bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_EXPORTS_DIR="$DOTFILES_DIR/assets/app-exports"

target="${1:-macos-apps}"

if [[ ! -d "$APP_EXPORTS_DIR" ]]; then
  echo "App exports directory not found: $APP_EXPORTS_DIR"
  exit 1
fi

reveal_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    echo "Missing export: $file_path"
    return 1
  fi

  if [[ "$(uname)" == "Darwin" ]]; then
    open -R "$file_path"
  fi

  echo "  $file_path"
}

restore_raycast() {
  local file_path="$APP_EXPORTS_DIR/raycast/archive/Raycast-2026-04-22-23-03-14.rayconfig"
  echo "Raycast export:"
  reveal_file "$file_path"
  echo "Import in Raycast using its Preferences/Data import flow."
}

restore_rectangle() {
  local file_path="$APP_EXPORTS_DIR/rectangle-pro/RectangleProConfig.json"
  echo "Rectangle Pro export:"
  reveal_file "$file_path"
  echo "Import in Rectangle Pro from its settings/preferences import flow."
}

restore_btt() {
  local file_path="$APP_EXPORTS_DIR/bettertouchtool/Default.bttpreset"
  echo "BetterTouchTool export:"
  reveal_file "$file_path"
  echo "Import in BetterTouchTool via preset restore/import."
}

case "$target" in
  macos-apps|all)
    echo "Revealing macOS app backup exports..."
    restore_raycast
    echo
    restore_rectangle
    echo
    restore_btt
    ;;
  raycast)
    restore_raycast
    ;;
  rectangle|rectangle-pro)
    restore_rectangle
    ;;
  bettertouchtool|btt)
    restore_btt
    ;;
  *)
    echo "Unknown restore target: $target"
    echo "Valid targets: raycast, rectangle-pro, bettertouchtool, macos-apps"
    exit 1
    ;;
esac
