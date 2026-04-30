# Shell functions
# builtby.win/dotfiles

# Interactive branch checkout with fzf
co() {
  if [[ $# -gt 0 ]]; then
    git checkout "$@"
  else
    git checkout $(git branch -l | sed 's/^ *//' | fzf --preview 'git show heads/{} | diff-so-fancy' 2>/dev/null || git branch -l | sed 's/^ *//' | fzf)
  fi
}

# Checkout recent branches with fzf
cor() {
  co $(git recent $1 | fzf)
}

# Create new branch with prefix
cob() {
  git checkout -b "$(echo $* | tr ' ' -)"
}

# Download audio as mp3 (requires yt-dlp)
mp3() {
  if [[ $# -gt 0 ]]; then
    builtin cd ~/Downloads
    yt-dlp -f 'ba' -x --audio-format mp3 "$@"
    builtin cd -
  fi
}

# Download video as mp4 (requires yt-dlp)
mp4() {
  if [[ $# -gt 0 ]]; then
    builtin cd ~/Downloads
    yt-dlp -S res,ext:mp4:m4a --recode mp4 "$@"
    builtin cd -
  fi
}

# Make directory and cd into it
mkcd() {
  mkdir -p "$1" && cd "$1"
}

# Extract any archive
extract() {
  if [[ -f "$1" ]]; then
    case "$1" in
      *.tar.bz2) tar xjf "$1" ;;
      *.tar.gz)  tar xzf "$1" ;;
      *.bz2)     bunzip2 "$1" ;;
      *.rar)     unrar x "$1" ;;
      *.gz)      gunzip "$1" ;;
      *.tar)     tar xf "$1" ;;
      *.tbz2)    tar xjf "$1" ;;
      *.tgz)     tar xzf "$1" ;;
      *.zip)     unzip "$1" ;;
      *.Z)       uncompress "$1" ;;
      *.7z)      7z x "$1" ;;
      *)         echo "'$1' cannot be extracted" ;;
    esac
  else
    echo "'$1' is not a valid file"
  fi
}

# Resolve dotfiles directory
_dotfiles_dir() {
  if [[ -n "$DOTFILES_DIR" ]]; then
    echo "$DOTFILES_DIR"
    return 0
  fi

  if [[ -f "$HOME/.config/dotfiles/path" ]]; then
    cat "$HOME/.config/dotfiles/path"
    return 0
  fi

  if [[ -d "$HOME/dotfiles" ]]; then
    echo "$HOME/dotfiles"
    return 0
  fi

  if [[ -d "$HOME/builtby.win/dotfiles" ]]; then
    echo "$HOME/builtby.win/dotfiles"
    return 0
  fi

  return 1
}

_sync_workmux_config() {
  local dotfiles_dir="$1"
  local template_path="$dotfiles_dir/templates/workmux/config.yaml"
  local target_dir="$HOME/.config/workmux"
  local target_path="$target_dir/config.yaml"

  if [[ ! -f "$template_path" ]]; then
    echo "Workmux template not found. Skipping local workmux config sync."
    return 0
  fi

  mkdir -p "$target_dir"

  if [[ -f "$target_path" ]]; then
    if cmp -s "$template_path" "$target_path"; then
      echo "Workmux config already up to date."
      return 0
    fi

    local backup_dir="${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles/backups/workmux"
    mkdir -p "$backup_dir"
    local backup_path="$backup_dir/config.yaml.dotfiles-backup.$(date +%s)"
    cp "$target_path" "$backup_path"
    _bb_prune_backups "$backup_dir" "config.yaml.dotfiles-backup." 1
    cp "$template_path" "$target_path"
    echo "Updated workmux config: $target_path (backup: $backup_path)"
    return 0
  fi

  cp "$template_path" "$target_path"
  echo "Created workmux config: $target_path"
}

