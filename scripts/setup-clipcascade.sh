#!/bin/bash
# Clipboard sync (text, images, files) across Linux and macOS with ClipCascade.
#
#   setup-clipcascade.sh server    run the sync server in Docker, bound to this machine's Tailscale IP
#   setup-clipcascade.sh client    install the desktop client and start it at login
#   setup-clipcascade.sh run       run the client in the foreground (first run: log in)
#
# Run `server` on one always-on Linux machine. Run `client` on every machine, including that one.
# The server is reachable only over Tailscale; log in with the admin account it creates.

set -euo pipefail

REPO="Sathvik-Rao/ClipCascade"
RELEASE_URL="https://github.com/$REPO/releases/latest/download"
SERVER_DIR="${CLIPCASCADE_SERVER_DIR:-$HOME/.local/share/clipcascade-server}"
CLIENT_DIR="${CLIPCASCADE_CLIENT_DIR:-$HOME/.local/share/clipcascade}"
PORT="${CLIPCASCADE_PORT:-8080}"
MAX_MIB="${CLIPCASCADE_MAX_MIB:-20}"
OS="$(uname -s)"
# Upstream classifies Hyprland with DISPLAY and WAYLAND_DISPLAY both set as XWayland, which picks
# GUI + xclip and misses native Wayland clipboard changes. Force CLI + wl-clipboard.
LINUX_FLAGS="--gui false --xmode false"

server() {
  [[ "$OS" == "Linux" ]] || { echo "Run the server on Linux" >&2; exit 1; }
  command -v docker >/dev/null || { echo "docker not found" >&2; exit 1; }
  command -v tailscale >/dev/null || { echo "tailscale not found" >&2; exit 1; }
  local ip
  ip="$(tailscale ip -4 | head -n1)"
  [[ -n "$ip" ]] || { echo "No Tailscale IPv4 address; is tailscale up?" >&2; exit 1; }

  mkdir -p "$SERVER_DIR/cc_users"
  cat > "$SERVER_DIR/compose.yml" <<EOF
services:
  clipcascade:
    image: sathvikrao/clipcascade
    container_name: clipcascade
    restart: unless-stopped
    ports:
      - "$ip:$PORT:8080"
    volumes:
      - ./cc_users:/database
    environment:
      - CC_MAX_MESSAGE_SIZE_IN_MiB=$MAX_MIB
      - CC_P2P_ENABLED=false
      - CC_SIGNUP_ENABLED=false
EOF
  docker compose -f "$SERVER_DIR/compose.yml" up -d
  echo
  echo "ClipCascade server: http://$ip:$PORT"
  echo "First login is admin / admin123 -- change the password immediately."
}

client_linux() {
  command -v pacman >/dev/null || { echo "pacman not found (Arch/Omarchy only)" >&2; exit 1; }
  sudo pacman -S --needed --noconfirm python python-gobject gtk3 xclip wl-clipboard dunst xdg-utils \
    python-xxhash python-pyperclip python-requests python-websocket-client python-pycryptodome \
    tk python-pystray python-pyfiglet python-beautifulsoup4 python-prompt_toolkit ffmpeg unzip
  # Not in the official repos on Arch.
  local pkg
  for pkg in python-plyer python-aiortc; do
    pacman -Qi "$pkg" >/dev/null 2>&1 || yay -S --needed --noconfirm "$pkg"
  done

  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "$RELEASE_URL/ClipCascade_Linux.zip" -o "$tmp/linux.zip"
  # Keep DATA (saved login/settings): the client stores it in its program directory.
  mkdir -p "$CLIENT_DIR"
  find "$CLIENT_DIR" -mindepth 1 -maxdepth 1 ! -name DATA -exec rm -rf {} +
  unzip -q "$tmp/linux.zip" -d "$tmp/x"
  cp -R "$(dirname "$(find "$tmp/x" -name main.py | head -n1)")"/. "$CLIENT_DIR"
  rm -rf "$tmp"

  local hypr_autostart="${XDG_CONFIG_HOME:-$HOME/.config}/hypr/autostart.lua"
  local cmd="python3 $CLIENT_DIR/main.py $LINUX_FLAGS"
  if [[ -f "$hypr_autostart" ]]; then
    grep -qF 'ClipCascade' "$hypr_autostart" || printf '\n-- ClipCascade clipboard sync.\no.launch_on_start("%s")\n' "$cmd" >> "$hypr_autostart"
  else
    local desktop="${XDG_CONFIG_HOME:-$HOME/.config}/autostart/clipcascade.desktop"
    mkdir -p "$(dirname "$desktop")"
    printf '[Desktop Entry]\nType=Application\nName=ClipCascade\nExec=%s\n' "$cmd" > "$desktop"
  fi
}

client_macos() {
  local asset
  case "$(uname -m)" in
    arm64) asset="ClipCascade-Apple_macOS.ARM_M-Series.zip" ;;
    *) asset="ClipCascade-Apple_macOS.Intel-Series.zip" ;;
  esac
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "$RELEASE_URL/$asset" -o "$tmp/mac.zip"
  unzip -q "$tmp/mac.zip" -d "$tmp/x"
  rm -rf /Applications/ClipCascade.app
  cp -R "$(find "$tmp/x" -maxdepth 2 -name 'ClipCascade*.app' | head -n1)" /Applications/ClipCascade.app
  xattr -dr com.apple.quarantine /Applications/ClipCascade.app
  rm -rf "$tmp"
  open -a ClipCascade
  echo "Add ClipCascade to System Settings > General > Login Items to start it at login."
}

client() {
  if [[ "$OS" == "Darwin" ]]; then client_macos; else client_linux; fi
  echo
  echo "Client installed. Log in with the server URL (http://<tailscale-ip>:$PORT)."
  [[ "$OS" == "Linux" ]] && echo "First run: bash scripts/setup-clipcascade.sh run"
  return 0
}

case "${1:-}" in
  server) server ;;
  client) client ;;
  run) exec python3 "$CLIENT_DIR/main.py" $LINUX_FLAGS ;;
  *) echo "Usage: setup-clipcascade.sh [server|client|run]" >&2; exit 1 ;;
esac
