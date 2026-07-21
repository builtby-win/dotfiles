#!/usr/bin/env bash

set -u

state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/tmux"
order_file="$state_dir/sesh-order"

if [[ "${1:-}" == "save" ]]; then
  sesh_bin="${HOMEBREW_PREFIX:-/opt/homebrew}/bin/sesh"
  if [[ ! -x "$sesh_bin" ]]; then
    sesh_bin="$(command -v sesh)"
  fi

  mkdir -p "$state_dir"
  temporary_order="$order_file.$$"
  trap 'rm -f "$temporary_order"' EXIT
  "$sesh_bin" list -t > "$temporary_order" && mv "$temporary_order" "$order_file"
  exit
fi

if [[ "${1:-}" != "list" || -z "${2:-}" ]]; then
  printf 'Usage: %s save | list SESH_BIN [LIST_ARGS...]\n' "$0" >&2
  exit 1
fi

sesh_bin="$2"
shift 2

if [[ ! -r "$order_file" ]]; then
  exec "$sesh_bin" list "$@"
fi

temporary_dir="$(mktemp -d "${TMPDIR:-/tmp}/sesh-order.XXXXXX")"
trap 'rm -rf "$temporary_dir"' EXIT
raw_list="$temporary_dir/raw"
sessions="$temporary_dir/sessions"
ranked="$temporary_dir/ranked"
other="$temporary_dir/other"

"$sesh_bin" list "$@" > "$raw_list" || exit
if ! tmux list-sessions -F $'#{session_last_attached}\t#{session_name}' > "$sessions"; then
  cat "$raw_list"
  exit
fi

awk -v order_file="$order_file" -v sessions_file="$sessions" -v ranked_file="$ranked" -v other_file="$other" '
  FILENAME == order_file { order[$0] = FNR; next }
  FILENAME == sessions_file {
    split($0, fields, "\t")
    attached[fields[2]] = fields[1]
    next
  }
  {
    name = $0
    sub(/^[^[:space:]]+[[:space:]]+/, "", name)
    if (name in attached) {
      rank = name in order ? order[name] : 999999
      print attached[name] "\t" rank "\t" $0 > ranked_file
    } else {
      print > other_file
    }
  }
' "$order_file" "$sessions" "$raw_list"

if [[ -s "$ranked" ]]; then
  LC_ALL=C sort -t $'\t' -k1,1nr -k2,2n -k3,3 "$ranked" | cut -f3-
fi
[[ ! -s "$other" ]] || cat "$other"
