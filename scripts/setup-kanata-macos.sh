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
KANATA_SCULPT_CFG="$HOME/.config/kanata/kanata-sculpt.kbd"
KANATA_TCP_PORT="5829"
KANATA_SCULPT_TCP_PORT="5830"
PLIST_LABEL="com.builtbywin.kanata"
SCULPT_PLIST_LABEL="com.builtbywin.kanata-sculpt"
OTHER_PLIST_LABEL="com.builtbywin.kanata-other"
VK_AGENT_LABEL="local.kanata-vk-agent"
VK_AGENT_SCULPT_LABEL="local.kanata-vk-agent-sculpt"
OTHER_VK_AGENT_LABEL="local.kanata-vk-agent-other"
VK_AGENT_PLIST_DIR="$HOME/Library/LaunchAgents"
SCULPT_HIDUTIL_LABEL="local.microsoft-sculpt-hidutil"
# Keep these lists mirrored with defvirtualkeys and app-aware switch aliases
# in chezmoi/dot_config/kanata/*.kbd. kanata-vk-agent presses these virtual
# keys when the matching bundle ID is frontmost.
TERMINAL_BUNDLE_IDS="com.mitchellh.ghostty,com.googlecode.iterm2,com.apple.Terminal,dev.warp.Warp-Stable,net.kovidgoyal.kitty,org.alacritty,io.alacritty,com.github.wez.wezterm,com.cmuxterm.app"
EDITOR_BUNDLE_IDS="dev.zed.Zed,com.microsoft.VSCode,com.todesktop.230313mzl4w4u92"
VK_AGENT_BUNDLE_IDS="${TERMINAL_BUNDLE_IDS},${EDITOR_BUNDLE_IDS}"
ADMIN_PROMPT_EXPLAINED=0

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

  if [[ "$ADMIN_PROMPT_EXPLAINED" -eq 0 ]]; then
    warn "macOS may ask for your password so this helper can install root-owned LaunchDaemons in /Library/LaunchDaemons and enable them with launchctl."
    ADMIN_PROMPT_EXPLAINED=1
  fi

  osascript \
    -e 'on run argv' \
    -e 'do shell script (item 1 of argv) with administrator privileges' \
    -e 'end run' \
    "$command"
}

open_privacy_panes() {
  open -R "$KANATA_BIN"
  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
}

write_plist() {
  local label="$1"
  local cfg="$2"
  local port="$3"
  local tmp_plist="$4"

  cat > "$tmp_plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${KANATA_BIN}</string>
        <string>--cfg</string>
        <string>${cfg}</string>
        <string>--port</string>
        <string>${port}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/${label}.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/${label}.err.log</string>
</dict>
</plist>
PLIST

  plutil -lint "$tmp_plist" >/dev/null
}

kanata_vk_agent_bin() {
  if command -v kanata-vk-agent >/dev/null 2>&1; then
    command -v kanata-vk-agent
    return 0
  fi

  if [[ -x /opt/homebrew/bin/kanata-vk-agent ]]; then
    echo /opt/homebrew/bin/kanata-vk-agent
    return 0
  fi

  if [[ -x /usr/local/bin/kanata-vk-agent ]]; then
    echo /usr/local/bin/kanata-vk-agent
    return 0
  fi

  return 1
}

install_kanata_vk_agent() {
  if kanata_vk_agent_bin >/dev/null 2>&1; then
    echo "✓ kanata-vk-agent already installed."
    return 0
  fi

  if ! command -v brew >/dev/null 2>&1; then
    die "Homebrew is required to install kanata-vk-agent. Install Homebrew, then rerun this script."
  fi

  brew tap devsunb/tap
  brew install kanata-vk-agent
}

write_vk_agent_plist() {
  local label="$1"
  local port="$2"
  local tmp_vk_agent_plist="$3"
  local vk_agent_bin

  vk_agent_bin="$(kanata_vk_agent_bin)"

  cat > "$tmp_vk_agent_plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${vk_agent_bin}</string>
        <string>-p</string>
        <string>${port}</string>
        <string>-b</string>
        <string>${VK_AGENT_BUNDLE_IDS}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>Crashed</key>
        <true/>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/${label}.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/${label}.err.log</string>
</dict>
</plist>
PLIST

  plutil -lint "$tmp_vk_agent_plist" >/dev/null
}

