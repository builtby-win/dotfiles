#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Kanata macOS setup only runs on macOS." >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
KANATA_BIN="${CARGO_HOME:-$HOME/.cargo}/bin/kanata"
KANATA_CFG="$HOME/.config/kanata/kanata.kbd"
PLIST_LABEL="com.builtbywin.kanata"
PLIST_PATH="/Library/LaunchDaemons/${PLIST_LABEL}.plist"
TMP_PLIST="$(mktemp "/tmp/${PLIST_LABEL}.XXXXXX.plist")"

cleanup() {
  rm -f "$TMP_PLIST"
}
trap cleanup EXIT

step() {
  printf '\n\033[1m==> %s\033[0m\n' "$1"
}

warn() {
  printf '\033[33mWARN:\033[0m %s\n' "$1"
}

die() {
  printf '\033[31mERROR:\033[0m %s\n' "$1" >&2
  exit 1
}

run_admin() {
  local command="$1"
  osascript -e "do shell script $(printf '%q' "$command") with administrator privileges"
}

open_privacy_panes() {
  open -R "$KANATA_BIN"
  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
}

write_plist() {
  cat > "$TMP_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${KANATA_BIN}</string>
        <string>--cfg</string>
        <string>${KANATA_CFG}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/kanata.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/kanata.err.log</string>
</dict>
</plist>
PLIST

  plutil -lint "$TMP_PLIST" >/dev/null
}

install_launchdaemon() {
  write_plist
  run_admin "cp '$TMP_PLIST' '$PLIST_PATH'; chown root:wheel '$PLIST_PATH'; chmod 644 '$PLIST_PATH'; launchctl bootout system/$PLIST_LABEL 2>/dev/null || true; : > /tmp/kanata.out.log; : > /tmp/kanata.err.log; launchctl enable system/$PLIST_LABEL; launchctl bootstrap system '$PLIST_PATH'"
}

check_logs() {
  sleep 4
  if ! launchctl print "system/$PLIST_LABEL" >/dev/null 2>&1; then
    warn "Kanata LaunchDaemon is not loaded. Run: launchctl print system/$PLIST_LABEL"
    return 1
  fi

  if [[ -s /tmp/kanata.err.log ]]; then
    warn "Kanata stderr is not empty:"
    sed 's/^/  /' /tmp/kanata.err.log
    if grep -q 'IOHIDDeviceOpen.*not permitted' /tmp/kanata.err.log; then
      warn "macOS is still denying Input Monitoring for the Kanata binary. Remove and re-add $KANATA_BIN in Input Monitoring and Accessibility, then rerun this script."
    fi
    return 1
  fi

  if grep -q 'Starting kanata proper' /tmp/kanata.out.log; then
    echo "✓ Kanata reached the processing loop."
  else
    warn "Kanata started, but the expected readiness line was not found yet. Check /tmp/kanata.out.log."
  fi
}

step "Apply chezmoi-managed Kanata config"
bash "$DOTFILES_DIR/scripts/apply-chezmoi.sh"

step "Install patched Kanata with Cargo"
if ! command -v cargo >/dev/null 2>&1; then
  die "Cargo is missing. Install Rust from https://rustup.rs, open a new shell, then rerun this script."
fi
bash "$DOTFILES_DIR/scripts/install-kanata-macos.sh"

step "Validate Kanata config"
"$KANATA_BIN" --check --cfg "$KANATA_CFG"

step "Karabiner DriverKit requirement"
if [[ -d "/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice" ]]; then
  echo "✓ Karabiner DriverKit appears to be installed."
elif [[ -d "/Applications/Karabiner-Elements.app" ]]; then
  warn "Karabiner Elements is installed, but the standalone DriverKit directory was not found. Open Karabiner Elements once and approve its driver prompts, or install Karabiner-DriverKit-VirtualHIDDevice from Kanata's macOS release notes."
else
  warn "Karabiner DriverKit was not found. Install Karabiner Elements or the standalone Karabiner-DriverKit-VirtualHIDDevice package before expecting Kanata output to work."
fi

step "Approve macOS Privacy permissions"
echo "System Settings will open now. In both Input Monitoring and Accessibility:"
echo "  1. Remove stale kanata entries if present."
echo "  2. Add and enable this exact binary: $KANATA_BIN"
echo "Finder will reveal the binary for drag-and-drop."
open_privacy_panes
read -r -p "Press Enter after you have enabled Kanata in both Privacy panes... "

step "Install and restart LaunchDaemon"
install_launchdaemon

step "Verify LaunchDaemon logs"
check_logs

echo ""
echo "Kanata macOS setup is complete. Press the Microsoft Sculpt Application/Menu key and confirm it acts as Hyper."
