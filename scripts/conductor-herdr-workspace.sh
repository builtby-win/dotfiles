#!/bin/sh
set -eu

# Conductor runs scripts without the interactive shell's PATH, so herdr and
# python3 have to be found explicitly.
PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export PATH

state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/conductor-herdr-workspaces"
legacy_state_dir="$HOME/.conductor-herdr-workspaces"
mkdir -p "$state_dir"

# Conductor swallows script output, so send every diagnostic to a log instead.
# ponytail: no rotation; two lines per workspace create, truncate by hand if it ever matters.
action="${1:-}"
exec 2>>"$state_dir/log"
log() { printf '[%s] %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$action" "$*" >&2; }
trap 'rc=$?; if [ "$rc" = 0 ]; then log "ok"; else log "FAILED rc=$rc"; fi' EXIT
log "start path=${CONDUCTOR_WORKSPACE_PATH:-unset} name=${CONDUCTOR_WORKSPACE_NAME:-unset}"

state_key=$(printf '%s' "${CONDUCTOR_WORKSPACE_PATH:?}" | python3 -c 'import hashlib, sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest()[:16])')
state_file="$state_dir/$state_key"
legacy_state_file="$legacy_state_dir/$state_key"

resolve_repo_name() {
  # Conductor workspaces are always grouped as <repo>/<workspace>.
  basename "$(dirname "$CONDUCTOR_WORKSPACE_PATH")"
}

workspace_label() {
  printf '%s-%s\n' "$(resolve_repo_name)" "$CONDUCTOR_WORKSPACE_NAME"
}
find_workspace_by_path() {
  herdr pane list 2>/dev/null | python3 -c '
import json, sys
target = sys.argv[1]
data = json.load(sys.stdin)
for pane in data.get("result", {}).get("panes", []):
    if pane.get("cwd") == target or pane.get("foreground_cwd") == target:
        print(pane.get("workspace_id", ""))
        break
' "$CONDUCTOR_WORKSPACE_PATH"
}


setup() {
  if [ ! -f "$state_file" ] && [ -f "$legacy_state_file" ]; then
    cp "$legacy_state_file" "$state_file"
  fi

  label=$(workspace_label)

  workspace_id=
  if [ -f "$state_file" ]; then
    workspace_id=$(cat "$state_file")
    if ! herdr workspace get "$workspace_id" >/dev/null 2>&1; then
      workspace_id=
    fi
  fi

  if [ -z "$workspace_id" ]; then
    workspace_id=$(find_workspace_by_path || true)
  fi

  if [ -z "$workspace_id" ]; then
    list_json=$(herdr workspace list 2>/dev/null || echo "")
    if [ -n "$list_json" ]; then
      workspace_id=$(printf '%s' "$list_json" | python3 -c '
import json, sys
data = json.load(sys.stdin)
target_label = sys.argv[1]
ws_name = sys.argv[2]
for w in data.get("result", {}).get("workspaces", []):
    lbl = w.get("label", "")
    if (target_label and lbl == target_label) or (ws_name and lbl == ws_name):
        print(w.get("workspace_id", ""))
        break
' "$label" "$CONDUCTOR_WORKSPACE_NAME")
    fi
  fi

  if [ -z "$workspace_id" ]; then
    response=$(herdr workspace create \
      --cwd "$CONDUCTOR_WORKSPACE_PATH" \
      --label "$label" \
      --focus)
    workspace_id=$(printf '%s' "$response" | python3 -c 'import json, sys; res = json.load(sys.stdin).get("result", {}); print(res.get("workspace_id") or res.get("workspace", {}).get("workspace_id", ""))')
    if [ -n "$workspace_id" ]; then
      printf '%s\n' "$workspace_id" > "$state_file"
    fi
  else
    # Keep labels managed by conductor-workspace-summary intact.
    printf '%s\n' "$workspace_id" > "$state_file"
  fi
  if [ -n "$workspace_id" ]; then
    herdr workspace focus "$workspace_id" >/dev/null
    open -a Ghostty
  fi
}

archive() {
  if [ ! -f "$state_file" ] && [ -f "$legacy_state_file" ]; then
    state_file="$legacy_state_file"
  fi
  workspace_id=
  if [ -f "$state_file" ]; then
    workspace_id=$(cat "$state_file")
  fi

  if [ -z "$workspace_id" ]; then
    workspace_id=$(find_workspace_by_path || true)
  fi

  if [ -z "$workspace_id" ]; then
    label=$(workspace_label)
    list_json=$(herdr workspace list 2>/dev/null || echo "")
    if [ -n "$list_json" ]; then
      workspace_id=$(printf '%s' "$list_json" | python3 -c '
import json, sys
data = json.load(sys.stdin)
target_label = sys.argv[1]
ws_name = sys.argv[2]
for w in data.get("result", {}).get("workspaces", []):
    lbl = w.get("label", "")
    if (target_label and lbl == target_label) or (ws_name and lbl == ws_name):
        print(w.get("workspace_id", ""))
        break
' "$label" "$CONDUCTOR_WORKSPACE_NAME")
    fi
  fi

  if [ -n "$workspace_id" ]; then
    herdr workspace close "$workspace_id" >/dev/null 2>&1 || true
  fi
  rm -f "$state_file" "$legacy_state_file"
}

case "${1:-}" in
  setup) setup ;;
  archive) archive ;;
  *) printf 'usage: %s setup|archive\n' "$0" >&2; exit 2 ;;
esac
