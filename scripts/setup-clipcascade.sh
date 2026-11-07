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
# pyfiglet is imported unconditionally in CLI mode but is not packaged for Arch (repos or AUR),
# so the client runs from a venv that sees the system packages and adds it from PyPI.
VENV_DIR="${CLIPCASCADE_VENV_DIR:-$HOME/.local/share/clipcascade-venv}"

server() {
  [[ "$OS" == "Linux" ]] || { echo "Run the server on Linux" >&2; exit 1; }
  command -v docker >/dev/null || { echo "docker not found" >&2; exit 1; }
  command -v tailscale >/dev/null || { echo "tailscale not found" >&2; exit 1; }
  local ip
  ip="$(tailscale ip -4 | head -n1)"
  [[ -n "$ip" ]] || { echo "No Tailscale IPv4 address; is tailscale up?" >&2; exit 1; }

  # restart: unless-stopped only applies once the Docker daemon is up, so enable it at boot.
  # The container binds the Tailscale IP, so start Docker after tailscaled and wait for the IP.
  sudo install -d /etc/systemd/system/docker.service.d
  sudo tee /etc/systemd/system/docker.service.d/clipcascade-after-tailscale.conf >/dev/null <<'EOF'
[Unit]
After=tailscaled.service
Wants=tailscaled.service

[Service]
ExecStartPre=/bin/sh -c 'for i in $(seq 60); do tailscale ip -4 >/dev/null 2>&1 && exit 0; sleep 1; done'
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now docker.service
  local docker="docker"
  docker info >/dev/null 2>&1 || docker="sudo docker"

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
  $docker compose -f "$SERVER_DIR/compose.yml" up -d
  echo
  echo "ClipCascade server: http://$ip:$PORT"
  echo "First login is admin / admin123 -- change the password immediately."
}

client_linux() {
  command -v pacman >/dev/null || { echo "pacman not found (Arch/Omarchy only)" >&2; exit 1; }
  sudo pacman -S --needed --noconfirm python python-gobject gtk3 xclip wl-clipboard dunst xdg-utils \
    python-xxhash python-pyperclip python-requests python-websocket-client python-pycryptodome \
    tk python-pystray python-beautifulsoup4 python-prompt_toolkit ffmpeg unzip
  # Not in the official repos on Arch.
  local pkg
  for pkg in python-plyer python-aiortc; do
    pacman -Qi "$pkg" >/dev/null 2>&1 || yay -S --needed --noconfirm "$pkg"
  done

  python3 -m venv --system-site-packages "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --quiet --upgrade pyfiglet

  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "$RELEASE_URL/ClipCascade_Linux.zip" -o "$tmp/linux.zip"
  # Keep DATA (saved login/settings): the client stores it in its program directory.
  mkdir -p "$CLIENT_DIR"
  find "$CLIENT_DIR" -mindepth 1 -maxdepth 1 ! -name DATA -exec rm -rf {} +
  unzip -q "$tmp/linux.zip" -d "$tmp/x"
  cp -R "$(dirname "$(find "$tmp/x" -name main.py | head -n1)")"/. "$CLIENT_DIR"
  rm -rf "$tmp"

  # A user service bound to graphical-session.target starts with the Wayland session (Omarchy
  # autologin + uwsm), inherits WAYLAND_DISPLAY, and restarts if the client dies. It is skipped
  # until `run` has saved a login (DATA), because the client prompts on stdin otherwise.
  local unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$unit_dir"
  cat > "$unit_dir/clipcascade.service" <<EOF
[Unit]
Description=ClipCascade clipboard sync
After=graphical-session.target
PartOf=graphical-session.target
ConditionPathExists=$CLIENT_DIR/DATA

[Service]
WorkingDirectory=$CLIENT_DIR
# The CLI client treats EOF on stdin as "Quit" and systemd gives services /dev/null, so feed it a
# pipe that never closes. exec keeps python as the main process: if it exits, systemd restarts it.
ExecStart=/bin/bash -c 'exec $VENV_DIR/bin/python $CLIENT_DIR/main.py $LINUX_FLAGS < <(sleep infinity)'
Restart=always
RestartSec=10

[Install]
WantedBy=graphical-session.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable clipcascade.service
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
  [[ "$OS" == "Linux" ]] && echo "First run: bash scripts/setup-clipcascade.sh run  (log in, Ctrl+C, then: systemctl --user restart clipcascade)"
  return 0
}

case "${1:-}" in
  server) server ;;
  client) client ;;
  run) systemctl --user stop clipcascade.service 2>/dev/null || true; exec "$VENV_DIR/bin/python" "$CLIENT_DIR/main.py" $LINUX_FLAGS ;;
  *) echo "Usage: setup-clipcascade.sh [server|client|run]" >&2; exit 1 ;;
esac
