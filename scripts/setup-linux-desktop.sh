#!/bin/bash
# Omarchy (Arch) desktop setup: cross-platform apps plus the keyd keyboard layer.
# Run from a terminal; it prompts for your sudo password.

set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYD_SOURCE="$DOTFILES_DIR/linux/keyd/default.conf"

REPO_PACKAGES=(
  ghostty
  bitwarden
  google-chrome
  visual-studio-code-bin
  cursor-bin
  discord
  fnm
  github-cli
  diff-so-fancy
  ttf-jetbrains-mono
  ttf-fira-code
  keyd
)
AUR_PACKAGES=(
  vicinae-bin
  sesh-bin
)

[[ "$(uname -s)" == "Linux" ]] || { echo "Linux only" >&2; exit 1; }
command -v pacman >/dev/null || { echo "pacman not found (Arch/Omarchy only)" >&2; exit 1; }

echo "==> Installing apps"
sudo pacman -S --needed "${REPO_PACKAGES[@]}"
yay -S --needed --answerdiff None --answerclean None "${AUR_PACKAGES[@]}"

echo "==> Validating keyd config"
keyd check "$KEYD_SOURCE"

echo "==> Installing keyd config and starting the service"
sudo install -Dm644 "$KEYD_SOURCE" /etc/keyd/default.conf
sudo systemctl enable --now keyd
sudo keyd reload

echo "==> Installing the Hyprland jk leader"
HYPR_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/hypr"
install -Dm644 "$DOTFILES_DIR/linux/hypr/leader.lua" "$HYPR_DIR/leader.lua"
grep -qxF 'require("hypr.leader")' "$HYPR_DIR/bindings.lua" || printf '\nrequire("hypr.leader")\n' >> "$HYPR_DIR/bindings.lua"

echo "==> Installing the jk leader bar indicator"
bash "$DOTFILES_DIR/scripts/apply-chezmoi.sh" "$HOME/.config/omarchy/plugins/builtby.leader"
if omarchy-shell shell ping >/dev/null 2>&1; then
  omarchy-shell shell rescanPlugins
  omarchy plugin enable builtby.leader
  omarchy bar put builtby.leader --section left --after omarchy.workspaces
fi

echo "==> Starting vicinae"
if ! pgrep -x vicinae >/dev/null; then
  setsid -f uwsm-app -- vicinae server >/dev/null 2>&1
fi

hyprctl reload >/dev/null

echo
echo "Done. keyd is live on the Sculpt. Panic exit: Backspace + Escape + Enter."