install_launchdaemon() {
  local label="$1"
  local cfg="$2"
  local port="$3"
  local plist_path="/Library/LaunchDaemons/${label}.plist"
  local tmp_plist
  tmp_plist="$(mktemp "/tmp/${label}.XXXXXX.plist")"

  write_plist "$label" "$cfg" "$port" "$tmp_plist"
  run_admin "cp '$tmp_plist' '$plist_path'; chown root:wheel '$plist_path'; chmod 644 '$plist_path'; launchctl bootout system/$label 2>/dev/null || true; : > /tmp/$label.out.log; : > /tmp/$label.err.log; launchctl enable system/$label; launchctl bootstrap system '$plist_path'; launchctl kickstart -k system/$label"
  rm -f "$tmp_plist"
}

stop_launchdaemon() {
  local label="$1"

  run_admin "launchctl bootout system/$label 2>/dev/null || true; launchctl disable system/$label 2>/dev/null || true"
}

remove_legacy_launchdaemon() {
  local label="$1"
  local plist_path="/Library/LaunchDaemons/${label}.plist"

  run_admin "launchctl bootout system/$label 2>/dev/null || true; launchctl disable system/$label 2>/dev/null || true; rm -f '$plist_path'"
}

install_vk_agent_launchagent() {
  local label="$1"
  local port="$2"
  local plist_path="${VK_AGENT_PLIST_DIR}/${label}.plist"
  local tmp_vk_agent_plist
  tmp_vk_agent_plist="$(mktemp "/tmp/${label}.XXXXXX.plist")"

  mkdir -p "$VK_AGENT_PLIST_DIR"
  write_vk_agent_plist "$label" "$port" "$tmp_vk_agent_plist"
  cp "$tmp_vk_agent_plist" "$plist_path"
  chmod 644 "$plist_path"
  : > /tmp/$label.out.log
  : > /tmp/$label.err.log
  launchctl bootout "gui/$(id -u)" "$plist_path" 2>/dev/null || true
  launchctl enable "gui/$(id -u)/$label"
  launchctl bootstrap "gui/$(id -u)" "$plist_path"
  launchctl kickstart -k "gui/$(id -u)/$label"
  rm -f "$tmp_vk_agent_plist"
}

stop_vk_agent_launchagent() {
  local label="$1"
  local plist_path="${VK_AGENT_PLIST_DIR}/${label}.plist"

  launchctl bootout "gui/$(id -u)" "$plist_path" 2>/dev/null || true
  launchctl disable "gui/$(id -u)/$label" 2>/dev/null || true
}

remove_legacy_vk_agent_launchagent() {
  local label="$1"
  local plist_path="${VK_AGENT_PLIST_DIR}/${label}.plist"

  launchctl bootout "gui/$(id -u)" "$plist_path" 2>/dev/null || true
  launchctl disable "gui/$(id -u)/$label" 2>/dev/null || true
  rm -f "$plist_path"
}

check_logs() {
  local label="$1"

  sleep 4
  if ! launchctl print "system/$label" >/dev/null 2>&1; then
    warn "Kanata LaunchDaemon is not loaded. Run: launchctl print system/$label"
    return 1
  fi

  if [[ -s /tmp/$label.err.log ]]; then
    warn "Kanata stderr is not empty for $label:"
    sed 's/^/  /' "/tmp/$label.err.log"
    if grep -q 'IOHIDDeviceOpen.*not permitted' "/tmp/$label.err.log"; then
      warn "macOS is still denying Input Monitoring for the Kanata binary. Remove and re-add $KANATA_BIN in Input Monitoring and Accessibility, then rerun this script."
    fi
    return 1
  fi

  if grep -q 'Starting kanata proper' "/tmp/$label.out.log"; then
    echo "✓ $label reached the processing loop."
  else
    warn "Kanata started, but the expected readiness line was not found yet. Check /tmp/$label.out.log."
  fi
}

check_vk_agent_logs() {
  local label="$1"

  sleep 2
  if ! launchctl print "gui/$(id -u)/$label" >/dev/null 2>&1; then
    warn "kanata-vk-agent LaunchAgent is not loaded. Run: launchctl print gui/$(id -u)/$label"
    return 1
  fi

  if [[ -s /tmp/$label.err.log ]]; then
    warn "kanata-vk-agent stderr is not empty for $label:"
    sed 's/^/  /' "/tmp/$label.err.log"
    warn "App-aware j+k depends on $label connecting to its Kanata TCP port."
    return 1
  fi

  echo "✓ $label LaunchAgent is loaded."
}