_bb_prune_backups() {
  local backup_dir="$1"
  local prefix="${2:-}"
  local keep="${3:-1}"
  local auto_yes="${4:-1}"

  if [[ ! -d "$backup_dir" ]]; then
    return 0
  fi

  local -a matches
  local path name
  shopt -s nullglob
  for path in "$backup_dir"/*; do
    name="${path##*/}"
    if [[ -z "$prefix" || "$name" == "$prefix"* ]]; then
      matches+=("$path")
    fi
  done
  shopt -u nullglob

  if [[ ${#matches[@]} -le "$keep" ]]; then
    return 0
  fi

  IFS=$'\n' matches=($(printf '%s\n' "${matches[@]}" | sort -r))
  unset IFS
  local -a stale=("${matches[@]:$keep}")

  if [[ ${#stale[@]} -eq 0 ]]; then
    return 0
  fi

  if [[ "$auto_yes" != "1" ]]; then
    echo "Would remove old backups:"
    printf '  - %s\n' "${stale[@]}"
    echo "Run again with --yes to delete them."
    return 0
  fi

  rm -f -- "${stale[@]}"
  printf 'Removed old backups:\n'
  printf '  - %s\n' "${stale[@]}"
}

_bb_prune_backup_groups() {
  local backup_dir="$1"
  local keep="${2:-1}"
  local auto_yes="${3:-0}"

  if [[ ! -d "$backup_dir" ]]; then
    return 0
  fi

  local -A groups
  local -a group_keys
  local path name group_key

  shopt -s nullglob
  for path in "$backup_dir"/*.dotfiles-backup.*; do
    name="${path##*/}"
    group_key="${name%.dotfiles-backup.*}"
    if [[ -z "${groups[$group_key]:-}" ]]; then
      group_keys+=("$group_key")
      groups[$group_key]="$path"
    else
      groups[$group_key]+=$'\n'"$path"
    fi
  done
  shopt -u nullglob

  local key
  for key in "${group_keys[@]}"; do
    mapfile -t group_paths < <(printf '%s\n' "${groups[$key]}" | sort -r)
    if [[ ${#group_paths[@]} -le "$keep" ]]; then
      continue
    fi

    local -a stale=("${group_paths[@]:$keep}")
    if [[ "$auto_yes" != "1" ]]; then
      echo "Would remove old backups for $key:"
      printf '  - %s\n' "${stale[@]}"
      continue
    fi

    rm -f -- "${stale[@]}"
    printf 'Removed old backups for %s:\n' "$key"
    printf '  - %s\n' "${stale[@]}"
  done

  if [[ "$auto_yes" != "1" ]]; then
    echo "Run again with --yes to delete them."
  fi
}

_bb_tmux_clean() {
  if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed."
    return 1
  fi

  local auto_yes=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -y|--yes)
        auto_yes=1
        ;;
      -h|--help)
        echo "Usage: bb tmux-clean [--yes]"
        echo "  Removes detached tmux sessions with numeric names (legacy clutter)."
        return 0
        ;;
      *)
        echo "Unknown option: $1"
        echo "Run: bb tmux-clean --help"
        return 1
        ;;
    esac
    shift
  done

  local -a candidates
  local session_name session_attached session_path
  while IFS=':::' read -r session_name session_attached session_path; do
    [[ -z "$session_name" ]] && continue

    if [[ "$session_attached" == "0" && "$session_name" =~ ^[0-9]+$ ]]; then
      candidates+=("$session_name:::${session_path:-unknown}")
    fi
  done < <(tmux list-sessions -F '#{session_name}:::#{session_attached}:::#{session_path}' 2>/dev/null)

  if [[ ${#candidates[@]} -eq 0 ]]; then
    echo "No detached numeric tmux sessions to clean."
    return 0
  fi

  echo "Detached numeric tmux sessions:"
  local entry
  for entry in "${candidates[@]}"; do
    session_name="${entry%%:::*}"
    session_path="${entry#*:::}"
    echo "  - $session_name ($session_path)"
  done

  if [[ "$auto_yes" -ne 1 ]]; then
    echo -n "Kill these sessions? (y/N) "
    local response
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      echo "Cancelled."
      return 0
    fi
  fi

  local killed=0
  for entry in "${candidates[@]}"; do
    session_name="${entry%%:::*}"
    if tmux kill-session -t "$session_name" 2>/dev/null; then
      killed=$((killed + 1))
    fi
  done

  echo "Killed $killed tmux session(s)."
}

_bb_backups_clean() {
  local auto_yes=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -y|--yes)
        auto_yes=1
        ;;
      -h|--help)
        echo "Usage: bb backups-clean [--yes]"
        echo "  Keeps only the newest dotfiles backup for each target."
        return 0
        ;;
      *)
        echo "Unknown option: $1"
        echo "Run: bb backups-clean --help"
        return 1
        ;;
    esac
    shift
  done

  local base_dir="${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles/backups"
  if [[ ! -d "$base_dir" ]]; then
    echo "No dotfiles backup directory found."
    return 0
  fi

  _bb_prune_backup_groups "$base_dir" 1 "$auto_yes"
  _bb_prune_backups "$base_dir/workmux" "config.yaml.dotfiles-backup." 1 "$auto_yes"
}

# Update dotfiles
bbup() {
  local dotfiles_dir
  dotfiles_dir="$(_dotfiles_dir)"
  
  if [[ -z "$dotfiles_dir" || ! -d "$dotfiles_dir" ]]; then
    echo "Error: Dotfiles directory not found. Set DOTFILES_DIR or run setup first."
    return 1
  fi

  echo "Updating dotfiles..."
  # Use a subshell to avoid changing current directory permanently if we return early
  (
    builtin cd "$dotfiles_dir" || exit 1
    
    if git pull --rebase --autostash; then
      echo "Dotfiles updated successfully."
      _sync_workmux_config "$dotfiles_dir"
      echo "Reapplying base chezmoi state..."
      if [[ -x "$dotfiles_dir/scripts/apply-chezmoi.sh" ]]; then
        bash "$dotfiles_dir/scripts/apply-chezmoi.sh"
      else
        echo "Warning: chezmoi apply helper not found, skipping base apply."
      fi
      
      echo -n "Run interactive setup wizard? (y/N) "
      read -r response
      if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        pnpm run setup
      fi
    else
      echo "Failed to update dotfiles."
      exit 1
    fi
  )
  
  # Only reload if the update subshell succeeded
  if [[ $? -eq 0 ]]; then
    echo "Reloading shell..."
    exec zsh
  fi
}

# bb - dotfiles helper
bb() {
  local cmd="${1:-help}"
  shift || true

  local dotfiles_dir
  dotfiles_dir="$(_dotfiles_dir)"

  case "$cmd" in
    help|-h|--help)
      echo "bb - dotfiles helper"
      echo ""
      echo "Usage: bb <command> [args]"
      echo ""
      echo "Commands:"
      echo "  bb apply                Apply the base chezmoi state"
      echo "  bb setup                Apply chezmoi-managed dotfiles"
      echo "  bb setup <module>       Compatibility alias for chezmoi apply"
      echo "  bb setup hammerspoon    Install Hammerspoon module"
      echo "  bb setup nvim           Install Neovim module"
      echo "  bb sync karabiner       Sync Karabiner config"
      echo "  bb sync macos-apps      Sync Raycast/Rectangle/BTT exports"
      echo "  bb restore <target>     Reveal macOS app backup exports"
      echo "  bb update               Pull updates and optionally rerun setup"
      echo "  bb backups-clean        Keep only the newest dotfiles backups"
      echo "  bb tmux-clean           Clean detached numeric tmux sessions"
      echo "  bb status               Show setup manifest"
      echo "  bb tip                  Show a random tip"
      echo "  bb help                 Show this help"
      echo ""
      echo "Modules:"
      echo "  shell (zsh), tmux, nvim, hammerspoon, karabiner, ghostty, kanata"
      echo "Restore targets:"
      echo "  raycast, rectangle-pro, bettertouchtool, macos-apps"
      return 0
      ;;
    apply)
      if [[ -z "$dotfiles_dir" || ! -d "$dotfiles_dir" ]]; then
        echo "Error: Dotfiles directory not found. Set DOTFILES_DIR or run setup first."
        return 1
      fi

      local apply_script="$dotfiles_dir/scripts/apply-chezmoi.sh"
      if [[ ! -f "$apply_script" ]]; then
        echo "chezmoi apply helper not found: $apply_script"
        return 1
      fi

      bash "$apply_script"
      ;;
    setup)
      if [[ -z "$dotfiles_dir" || ! -d "$dotfiles_dir" ]]; then
        echo "Error: Dotfiles directory not found. Set DOTFILES_DIR or run setup first."
        return 1
      fi

      local module="${1:-all}"
      case "$module" in
        all|shell|zsh|tmux|nvim|hammerspoon|karabiner|ghostty|kanata)
          if [[ "$module" == "hammerspoon" || "$module" == "karabiner" ]]; then
            if [[ "$(uname)" != "Darwin" ]]; then
              echo "$module is macOS only."
              return 1
            fi
          fi
          if [[ "$module" == "tmux" ]]; then
            _sync_workmux_config "$dotfiles_dir"
          fi
          echo "bb setup ${module}: applying chezmoi-managed dotfiles."
          bb apply || return $?
          if [[ "$module" == "tmux" && -n "$TMUX" ]]; then
            tmux source-file "$HOME/.tmux.conf"
          fi
          if [[ "$module" == "karabiner" && -x "$dotfiles_dir/scripts/sync-karabiner.sh" ]]; then
            "$dotfiles_dir/scripts/sync-karabiner.sh" push
          fi
          ;;
        *)
          echo "Unknown module: $module"
          echo "Run: bb help"
          return 1
          ;;
      esac
      ;;
    sync)
      if [[ -z "$dotfiles_dir" || ! -d "$dotfiles_dir" ]]; then
        echo "Error: Dotfiles directory not found. Set DOTFILES_DIR or run setup first."
        return 1
      fi

      if [[ $# -eq 0 ]]; then
        echo "Usage: bb sync <target> [push|pull]"
        echo "Targets: karabiner, raycast, rectangle-pro, bettertouchtool, macos-apps"
        return 1
      fi

      local target="${1:-}"
      local direction="${2:-pull}"

      case "$target" in
        karabiner)
          if [[ "$(uname)" != "Darwin" ]]; then
            echo "Karabiner Elements is macOS only."
            return 1
          fi
          if [[ ! -x "$dotfiles_dir/scripts/sync-karabiner.sh" ]]; then
            echo "Karabiner sync script not found."
            return 1
          fi
          "$dotfiles_dir/scripts/sync-karabiner.sh" "$direction"
          ;;
        raycast|rectangle|rectangle-pro|bettertouchtool|btt|macos-apps)
          if [[ "$(uname)" != "Darwin" ]]; then
            echo "macOS app export sync is macOS only."
            return 1
          fi
          if [[ ! -x "$dotfiles_dir/scripts/sync-macos-app-backups.sh" ]]; then
            echo "macOS app sync script not found."
            return 1
          fi
          "$dotfiles_dir/scripts/sync-macos-app-backups.sh" "$direction" "$target"
          ;;
        *)
          echo "Unknown sync target: $target"
          echo "Usage: bb sync <target> [push|pull]"
          echo "Targets: karabiner, raycast, rectangle-pro, bettertouchtool, macos-apps"
          return 1
          ;;
      esac

      ;;
    restore)
      if [[ -z "$dotfiles_dir" || ! -d "$dotfiles_dir" ]]; then
        echo "Error: Dotfiles directory not found. Set DOTFILES_DIR or run setup first."
        return 1
      fi

      local target="${1:-macos-apps}"
      local restore_script="$dotfiles_dir/scripts/restore-macos-app-backups.sh"

      if [[ ! -f "$restore_script" ]]; then
        echo "Restore helper not found: $restore_script"
        return 1
      fi

      bash "$restore_script" "$target"
      return $?
      ;;
    update)
      bbup
      ;;
    backups-clean)
      _bb_backups_clean "$@"
      ;;
    tmux-clean)
      _bb_tmux_clean "$@"
      ;;
    status)
      local manifest_path="$HOME/.config/dotfiles/setup-manifest.json"
      local dotfiles_path_file="$HOME/.config/dotfiles/path"
      if [[ -f "$manifest_path" ]]; then
        echo "Manifest: $manifest_path"
        if command -v jq &> /dev/null; then
          jq '{apps, configs, features}' "$manifest_path"
        else
          cat "$manifest_path"
        fi
      elif [[ -f "$dotfiles_path_file" ]]; then
        echo "Base chezmoi state present via: $dotfiles_path_file"
        echo "No legacy setup manifest found yet. Run: bb setup"
      else
        echo "No setup manifest found. Run: bb setup"
      fi
      ;;
    tip|tips)
      if [[ -n "$dotfiles_dir" && -f "$dotfiles_dir/shell/tips.sh" ]]; then
        DOTFILES_TIPS_AUTO=0 source "$dotfiles_dir/shell/tips.sh"
        dotfiles_tip --force
      else
        echo "Tips are not available. Run: bb setup and enable Tips."
      fi
      ;;
    *)
      echo "Unknown command: $cmd"
      echo "Run: bb help"
      return 1
      ;;
  esac
}
