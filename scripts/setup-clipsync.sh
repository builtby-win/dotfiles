#!/bin/bash
# Clipboard history sync across Linux and macOS: CopyQ (history) + Syncthing (transport).
#
#   setup-clipsync.sh              install, configure, autostart (idempotent)
#   setup-clipsync.sh id           print this machine's Syncthing device ID
#   setup-clipsync.sh pair <id> [name]
#                                  trust another machine's device ID and share the folder
#
# CopyQ's "itemsync" plugin mirrors the clipboard tab to $SYNC_DIR as one file per item;
# Syncthing replicates that folder. Pair every machine with every other machine once.

set -euo pipefail

SYNC_DIR="${CLIPSYNC_DIR:-$HOME/ClipSync}"
FOLDER_ID="clipsync"
SYNC_TAB="&clipboard"
LAUNCH_AGENT_LABEL="win.builtby.copyq"

OS="$(uname -s)"
case "$OS" in
  Linux|Darwin) ;;
  *) echo "Linux and macOS only" >&2; exit 1 ;;
esac

# The INI value is "<tab>, <path>"; quoting rules for odd characters are not worth supporting.
case "$SYNC_DIR" in
  /*) ;;
  *) echo "CLIPSYNC_DIR must be an absolute path: $SYNC_DIR" >&2; exit 1 ;;
esac
case "$SYNC_DIR" in
  *[,\"\\]*) echo "CLIPSYNC_DIR must not contain commas, quotes, or backslashes: $SYNC_DIR" >&2; exit 1 ;;
esac

copyq_bin() {
  if command -v copyq >/dev/null 2>&1; then
    command -v copyq
  elif [[ -x /Applications/CopyQ.app/Contents/MacOS/CopyQ ]]; then
    echo /Applications/CopyQ.app/Contents/MacOS/CopyQ
  else
    return 1
  fi
}

install_packages() {
  if [[ "$OS" == "Linux" ]]; then
    command -v pacman >/dev/null || { echo "pacman not found (Arch/Omarchy only)" >&2; exit 1; }
    sudo pacman -S --needed copyq syncthing
  else
    command -v brew >/dev/null || { echo "Homebrew not found" >&2; exit 1; }
    [[ -d /Applications/CopyQ.app ]] || brew install --cask copyq
    command -v syncthing >/dev/null || brew install syncthing
  fi
}

# Add itemsync's sync_tabs to copyq.conf without touching other settings.
# CopyQ rewrites this file on exit, so it must not be running while we edit.
configure_copyq() {
  local copyq conf line tmp
  copyq="$(copyq_bin)"
  "$copyq" exit >/dev/null 2>&1 || true
  sleep 1

  conf="$("$copyq" info config)"
  line="itemsync\\sync_tabs=${SYNC_TAB}, ${SYNC_DIR}"
  mkdir -p "$(dirname "$conf")" "$SYNC_DIR"

  if [[ -f "$conf" ]] && grep -qF 'itemsync\sync_tabs=' "$conf"; then
    if grep -qxF "$line" "$conf"; then
      echo "CopyQ sync already configured: $conf"
    else
      echo "CopyQ already has a different itemsync\\sync_tabs in $conf; leaving it alone." >&2
      echo "Wanted: $line" >&2
    fi
    return 0
  fi

  if [[ -f "$conf" ]]; then
    cp "$conf" "$conf.bak.$(date +%s)"
    tmp="$(mktemp)"
    if grep -qx '\[Plugins\]' "$conf"; then
      LINE="$line" awk '{ print } /^\[Plugins\]$/ && !done { print ENVIRON["LINE"]; done = 1 }' "$conf" > "$tmp"
    else
      { cat "$conf"; printf '\n[Plugins]\n%s\n' "$line"; } > "$tmp"
    fi
    mv "$tmp" "$conf"
  else
    printf '[Plugins]\n%s\n' "$line" > "$conf"
  fi
  echo "Configured CopyQ to sync the clipboard tab to $SYNC_DIR"
}

autostart_syncthing() {
  if [[ "$OS" == "Linux" ]]; then
    systemctl --user enable --now syncthing.service
  else
    brew services start syncthing
  fi
}

autostart_copyq() {
  local copyq
  copyq="$(copyq_bin)"

  if [[ "$OS" == "Darwin" ]]; then
    local plist="$HOME/Library/LaunchAgents/$LAUNCH_AGENT_LABEL.plist"
    mkdir -p "$(dirname "$plist")"
    cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LAUNCH_AGENT_LABEL</string>
  <key>ProgramArguments</key><array><string>/usr/bin/open</string><string>-a</string><string>CopyQ</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/$LAUNCH_AGENT_LABEL" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/$(id -u)" "$plist"
    return 0
  fi

  local hypr_autostart="${XDG_CONFIG_HOME:-$HOME/.config}/hypr/autostart.lua"
  if [[ -f "$hypr_autostart" ]]; then
    grep -qF 'copyq' "$hypr_autostart" || printf '\n-- CopyQ clipboard history (synced via Syncthing).\no.launch_on_start("copyq --start-server")\n' >> "$hypr_autostart"
  else
    local desktop="${XDG_CONFIG_HOME:-$HOME/.config}/autostart/copyq.desktop"
    mkdir -p "$(dirname "$desktop")"
    printf '[Desktop Entry]\nType=Application\nName=CopyQ\nExec=%s --start-server\n' "$copyq" > "$desktop"
  fi

  if command -v uwsm-app >/dev/null 2>&1; then
    setsid -f uwsm-app -- "$copyq" --start-server >/dev/null 2>&1
  else
    setsid -f "$copyq" --start-server >/dev/null 2>&1
  fi
}

wait_for_syncthing() {
  local i
  for i in $(seq 1 30); do
    syncthing cli show system >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "Syncthing did not come up; check: systemctl --user status syncthing (Linux) or brew services list (macOS)" >&2
  return 1
}

ensure_syncthing_folder() {
  wait_for_syncthing
  if syncthing cli config folders list | grep -qx "$FOLDER_ID"; then
    echo "Syncthing folder '$FOLDER_ID' already exists"
  else
    syncthing cli config folders add --id "$FOLDER_ID" --label ClipSync --path "$SYNC_DIR"
    echo "Added Syncthing folder '$FOLDER_ID' -> $SYNC_DIR"
  fi
}

pair_device() {
  local id="${1:-}" name="${2:-peer}"
  [[ -n "$id" ]] || { echo "Usage: setup-clipsync.sh pair <device-id> [name]" >&2; exit 1; }
  wait_for_syncthing

  if syncthing cli config devices list | grep -qx "$id"; then
    echo "Device already trusted"
  else
    syncthing cli config devices add --device-id "$id" --name "$name"
  fi
  if ! syncthing cli config folders "$FOLDER_ID" devices list | grep -qx "$id"; then
    syncthing cli config folders "$FOLDER_ID" devices add --device-id "$id"
  fi
  echo "Paired with $name. Run the same pairing on that machine with this machine's ID:"
  syncthing device-id
}

case "${1:-install}" in
  install)
    echo "==> Installing CopyQ and Syncthing"
    install_packages
    echo "==> Configuring CopyQ"
    configure_copyq
    echo "==> Enabling Syncthing at login"
    autostart_syncthing
    ensure_syncthing_folder
    echo "==> Enabling CopyQ at login"
    autostart_copyq
    echo
    echo "Done. This machine's Syncthing device ID:"
    syncthing device-id
    echo
    echo "Pair once per machine pair (run on each machine with the other's ID):"
    echo "  bb clipsync pair <other-device-id> <name>"
    ;;
  id)
    syncthing device-id
    ;;
  pair)
    shift
    pair_device "$@"
    ;;
  *)
    echo "Usage: setup-clipsync.sh [install|id|pair <device-id> [name]]" >&2
    exit 1
    ;;
esac