print_restart_checklist() {
  cat <<CHECKLIST

Next restart/login check:
  1. Restart your Mac, then log in.
  2. Confirm the root Kanata LaunchDaemons are running:
     launchctl print system/$PLIST_LABEL
     launchctl print system/$SCULPT_PLIST_LABEL
  3. Confirm the per-user kanata-vk-agent LaunchAgents are running:
     launchctl print gui/$(id -u)/$VK_AGENT_LABEL
     launchctl print gui/$(id -u)/$VK_AGENT_SCULPT_LABEL
  4. In a terminal app, press j+k and confirm it sends the tmux prefix (Ctrl+b).

If a root daemon fails after a rebuild, remove and re-add $KANATA_BIN in
Input Monitoring and Accessibility, then rerun: bb kanata-setup
CHECKLIST
}

step "Apply chezmoi-managed Kanata configs"
chezmoi apply --force --source="$DOTFILES_DIR/chezmoi" "$KANATA_CFG" "$KANATA_SCULPT_CFG"

step "Install patched Kanata with Cargo"
if ! command -v cargo >/dev/null 2>&1; then
  die "Cargo is missing. Install Rust from https://rustup.rs, open a new shell, then rerun this script."
fi
bash "$DOTFILES_DIR/scripts/install-kanata-macos.sh"

step "Install kanata-vk-agent"
install_kanata_vk_agent

step "Validate Kanata configs"
"$KANATA_BIN" --check --cfg "$KANATA_CFG"
"$KANATA_BIN" --check --cfg "$KANATA_SCULPT_CFG"

step "Karabiner DriverKit requirement"
if [[ -d "/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice" ]]; then
  echo "✓ Karabiner DriverKit appears to be installed."
elif [[ -d "/Applications/Karabiner-Elements.app" ]]; then
  warn "Karabiner Elements is installed, but the standalone DriverKit directory was not found. Open Karabiner Elements once and approve its driver prompts, or install Karabiner-DriverKit-VirtualHIDDevice from Kanata's macOS release notes."
else
  warn "Karabiner DriverKit was not found. Install Karabiner Elements or the standalone Karabiner-DriverKit-VirtualHIDDevice package before expecting Kanata output to work."
fi

step "Heads up: macOS permission setup is annoying"
warn "This is the frustrating part. macOS privacy grants are tied to the exact Kanata binary, and Cargo rebuilds can make old grants stale. If output does not work, remove and re-add $KANATA_BIN in both panes, then rerun bb kanata-setup."

step "Approve macOS Privacy permissions"
echo "System Settings will open now. In both Input Monitoring and Accessibility:"
echo "  1. Remove stale kanata entries if present."
echo "  2. Add and enable this exact binary: $KANATA_BIN"
echo "Finder will reveal the binary for drag-and-drop."
open_privacy_panes
read -r -p "Press Enter after you have enabled Kanata in both Privacy panes... "

step "Stop legacy Kanata helpers"
remove_legacy_vk_agent_launchagent "$SCULPT_HIDUTIL_LABEL"
remove_legacy_vk_agent_launchagent "$OTHER_VK_AGENT_LABEL"
remove_legacy_launchdaemon "$OTHER_PLIST_LABEL"

step "Install and restart Kanata LaunchDaemons"
install_launchdaemon "$PLIST_LABEL" "$KANATA_CFG" "$KANATA_TCP_PORT"
install_launchdaemon "$SCULPT_PLIST_LABEL" "$KANATA_SCULPT_CFG" "$KANATA_SCULPT_TCP_PORT"

step "Install and restart kanata-vk-agent LaunchAgents"
install_vk_agent_launchagent "$VK_AGENT_LABEL" "$KANATA_TCP_PORT"
install_vk_agent_launchagent "$VK_AGENT_SCULPT_LABEL" "$KANATA_SCULPT_TCP_PORT"

step "Verify LaunchDaemon logs"
check_logs "$PLIST_LABEL"
check_logs "$SCULPT_PLIST_LABEL"

step "Verify kanata-vk-agent LaunchAgent logs"
check_vk_agent_logs "$VK_AGENT_LABEL"
check_vk_agent_logs "$VK_AGENT_SCULPT_LABEL"

echo ""
echo "Kanata macOS setup is complete. Active profiles: $PLIST_LABEL and $SCULPT_PLIST_LABEL."
echo "For app-aware j+k: focus a terminal and press j+k for tmux prefix; focus a GUI app and press j+k, then one Cmd-layer key."
print_restart_checklist
