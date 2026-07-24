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

# Create or update a pull request for the current branch
pr() {
  command -v gh >/dev/null 2>&1 || {
    echo "pr: gh is not installed."
    return 1
  }

  command git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "pr: not inside a git repo."
    return 1
  }

  local branch pr_url
  branch="$(command git branch --show-current)"
  if [[ -z "$branch" ]]; then
    echo "pr: detached HEAD."
    return 1
  fi

  if [[ -n "$(command git status --porcelain --untracked-files=all)" ]]; then
    command git add -A || return 1
    if command git diff --cached --quiet --ignore-submodules --; then
      echo "pr: nothing to commit."
      return 1
    fi
    command git commit -m "wip: $branch" || return 1
  fi


  command git push -u origin HEAD || return 1

  pr_url="$(command gh pr list --head "$branch" --state open --json url --jq '.[0].url // empty')"
  if [[ -n "$pr_url" ]]; then
    printf '%s\n' "$pr_url"
    return 0
  fi

  local base_ref prompt ai_output title body fallback_suffix
  base_ref="$(command git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || printf '%s\n' origin/main)"
  prompt="$(cat <<EOF
Return strict JSON only with keys "title" and "body".
Write a concise GitHub pull request title and body for the changes below.
Keep the title short. Keep the body short, markdown-friendly, and useful.
No code fences. No extra prose.

Branch: $branch

Commit log:
$(command git log --oneline --no-merges --max-count=20 "$base_ref..HEAD")

Diff stat:
$(command git diff --stat "$base_ref...HEAD")
EOF
)"

  title=""
  body=""
  if command -v pi >/dev/null 2>&1; then
    ai_output="$(command pi --model opencode/gpt-5.4 "$prompt" 2>/dev/null || true)"
    if command -v jq >/dev/null 2>&1; then
      title="$(printf '%s' "$ai_output" | jq -r '.title // empty' 2>/dev/null)"
      body="$(printf '%s' "$ai_output" | jq -r '.body // empty' 2>/dev/null)"
    fi
  fi

  if [[ -z "$title" || -z "$body" ]]; then
    fallback_suffix="$(printf '%04x' "$RANDOM")"
    printf -v title 'wip: %s %s' "$branch" "$fallback_suffix"
    printf -v body 'Automated PR generated without AI.\n\nBranch: %s\nFallback: %s' "$branch" "$fallback_suffix"
  fi

  command gh pr create --title "$title" --body "$body"
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
      echo "Quick Start:"
      echo "  bb setup                Change your setup selections"
      echo "  bb tip                  See a daily tip"
      echo ""
      echo "Setup & Management:"
      echo "  bb setup                Open the recommended guided setup checklist"
      echo "  bb setup revert         Restore files from setup backups"
      echo "  bb setup menu           Open advanced setup actions"
      echo "  bb setup merge          Merge dotfiles into existing configs à la carte"
      echo "  bb setup hammerspoon    Apply the Hammerspoon module"
      echo "  bb setup nvim           Apply the Neovim module"
      echo "  bb setup iterm2         Apply iTerm2 defaults"
      echo "  Apply one selected module intentionally"
      echo ""
      echo "Updates & Maintenance:"
      echo "  bb update               Pull latest dotfiles and re-run setup"
      echo "  bb apply                Apply base dotfiles without interactive setup"
      echo "  bb backups-clean        Remove old backup files"
      echo "  bb tmux-clean           Remove old tmux sessions"
      echo ""
      echo "macOS Only:"
      echo "  bb sync karabiner       Sync Karabiner key bindings"
      echo "  bb sync macos-apps      Sync Raycast/Rectangle/BetterTouchTool configs"
      echo "  bb restore <target>     Show where app backups are stored"
      echo ""
      echo "Info:"
      echo "  bb status               Show what was installed"
      echo "  bb help                 Show this help"
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
      if [[ "$module" == "all" || "$module" == --* ]]; then
        (cd "$dotfiles_dir" && pnpm exec tsx setup.ts "$dotfiles_dir" "$@")
        return $?
      fi

      case "$module" in
        menu|revert|merge)
          (cd "$dotfiles_dir" && pnpm exec tsx setup.ts "$module")
          return $?
          ;;
        all|shell|zsh|tmux|nvim|hammerspoon|karabiner|ghostty|iterm2)
          if [[ "$module" == "hammerspoon" || "$module" == "karabiner" || "$module" == "iterm2" ]]; then
            if [[ "$(uname)" != "Darwin" ]]; then
              echo "$module is macOS only."
              return 1
            fi
          fi
          if [[ "$module" == "iterm2" ]]; then
            local iterm_script="$dotfiles_dir/scripts/setup-iterm-defaults.sh"
            if [[ ! -f "$iterm_script" ]]; then
              echo "iTerm2 defaults script not found: $iterm_script"
              return 1
            fi
            bash "$iterm_script"
            return $?
          fi
          if [[ "$module" == "ghostty" ]]; then
            local apply_script="$dotfiles_dir/scripts/apply-chezmoi.sh"
            if [[ ! -f "$apply_script" ]]; then
              echo "chezmoi apply helper not found: $apply_script"
              return 1
            fi
            echo "bb setup ghostty: applying Ghostty config."
            if [[ "$(uname)" == "Darwin" ]]; then
              bash "$apply_script" "$HOME/.config/ghostty/config" "$HOME/Library/Application Support/com.mitchellh.ghostty/config"
            else
              bash "$apply_script" "$HOME/.config/ghostty/config"
            fi
            return $?
          fi
          if [[ "$module" == "tmux" ]]; then
          fi
          echo "bb setup ${module}: applying chezmoi-managed dotfiles."
          bb apply || return $?
          if [[ "$module" == "tmux" && -n "$TMUX" ]]; then
            command tmux source-file "$HOME/.tmux.conf"
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
