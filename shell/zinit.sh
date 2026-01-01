# Zinit configuration (lightweight oh-my-zsh alternative)
# builtby.win/dotfiles
#
# Plugins loaded:
#   - zsh-autosuggestions: Shows greyed-out command suggestions from history
#                          Press → (right arrow) or End to accept
#   - zsh-syntax-highlighting: Colors commands as you type (red = invalid, green = valid)
#   - vi-mode: Vim keybindings in terminal (Esc for normal mode, i for insert)
#   - git-auto-fetch: Automatically fetches git repos in background when you cd into them
#
# Prompt: Starship (https://starship.rs)
#   - Shows git branch, status, language versions, command duration, etc.
#   - Configured via ~/.config/starship.toml

# Bootstrap zinit if not installed
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
if [[ ! -d "$ZINIT_HOME" ]]; then
  print -P "%F{33}Installing zinit...%f"
  mkdir -p "$(dirname $ZINIT_HOME)"
  git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME" 2>/dev/null
fi
source "${ZINIT_HOME}/zinit.zsh"

# ─────────────────────────────────────────────────────────────
# Plugins
# ─────────────────────────────────────────────────────────────

# Autosuggestions - shows command suggestions from history
# Use → or End to accept, or Ctrl+→ to accept word
zinit light zsh-users/zsh-autosuggestions

# Syntax highlighting - colors commands as you type
zinit light zsh-users/zsh-syntax-highlighting

# Vi mode - vim keybindings in terminal
# Esc = normal mode, i = insert mode, v = visual mode
zinit light jeffreytse/zsh-vi-mode

# ─────────────────────────────────────────────────────────────
# Git auto-fetch (replaces oh-my-zsh git-auto-fetch plugin)
# ─────────────────────────────────────────────────────────────
# Automatically fetch git repos in background when you cd into them
# Runs every 60 seconds max to avoid hammering remotes

GIT_AUTO_FETCH_INTERVAL=${GIT_AUTO_FETCH_INTERVAL:-60}

function _git_auto_fetch() {
  # Only run in git repos
  if git rev-parse --git-dir &>/dev/null; then
    local git_dir="$(git rev-parse --git-dir)"
    local fetch_marker="$git_dir/auto-fetch-last"
    local now=$(date +%s)
    local last_fetch=0

    [[ -f "$fetch_marker" ]] && last_fetch=$(cat "$fetch_marker" 2>/dev/null || echo 0)

    # Only fetch if interval has passed
    if (( now - last_fetch >= GIT_AUTO_FETCH_INTERVAL )); then
      echo $now > "$fetch_marker"
      # Run fetch in background, silently
      (git fetch --all --quiet &) 2>/dev/null
    fi
  fi
}

# Hook into directory change
autoload -Uz add-zsh-hook
add-zsh-hook chpwd _git_auto_fetch

# ─────────────────────────────────────────────────────────────
# Starship prompt
# ─────────────────────────────────────────────────────────────
if command -v starship &> /dev/null; then
  eval "$(starship init zsh)"
else
  # Fallback to simple prompt if starship not installed
  PROMPT='%F{blue}%~%f %F{green}❯%f '
fi

# ─────────────────────────────────────────────────────────────
# Window title (shows current directory)
# ─────────────────────────────────────────────────────────────
function precmd() {
  print -Pn "\e]0;%1~\a"
}
