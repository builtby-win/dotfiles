#!/bin/bash
# Sync macOS app export artifacts between dotfiles and the live machine.

set -euo pipefail

MODE="${1:-pull}"
TARGET="${2:-macos-apps}"
DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_EXPORTS_DIR="$DOTFILES_DIR/assets/app-exports"
RAYCAST_REPO_DIR="$APP_EXPORTS_DIR/raycast/archive"
RECTANGLE_REPO_PATH="$APP_EXPORTS_DIR/rectangle-pro/RectangleProConfig.json"
BTT_REPO_PATH="$APP_EXPORTS_DIR/bettertouchtool/Default.bttpreset"

RAYCAST_SOURCE_DIR="$HOME/Downloads"
RECTANGLE_SOURCE_PATH="$HOME/Library/Application Support/Rectangle Pro/RectangleProConfig.json"
BTT_SOURCE_PATH="$HOME/Library/Application Support/BetterTouchTool/bttdata/Default.bttpreset"

usage() {
  cat <<'EOF'
Usage: ./scripts/sync-macos-app-backups.sh [pull|push] [target]

  pull  Copy live machine exports -> dotfiles
  push  Reveal dotfiles exports and print import instructions

Targets:
  raycast, rectangle-pro, bettertouchtool, macos-apps
EOF
}

ensure_parent_dir() {
  mkdir -p "$1"
}

latest_raycast_export() {
  if [[ ! -d "$RAYCAST_SOURCE_DIR" ]]; then
    return 1
  fi

  local latest_file
  latest_file="$(ls -t "$RAYCAST_SOURCE_DIR"/Raycast-*.rayconfig 2>/dev/null | head -n 1 || true)"
  if [[ -z "$latest_file" ]]; then
    return 1
  fi

  printf '%s\n' "$latest_file"
}

latest_repo_raycast_export() {
  if [[ ! -d "$RAYCAST_REPO_DIR" ]]; then
    return 1
  fi

  local latest_file
  latest_file="$(ls -t "$RAYCAST_REPO_DIR"/Raycast-*.rayconfig 2>/dev/null | head -n 1 || true)"
  if [[ -z "$latest_file" ]]; then
    return 1
  fi

  printf '%s\n' "$latest_file"
}

copy_with_notice() {
  local source_path="$1"
  local dest_path="$2"
  cp "$source_path" "$dest_path"
  echo "✓ Synced $(basename "$source_path") -> $dest_path"
}

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

pull_raycast() {
  local source_path
  source_path="$(latest_raycast_export)" || {
    echo "Raycast export not found. Export a .rayconfig file to Downloads first."
    return 1
  }

  ensure_parent_dir "$RAYCAST_REPO_DIR"
  local dest_path="$RAYCAST_REPO_DIR/$(basename "$source_path")"
  copy_with_notice "$source_path" "$dest_path"
}

pull_rectangle() {
  if [[ ! -f "$RECTANGLE_SOURCE_PATH" ]]; then
    echo "Rectangle Pro config not found: $RECTANGLE_SOURCE_PATH"
    echo "Export Rectangle Pro config first, then rerun sync."
    return 1
  fi

  ensure_parent_dir "$(dirname "$RECTANGLE_REPO_PATH")"
  copy_with_notice "$RECTANGLE_SOURCE_PATH" "$RECTANGLE_REPO_PATH"
}

pull_btt() {
  if [[ ! -f "$BTT_SOURCE_PATH" ]]; then
    echo "BetterTouchTool preset not found: $BTT_SOURCE_PATH"
    echo "Export the Default preset first, then rerun sync."
    return 1
  fi

  ensure_parent_dir "$(dirname "$BTT_REPO_PATH")"
  copy_with_notice "$BTT_SOURCE_PATH" "$BTT_REPO_PATH"
}

push_raycast() {
  local file_path
  file_path="$(latest_repo_raycast_export)" || {
    echo "Raycast export not found in repo: $RAYCAST_REPO_DIR"
    return 1
  }

  echo "Raycast export:"
  reveal_file "$file_path"
  echo "Import in Raycast using Preferences -> Advanced -> Import Backup."
}

push_rectangle() {
  echo "Rectangle Pro export:"
  reveal_file "$RECTANGLE_REPO_PATH"
  echo "Import in Rectangle Pro from its settings/preferences import flow."
}

push_btt() {
  echo "BetterTouchTool export:"
  reveal_file "$BTT_REPO_PATH"
  echo "Import in BetterTouchTool via preset restore/import."
}

run_target() {
  local mode="$1"
  local target="$2"

  case "$target" in
    macos-apps|all)
      "${mode}_raycast"
      echo
      "${mode}_rectangle"
      echo
      "${mode}_btt"
      ;;
    raycast)
      "${mode}_raycast"
      ;;
    rectangle|rectangle-pro)
      "${mode}_rectangle"
      ;;
    bettertouchtool|btt)
      "${mode}_btt"
      ;;
    *)
      echo "Unknown target: $target"
      echo "Valid targets: raycast, rectangle-pro, bettertouchtool, macos-apps"
      return 1
      ;;
  esac
}

case "$MODE" in
  pull)
    run_target pull "$TARGET"
    ;;
  push)
    run_target push "$TARGET"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
