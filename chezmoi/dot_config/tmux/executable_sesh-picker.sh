#!/usr/bin/env bash

set -u

# tmux resolves `sesh` to a stale non-macOS binary in ~/.local/bin on this host.
sesh_bin="${HOMEBREW_PREFIX:-/opt/homebrew}/bin/sesh"
if [[ ! -x "$sesh_bin" ]]; then
  sesh_bin="$(command -v sesh)"
fi
session_order="$HOME/.config/tmux/session-order.sh"

# Build fzf args compatible with both old (0.44/Debian) and new fzf.
# Newer fzf supports --highlight-line, --input-border, --footer, transform, etc.;
# older versions exit 2 on those flags and close the popup immediately.
fzf_supports() { fzf --help 2>&1 | grep -q -- "$1"; }

fzf_args=(
  --ansi --disabled --layout=reverse --cycle
  --border=rounded --border-label ' Sessions '
  --preview-window 'right:42%,follow,nowrap,border-rounded,<50(hidden)'
  --info=inline-right --prompt 'Nav ›  ' --pointer '›'
  --color 'bg:#303446,bg+:#414559,fg:#c6d0f5,fg+:#c6d0f5,hl:#8caaee,hl+:#8caaee,border:#737994,label:#ca9ee6,prompt:#99d1db,pointer:#99d1db,info:#a5adce,header:#a5adce'
  --bind 'ctrl-j:down,ctrl-k:up,ctrl-p:toggle-preview'
  --bind 'j:down,k:up,q:abort,/:enable-search+change-prompt(Search ›  )+unbind(j,k,q,/)'
  --bind 'esc:abort'
  --bind "ctrl-x:execute-silent(tmux kill-session -t {2..})+reload($session_order list $sesh_bin -t --icons)+clear-query"
  --bind "ctrl-a:reload($session_order list $sesh_bin --icons --hide-duplicates)+clear-query"
  --bind "ctrl-t:reload($session_order list $sesh_bin -t --icons)+clear-query"
  --bind "ctrl-g:reload($sesh_bin list -c --icons)+clear-query"
  --bind "ctrl-z:reload($sesh_bin list -z --icons)+clear-query"
  --preview "if tmux has-session -t {2..} 2>/dev/null; then tmux capture-pane -ep -t {2..}; else printf 'Project\n  %s\n\nStatus\n  not running · Enter starts it\n' {2..}; fi"
)
if fzf_supports --highlight-line; then
  fzf_args+=(--highlight-line --padding '0,1')
fi
if fzf_supports --input-border; then
  fzf_args+=(--input-border=rounded --input-label ' Search ' --list-border=rounded --list-label ' Results ' --preview-border=rounded --preview-label ' Active pane ' --footer ' nav j/k  / search  esc close  ↵ open ' --footer-border=line)
else
  fzf_args+=(--header ' j/k nav  / search  esc close  enter open ')
fi
if fzf_supports "transform"; then
  fzf_args+=(--bind "change:transform:[[ -z \"\$FZF_QUERY\" ]] && echo \"reload($session_order list $sesh_bin -t --icons)+disable-search+change-prompt(Nav ›  )+rebind(j,k,q,/)\"")
fi

selection="$(
  "$session_order" list "$sesh_bin" -t --icons | fzf "${fzf_args[@]}"
)" || exit 0

[[ -z "$selection" ]] && exit 0

# fzf --ansi preserves ANSI colour codes in output; sesh connect fails when
# those escapes are present (e.g. "\x1b[34m\uebc8\x1b[39m 10" -> exit 1).
# Strip ANSI then drop the leading icon field to match the `prefix S` binding's
# {2..} extraction (icon + session/path -> session/path).
clean_selection="$(printf '%s' "$selection" | sed 's/\x1b\[[0-9;]*m//g')"
stripped_selection="$(printf '%s' "$clean_selection" | sed 's/^[^ ]* *//')"
if [[ -n "$stripped_selection" ]]; then
  selection="$stripped_selection"
else
  selection="$clean_selection"
fi

"$sesh_bin" connect "$selection"
