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
# No rotation; truncate this log by hand if needed.
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

first_pane_in_workspace() {
  herdr pane list 2>/dev/null | python3 -c '
import json, sys
workspace_id = sys.argv[1]
data = json.load(sys.stdin)
for pane in data.get("result", {}).get("panes", []):
    if pane.get("workspace_id") == workspace_id:
        print(pane.get("pane_id", ""))
        break
' "$1"
}

setup() {
  if [ ! -f "$state_file" ] && [ -f "$legacy_state_file" ]; then
    cp "$legacy_state_file" "$state_file"
  fi

  label=$(workspace_label)
  created=0

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
      --no-focus)
    workspace_id=$(printf '%s' "$response" | python3 -c 'import json, sys; res = json.load(sys.stdin).get("result", {}); print(res.get("workspace_id") or res.get("workspace", {}).get("workspace_id", ""))')
    if [ -n "$workspace_id" ]; then
      printf '%s\n' "$workspace_id" > "$state_file"
      created=1
    fi
  else
    # Existing workspace: keep whatever label it already has.
    printf '%s\n' "$workspace_id" > "$state_file"
  fi

  if [ -n "$workspace_id" ]; then
    open -a Ghostty
    herdr workspace focus "$workspace_id" >/dev/null
    if [ "$created" = 1 ] && [ -n "${CONDUCTOR_WORKSPACE_COMMAND:-}" ]; then
      pane_id=$(first_pane_in_workspace "$workspace_id")
      if [ -n "$pane_id" ]; then
        log "running command in pane_id=$pane_id"
        herdr pane send-text "$pane_id" "$CONDUCTOR_WORKSPACE_COMMAND" >/dev/null
        herdr pane send-keys "$pane_id" enter >/dev/null
      fi
    fi
  fi
}

archive() {
  saved_id=
  if [ -f "$state_file" ]; then
    saved_id=$(cat "$state_file")
  elif [ -f "$legacy_state_file" ]; then
    saved_id=$(cat "$legacy_state_file")
  fi

  # Capture commands separately from parsers: POSIX sh pipelines otherwise
  # hide the CLI's exit status. Never treat an unavailable server as absence.
  list_json=$(herdr workspace list)
  workspace_id=$(printf '%s' "$list_json" | python3 -c '
import json, sys
workspaces = json.load(sys.stdin)["result"]["workspaces"]
if not isinstance(workspaces, list) or any(
    not isinstance(w, dict) or not isinstance(w.get("workspace_id"), str)
    or not w["workspace_id"] for w in workspaces
):
    sys.exit("Invalid Herdr workspace list")
saved_id = sys.argv[1]
if any(w["workspace_id"] == saved_id for w in workspaces):
    print(saved_id)
' "$saved_id")

  if [ -z "$workspace_id" ]; then
    pane_json=$(herdr pane list)
    workspace_id=$(printf '%s' "$pane_json" | python3 -c '
import json, os, sys
panes = json.load(sys.stdin)["result"]["panes"]
if not isinstance(panes, list) or any(not isinstance(p, dict) for p in panes):
    sys.exit("Invalid Herdr pane list")
workspaces = json.loads(sys.argv[1])["result"]["workspaces"]
target, label, name = sys.argv[2:]
target = os.path.realpath(target)
live_ids = {w["workspace_id"] for w in workspaces}
matches = {
    p.get("workspace_id") for p in panes
    if p.get("workspace_id") in live_ids and any(
        isinstance(cwd, str) and (
            os.path.realpath(cwd) == target or os.path.realpath(cwd).startswith(target + "/")
        )
        for cwd in (p.get("cwd"), p.get("foreground_cwd"))
    )
}
if not matches:
    matches = {w["workspace_id"] for w in workspaces if w.get("label") == label}
if not matches:
    matches = {w["workspace_id"] for w in workspaces if w.get("label") == name}
if len(matches) > 1:
    sys.exit("Ambiguous Herdr workspace match; refusing to close")
if matches:
    print(next(iter(matches)))
' "$list_json" "$CONDUCTOR_WORKSPACE_PATH" "$(workspace_label)" "$CONDUCTOR_WORKSPACE_NAME")
  fi

  if [ -n "$workspace_id" ]; then
    # Keep the resolved ID for retry, including when the original ID was stale.
    printf '%s\n' "$workspace_id" > "$state_file"
    log "closing workspace_id=$workspace_id"
    herdr workspace close "$workspace_id" >/dev/null

    remaining_json=$(herdr workspace list)
    printf '%s' "$remaining_json" | python3 -c '
import json, sys
workspaces = json.load(sys.stdin)["result"]["workspaces"]
if not isinstance(workspaces, list) or any(
    not isinstance(w, dict) or not isinstance(w.get("workspace_id"), str)
    or not w["workspace_id"] for w in workspaces
):
    sys.exit("Invalid Herdr workspace list after close")
if any(w["workspace_id"] == sys.argv[1] for w in workspaces):
    sys.exit("Herdr workspace is still open after close: " + sys.argv[1])
' "$workspace_id"
    log "closed workspace_id=$workspace_id"
  else
    log "workspace already absent"
  fi
  rm -f "$state_file" "$legacy_state_file"
}

case "${1:-}" in
  setup) setup ;;
  archive) archive ;;
  *) printf 'usage: %s setup|archive\n' "$0" >&2; exit 2 ;;
esac
