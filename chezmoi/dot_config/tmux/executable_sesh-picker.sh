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
    --disabled \
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
    --preview-label ' Active pane ' \
    --preview-window 'right:42%,follow,nowrap,border-rounded,<50(down:50%,follow,nowrap,border-rounded)' \
    --footer ' nav j/k  / search  esc close  ↵ open ' \
    --footer-border=line \
    --info=inline-right \
    --prompt 'Nav ›  ' \
    --pointer '›' \
    --padding '0,1' \
    --color 'bg:#303446,bg+:#414559,fg:#c6d0f5,fg+:#c6d0f5,hl:#8caaee,hl+:#8caaee,border:#737994,label:#ca9ee6,prompt:#99d1db,pointer:#99d1db,info:#a5adce,header:#a5adce' \
    --bind 'ctrl-j:down,ctrl-k:up,ctrl-p:toggle-preview' \
    --bind 'j:down,k:up,q:abort,/:enable-search+change-prompt(Search ›  )+unbind(j,k,q,/)' \
    --bind 'esc:abort' \
    --bind "change:transform:[[ -z \"\$FZF_QUERY\" ]] && echo \"reload($sesh_bin list -t --icons)+disable-search+change-prompt(Nav ›  )+rebind(j,k,q,/)\"" \
    --bind "ctrl-x:execute-silent(tmux kill-session -t {2..})+reload($sesh_bin list -t --icons)+clear-query" \
    --bind "ctrl-a:reload($sesh_bin list --icons --hide-duplicates)+clear-query" \
    --bind "ctrl-t:reload($sesh_bin list -t --icons)+clear-query" \
    --bind "ctrl-g:reload($sesh_bin list -c --icons)+clear-query" \
    --bind "ctrl-z:reload($sesh_bin list -z --icons)+clear-query" \
    --preview "if tmux has-session -t {2..} 2>/dev/null; then tmux capture-pane -ep -t {2..}; else printf 'Project\n  %s\n\nStatus\n  not running · Enter starts it\n' {2..}; fi"
)" || exit 0

[[ -z "$selection" ]] && exit 0

"$sesh_bin" connect "$selection"
