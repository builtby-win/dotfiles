#!/bin/bash
# Sync karabiner config from dotfiles and reload Karabiner Elements

set -e

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KARABINER_SOURCE="$DOTFILES_DIR/stow-packages/karabiner/.config/karabiner/karabiner.json"
KARABINER_DEST="$HOME/.config/karabiner/karabiner.json"

# Ensure destination directory exists
mkdir -p "$(dirname "$KARABINER_DEST")"

# Copy the config
cp "$KARABINER_SOURCE" "$KARABINER_DEST"
echo "✓ Synced karabiner.json"

# Reload Karabiner Elements
if pgrep -q Karabiner-Elements; then
    killall Karabiner-Elements 2>/dev/null || true
    sleep 1
    open /Applications/Karabiner-Elements.app
    echo "✓ Restarted Karabiner Elements"
else
    open /Applications/Karabiner-Elements.app
    echo "✓ Started Karabiner Elements"
fi
