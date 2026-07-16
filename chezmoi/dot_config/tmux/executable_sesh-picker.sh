#!/usr/bin/env bash

set -u

# tmux resolves `sesh` to a stale non-macOS binary in ~/.local/bin on this host.
sesh_bin="${HOMEBREW_PREFIX:-/opt/homebrew}/bin/sesh"
if [[ ! -x "$sesh_bin" ]]; then
  sesh_bin="$(command -v sesh)"
fi

selection="$(
  "$sesh_bin" list -t --icons | fzf \
    --ansi \
    --layout=reverse \
    --cycle \
    --highlight-line \
    --border=rounded \
    --border-label ' Sessions ' \
    --input-border=rounded \
    --input-label ' Search ' \
    --list-border=rounded \
    --list-label ' Results ' \
    --preview-border=rounded \
    --preview-label ' Details ' \
    --preview-window 'right:42%,nowrap,border-rounded,<50(down:38%,nowrap,border-rounded)' \
    --footer ' ↵ open  ^A all  ^T open  ^P preview  ^X kill ' \
    --footer-border=line \
    --info=inline-right \
    --prompt 'Open ›  ' \
    --pointer '›' \
    --padding '0,1' \
    --color 'bg:#303446,bg+:#414559,fg:#c6d0f5,fg+:#c6d0f5,hl:#8caaee,hl+:#8caaee,border:#737994,label:#ca9ee6,prompt:#99d1db,pointer:#99d1db,info:#a5adce,header:#a5adce' \
    --bind 'ctrl-j:down,ctrl-k:up,ctrl-p:toggle-preview' \
    --bind "ctrl-x:execute-silent(tmux kill-session -t {2..})+reload($sesh_bin list -t --icons)+change-prompt(Open ›  )+clear-query" \
    --bind "ctrl-a:reload($sesh_bin list --icons --hide-duplicates)+change-prompt(All ›  )+clear-query" \
    --bind "ctrl-t:reload($sesh_bin list -t --icons)+change-prompt(Open ›  )+clear-query" \
    --bind "ctrl-g:reload($sesh_bin list -c --icons)+change-prompt(Configs ›  )+clear-query" \
    --bind "ctrl-z:reload($sesh_bin list -z --icons)+change-prompt(Folders ›  )+clear-query" \
    --preview "if tmux has-session -t {2..} 2>/dev/null; then printf 'Windows\n\n'; tmux list-windows -t {2..} -F '  #I  #W  · #{window_panes} panes'; printf '\nPanes\n\n'; tmux list-panes -s -t {2..} -F '  #I.#P  #{pane_current_command}  · #{pane_current_path}'; else printf 'Project\n\n  %s\n' {2..}; fi"
)" || exit 0

[[ -z "$selection" ]] && exit 0

"$sesh_bin" connect "$selection"
