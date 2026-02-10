# Shell functions
# builtby.win/dotfiles

# Quick git commit with message
c() {
  if [[ $# -gt 0 ]]; then
    git commit -m "$*"
  else
    git commit -v
  fi
}

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
      
      echo -n "Run full setup wizard? (y/N) "
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
      echo "  bb setup                Run full interactive setup"
      echo "  bb setup <module>       Install a single module"
      echo "  bb setup hammerspoon    Install Hammerspoon module"
      echo "  bb update               Pull updates and optionally rerun setup"
      echo "  bb status               Show setup manifest"
      echo "  bb tip                  Show a random tip"
      echo "  bb help                 Show this help"
      echo ""
      echo "Modules:"
      echo "  shell (zsh), tmux, hammerspoon, karabiner, ghostty, mackup"
      return 0
      ;;
    setup)
      if [[ -z "$dotfiles_dir" || ! -d "$dotfiles_dir" ]]; then
        echo "Error: Dotfiles directory not found. Set DOTFILES_DIR or run setup first."
        return 1
      fi

      if [[ $# -eq 0 ]]; then
        if ! command -v pnpm &> /dev/null; then
          echo "pnpm not found. Run ./bootstrap.sh first."
          return 1
        fi
        (builtin cd "$dotfiles_dir" && pnpm run setup)
        return $?
      fi

      if ! command -v stow &> /dev/null; then
        echo "stow not found. Install it first (macOS: brew install stow)."
        return 1
      fi

      local module
      module="$1"

      case "$module" in
        shell|zsh)
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" zsh
          echo "Shell config stowed. Reload with: exec zsh"
          ;;
        tmux)
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" tmux
          if [[ -n "$TMUX" ]]; then
            tmux source-file "$HOME/.tmux.conf"
          else
            echo "Tmux config stowed. Reload with: tmux source-file ~/.tmux.conf"
          fi
          ;;
        hammerspoon)
          if [[ "$(uname)" != "Darwin" ]]; then
            echo "Hammerspoon is macOS only."
            return 1
          fi
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" hammerspoon
          echo "Hammerspoon config stowed. Reload from Hammerspoon menu or run: hs -c 'hs.reload()'"
          ;;
        karabiner)
          if [[ "$(uname)" != "Darwin" ]]; then
            echo "Karabiner Elements is macOS only."
            return 1
          fi
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" karabiner
          if [[ -x "$dotfiles_dir/scripts/sync-karabiner.sh" ]]; then
            "$dotfiles_dir/scripts/sync-karabiner.sh"
          else
            echo "Karabiner config stowed. Restart Karabiner Elements to apply."
          fi
          ;;
        ghostty)
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" ghostty
          echo "Ghostty config stowed. Restart Ghostty to apply."
          ;;
        mackup)
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" mackup
          echo "Mackup config stowed. Run: mackup restore"
          ;;
        *)
          echo "Unknown module: $module"
          echo "Run: bb help"
          return 1
          ;;
      esac
      ;;
    update)
      bbup
      ;;
    status)
      local manifest_path="$HOME/.config/dotfiles/setup-manifest.json"
      if [[ -f "$manifest_path" ]]; then
        echo "Manifest: $manifest_path"
        if command -v jq &> /dev/null; then
          jq '{apps, configs, features}' "$manifest_path"
        else
          cat "$manifest_path"
        fi
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
