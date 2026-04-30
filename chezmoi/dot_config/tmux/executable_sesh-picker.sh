#!/usr/bin/env bash

set -u

# tmux resolves `sesh` to a stale non-macOS binary in ~/.local/bin on this host.
sesh_bin="${HOMEBREW_PREFIX:-/opt/homebrew}/bin/sesh"
if [[ ! -x "$sesh_bin" ]]; then
  sesh_bin="$(command -v sesh)"
fi

selection="$(
  "$sesh_bin" list --icons --hide-duplicates | fzf \
    --no-sort --ansi --disabled \
    --prompt '⚡  ' \
    --header '  j/k nav  / search  esc close/nav  enter select  x kill  ^a all  ^t tmux  ^g configs  ^x zoxide' \
    --bind 'j:down,k:up' \
    --bind '/:enable-search+change-prompt(🔍  )+unbind(j,k)+unbind(esc)' \
    --bind 'esc:abort' \
    --bind "x:execute(tmux kill-session -t {2..})+reload($sesh_bin list --icons --hide-duplicates)" \
    --bind "ctrl-a:disable-search+change-prompt(⚡  )+rebind(j,k,esc)+reload($sesh_bin list --icons --hide-duplicates)" \
    --bind "ctrl-t:disable-search+change-prompt(🪟  )+rebind(j,k,esc)+reload($sesh_bin list -t --icons)" \
    --bind "ctrl-g:disable-search+change-prompt(⚙️  )+rebind(j,k,esc)+reload($sesh_bin list -c --icons)" \
    --bind "ctrl-x:disable-search+change-prompt(📁  )+rebind(j,k,esc)+reload($sesh_bin list -z --icons)" \
    --preview-window 'right:55%' \
    --preview "echo \"Windows:\" && tmux list-windows -t {2..} -F \" #I: #W (#{window_panes} panes)\" && echo \"\\nPreview:\" && $sesh_bin preview {2..}"
)" || exit 0

[[ -z "$selection" ]] && exit 0

"$sesh_bin" connect "$selection"
