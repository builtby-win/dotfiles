#!/bin/bash
# Sync karabiner config between dotfiles and the live machine config.

set -euo pipefail

MODE="${1:-push}"
DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KARABINER_SOURCE="$DOTFILES_DIR/stow-packages/karabiner/.config/karabiner/karabiner.json"
KARABINER_DEST="$HOME/.config/karabiner/karabiner.json"

usage() {
  cat <<'EOF'
Usage: ./scripts/sync-karabiner.sh [push|pull]

  push  Copy dotfiles -> ~/.config/karabiner/karabiner.json and restart Karabiner Elements
  pull  Copy ~/.config/karabiner/karabiner.json -> dotfiles
EOF
}

resolve_link_target() {
  local path="$1"
  if [[ ! -L "$path" ]]; then
    return 1
  fi

  local target
  target="$(readlink "$path")"
  if [[ "$target" != /* ]]; then
    target="$(cd "$(dirname "$path")" && cd "$(dirname "$target")" && pwd)/$(basename "$target")"
  fi

  printf '%s\n' "$target"
}

restart_karabiner() {
  if pgrep -q Karabiner-Elements; then
    killall Karabiner-Elements 2>/dev/null || true
    sleep 1
    open /Applications/Karabiner-Elements.app
    echo "✓ Restarted Karabiner Elements"
  else
    open /Applications/Karabiner-Elements.app
    echo "✓ Started Karabiner Elements"
  fi
}

push_config() {
  mkdir -p "$(dirname "$KARABINER_DEST")"

  if [[ -L "$KARABINER_DEST" ]]; then
    local link_target
    link_target="$(resolve_link_target "$KARABINER_DEST")"
    if [[ "$link_target" == "$KARABINER_SOURCE" ]]; then
      echo "✓ karabiner.json already linked to dotfiles"
      restart_karabiner
      return 0
    fi

    echo "Warning: karabiner.json is a symlink to $link_target (skipping overwrite)"
    return 1
  fi

  cp "$KARABINER_SOURCE" "$KARABINER_DEST"
  echo "✓ Synced dotfiles -> Karabiner"
  restart_karabiner
}

pull_config() {
  if [[ ! -e "$KARABINER_DEST" ]]; then
    echo "Karabiner config not found at $KARABINER_DEST"
    return 1
  fi

  mkdir -p "$(dirname "$KARABINER_SOURCE")"

  if [[ -L "$KARABINER_DEST" ]]; then
    local link_target
    link_target="$(resolve_link_target "$KARABINER_DEST")"
    if [[ "$link_target" == "$KARABINER_SOURCE" ]]; then
      echo "✓ Dotfiles already match the live Karabiner config"
      return 0
    fi
  fi

  cp "$KARABINER_DEST" "$KARABINER_SOURCE"
  echo "✓ Synced Karabiner -> dotfiles"
}

case "$MODE" in
  push)
    push_config
    ;;
  pull)
    pull_config
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
