#!/bin/sh
set -eu

state_dir="$HOME/.conductor-herdr-workspaces"
state_key=$(printf '%s' "${CONDUCTOR_WORKSPACE_PATH:?}" | python3 -c 'import hashlib, sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest()[:16])')
state_file="$state_dir/$state_key"

resolve_repo_name() {
  repo_path="${CONDUCTOR_REPO_PATH:-${CONDUCTOR_PROJECT_PATH:-$CONDUCTOR_WORKSPACE_PATH}}"
  git_common_dir=$(git -C "$repo_path" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  if [ -n "$git_common_dir" ]; then
    basename "$(dirname "$git_common_dir")"
  else
    basename "$repo_path"
  fi
}

workspace_label() {
  printf '%s-%s\n' "$(resolve_repo_name)" "$CONDUCTOR_WORKSPACE_NAME"
}

setup() {
  mkdir -p "$state_dir"

  label=$(workspace_label)

  workspace_id=
  if [ -f "$state_file" ]; then
    workspace_id=$(cat "$state_file")
    if ! herdr workspace get "$workspace_id" >/dev/null 2>&1; then
      workspace_id=
    fi
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
    herdr workspace rename "$workspace_id" "$label" >/dev/null 2>&1 || true
    printf '%s\n' "$workspace_id" > "$state_file"
  fi
  if [ -n "$workspace_id" ]; then
    herdr workspace focus "$workspace_id" >/dev/null
    open -a Ghostty
  fi
}

archive() {
  workspace_id=
  if [ -f "$state_file" ]; then
    workspace_id=$(cat "$state_file")
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
  rm -f "$state_file"
}

case "${1:-}" in
  setup) setup ;;
  archive) archive ;;
  *) printf 'usage: %s setup|archive\n' "$0" >&2; exit 2 ;;
esac
