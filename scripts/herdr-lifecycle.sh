#!/bin/sh
set -eu

usage() {
  echo "usage: $0 start <repo> <label> | archive <workspace-id>" >&2
  exit 2
}

start() {
  repo=$1
  label=$2
  response=$(herdr workspace create --cwd "$repo" --label "$label" --focus)
  workspace_id=$(printf '%s' "$response" | python3 -c 'import json, sys; print(json.load(sys.stdin)["result"]["workspace_id"])')
  herdr workspace focus "$workspace_id" >/dev/null
  open -a Ghostty
  printf '%s\n' "$workspace_id"
}

archive() {
  herdr workspace close "$1"
}

[ "$#" -ge 2 ] || usage
case "$1" in
  start) [ "$#" -eq 3 ] || usage; start "$2" "$3" ;;
  archive) [ "$#" -eq 2 ] || usage; archive "$2" ;;
  *) usage ;;
esac
