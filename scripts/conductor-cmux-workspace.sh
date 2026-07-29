#!/bin/sh
set -eu

PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export PATH

state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/conductor-cmux-workspaces"
mkdir -p "$state_dir"

action="${1:-}"
exec 2>>"$state_dir/log"
log() { printf '[%s] %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$action" "$*" >&2; }
trap 'rc=$?; if [ "$rc" = 0 ]; then log "ok"; else log "FAILED rc=$rc"; fi' EXIT
log "start path=${CONDUCTOR_WORKSPACE_PATH:-unset} name=${CONDUCTOR_WORKSPACE_NAME:-unset}"

cmux_bin=$(command -v cmux 2>/dev/null || true)
if [ -z "$cmux_bin" ] && [ -x /Applications/cmux.app/Contents/Resources/bin/cmux ]; then
  cmux_bin=/Applications/cmux.app/Contents/Resources/bin/cmux
fi
[ -n "$cmux_bin" ] || { log "cmux CLI not found"; exit 1; }

state_key=$(printf '%s' "${CONDUCTOR_WORKSPACE_PATH:?}" | python3 -c 'import hashlib, sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest()[:16])')
state_file="$state_dir/$state_key"

resolve_repo_name() {
  basename "$(dirname "$CONDUCTOR_WORKSPACE_PATH")"
}

workspace_label() {
  printf '%s-%s\n' "$(resolve_repo_name)" "$CONDUCTOR_WORKSPACE_NAME"
}

ensure_cmux() {
  open -a cmux >/dev/null 2>&1
  attempts=0
  until "$cmux_bin" ping >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    [ "$attempts" -lt 50 ] || { log "cmux socket did not become ready"; return 1; }
    sleep 0.1
  done
}

find_workspace() {
  wanted_id=$1
  wanted_label=$2
  "$cmux_bin" --id-format both workspace list --json 2>/dev/null | python3 -c '
import json, sys
wanted_id, wanted_label, wanted_path = sys.argv[1:]
data = json.load(sys.stdin)
if isinstance(data.get("result"), dict):
    data = data["result"]
for workspace in data.get("workspaces", []):
    workspace_id = workspace.get("id") or workspace.get("workspace_id") or workspace.get("workspaceId") or ""
    handles = {workspace_id, workspace.get("ref", "")}
    label = workspace.get("name") or workspace.get("title") or workspace.get("label") or ""
    path = workspace.get("current_directory") or workspace.get("cwd") or ""
    if (wanted_id and wanted_id in handles) or (not wanted_id and label == wanted_label and path == wanted_path):
        print(workspace_id)
        break
' "$wanted_id" "$wanted_label" "$CONDUCTOR_WORKSPACE_PATH"
}

parse_created_workspace() {
  python3 -c '
import json, sys
text = sys.stdin.read().strip()
if text.startswith("OK "):
    print(text[3:].strip())
else:
    data = json.loads(text)
    if isinstance(data.get("result"), dict):
        data = data["result"]
    print(data.get("id") or data.get("workspace_id") or data.get("workspaceId") or "")
'
}

# A fresh worktree's first cargo build is ~2.5 minutes even with the shared target
# dir (its own crates are the part that cannot be reused). Start it in the
# background at workspace creation so the wait happens while the issue is still
# being read, not when the dev server is wanted.
#
# ponytail: fire-and-forget, no locking, no progress reporting. Conductor blocks
# on this script, so it must never wait for cargo.
warm_rust_build() {
  app="$CONDUCTOR_WORKSPACE_PATH/apps/back2vibing"
  [ -f "$app/Cargo.toml" ] || return 0
  command -v cargo >/dev/null 2>&1 || return 0

  warm_log="$state_dir/warm-$state_key.log"
  # Same env as `tauri dev` (see the repo's scripts/run-tauri.mjs) so the dev
  # server finds these artifacts fresh instead of redoing them: incremental on,
  # rustc routed through the shim that keeps sccache for dependencies.
  shim="$app/scripts/rustc-sccache-shim.sh"
  [ -x "$shim" ] || shim=""

  log "warming rust build in background, log=$warm_log"
  CARGO_INCREMENTAL=1 CARGO_BUILD_RUSTC_WRAPPER="$shim" \
    nohup nice -n 10 sh -c '
      cd "$1" || exit 1
      cargo build -p back2vibing --lib
      cargo nextest run -p back2vibing --lib --no-run
    ' _ "$app" >"$warm_log" 2>&1 &
}

setup() {
  ensure_cmux
  label=$(workspace_label)
  workspace_id=

  if [ -f "$state_file" ]; then
    saved_id=$(cat "$state_file")
    workspace_id=$(find_workspace "$saved_id" "$label" || true)
  fi
  if [ -z "$workspace_id" ]; then
    workspace_id=$(find_workspace "" "$label" || true)
  fi

  if [ -z "$workspace_id" ]; then
    if [ -n "${CONDUCTOR_WORKSPACE_COMMAND:-}" ]; then
      response=$("$cmux_bin" --id-format uuids workspace create \
        --name "$label" \
        --cwd "$CONDUCTOR_WORKSPACE_PATH" \
        --command "$CONDUCTOR_WORKSPACE_COMMAND" \
        --focus true)
    else
      response=$("$cmux_bin" --id-format uuids workspace create \
        --name "$label" \
        --cwd "$CONDUCTOR_WORKSPACE_PATH" \
        --focus true)
    fi
    created_id=$(printf '%s' "$response" | parse_created_workspace)
    workspace_id=$(find_workspace "" "$label" || true)
    [ -n "$workspace_id" ] || workspace_id=$created_id
    [ -n "$workspace_id" ] || { log "cmux returned no workspace id"; return 1; }
  else
    "$cmux_bin" workspace select --workspace "$workspace_id" >/dev/null
  fi

  printf '%s\n' "$workspace_id" > "$state_file"
  log "focused workspace_id=$workspace_id"
  warm_rust_build
}

archive() {
  ensure_cmux
  label=$(workspace_label)
  workspace_id=

  if [ -f "$state_file" ]; then
    saved_id=$(cat "$state_file")
    workspace_id=$(find_workspace "$saved_id" "$label" || true)
  fi
  if [ -z "$workspace_id" ]; then
    workspace_id=$(find_workspace "" "$label" || true)
  fi
  if [ -n "$workspace_id" ]; then
    "$cmux_bin" workspace close --workspace "$workspace_id" >/dev/null 2>&1 || true
  fi
  rm -f "$state_file"
}

case "$action" in
  setup) setup ;;
  archive) archive ;;
  warm) warm_rust_build ;;
  *) printf 'usage: %s setup|archive|warm\n' "$0" >&2; exit 2 ;;
esac
