# Dotfiles tips (opt-in)
# Shows a tip once per day unless forced.

dotfiles_tip() {
  local mode="${1:-}"
  local tips_dir

  tips_dir="$DOTFILES_DIR"
  if [[ -z "$tips_dir" && -f "$HOME/.config/dotfiles/path" ]]; then
    tips_dir="$(cat "$HOME/.config/dotfiles/path")"
  fi

  if [[ -z "$tips_dir" ]]; then
    return 0
  fi

  local tips_file="$tips_dir/shell/tips.txt"
  if [[ ! -f "$tips_file" ]]; then
    return 0
  fi

  local tip
  tip="$(awk 'BEGIN{srand()} NF && $1 !~ /^#/ {lines[++n]=$0} END {if (n>0) print lines[int(rand()*n)+1]}' "$tips_file")"

  if [[ -z "$tip" ]]; then
    return 0
  fi

  if [[ "$mode" != "--force" ]]; then
    local cache_dir="${DOTFILES_CACHE_DIR:-$HOME/.cache/dotfiles}"
    local stamp_file="$cache_dir/tips-last-shown"
    local today
    today="$(date +%Y-%m-%d)"

    if [[ -f "$stamp_file" ]]; then
      local last_shown
      last_shown="$(cat "$stamp_file" 2>/dev/null)"
      if [[ "$last_shown" == "$today" ]]; then
        return 0
      fi
    fi

    mkdir -p "$cache_dir" 2>/dev/null
    printf '%s' "$today" > "$stamp_file"
  fi

  echo "Tip: $tip"
}

# Show a tip on shell start
if [[ "${DOTFILES_TIPS_AUTO:-1}" == "1" ]]; then
  dotfiles_tip
fi
