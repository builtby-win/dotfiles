#!/usr/bin/env bash

session_name="${1:-}"
session_path="${2:-}"

if [[ -z "$session_name" ]]; then
  exit 0
fi

layout_enabled="$(tmux show-options -gqv @builtby_bootstrap_layout 2>/dev/null)"
if [[ "$layout_enabled" != "on" && "$layout_enabled" != "1" && "$layout_enabled" != "true" ]]; then
  exit 0
fi

if [[ -z "$session_path" ]]; then
  session_path="$HOME"
fi

if [[ "$(tmux show-options -t "$session_name" -v @bb_bootstrapped 2>/dev/null)" == "1" ]]; then
  exit 0
fi

window_count="$(tmux list-windows -t "$session_name" 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$window_count" -ne 1 ]]; then
  tmux set-option -t "$session_name" @bb_bootstrapped 1 >/dev/null 2>&1
  exit 0
fi

pane_count="$(tmux list-panes -t "$session_name:1" 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$pane_count" -ne 1 ]]; then
  tmux set-option -t "$session_name" @bb_bootstrapped 1 >/dev/null 2>&1
  exit 0
fi

tmux rename-window -t "$session_name:1" "work"
tmux split-window -h -t "$session_name:1" -c "$session_path"
tmux select-layout -t "$session_name:1" even-horizontal
tmux new-window -t "$session_name:" -n "tools" -c "$session_path"
tmux select-window -t "$session_name:1"
tmux set-option -t "$session_name" @bb_bootstrapped 1 >/dev/null 2>&1
