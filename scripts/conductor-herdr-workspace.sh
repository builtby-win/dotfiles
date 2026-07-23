#!/bin/sh
set -eu

state_dir="$HOME/.conductor-herdr-workspaces"
state_key=$(printf '%s' "${CONDUCTOR_WORKSPACE_PATH:?}" | python3 -c 'import hashlib, sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest()[:16])')
state_file="$state_dir/$state_key"

setup() {
  mkdir -p "$state_dir"
  response=$(herdr workspace create \
    --cwd "$CONDUCTOR_WORKSPACE_PATH" \
    --label "$CONDUCTOR_WORKSPACE_NAME" \
    --focus)
  workspace_id=$(printf '%s' "$response" | python3 -c 'import json, sys; print(json.load(sys.stdin)["result"]["workspace_id"])')
  herdr workspace focus "$workspace_id" >/dev/null
  printf '%s\n' "$workspace_id" > "$state_file"
  open -a Ghostty
}

archive() {
  if [ -f "$state_file" ]; then
    workspace_id=$(cat "$state_file")
    herdr workspace close "$workspace_id" >/dev/null 2>&1 || true
    rm -f "$state_file"
  fi
}

case "${1:-}" in
  setup) setup ;;
  archive) archive ;;
  *) printf 'usage: %s setup|archive\n' "$0" >&2; exit 2 ;;
esac
