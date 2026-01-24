# Zinit configuration (lightweight oh-my-zsh alternative)
# builtby.win/dotfiles
#
# Plugins loaded:
#   - zsh-autosuggestions: Shows greyed-out command suggestions from history
#                          Press → (right arrow) or End to accept
#                          https://github.com/zsh-users/zsh-autosuggestions
#
#   - zsh-syntax-highlighting: Colors commands as you type (red = invalid, green = valid)
#                              https://github.com/zsh-users/zsh-syntax-highlighting
#
#   - zsh-vi-mode: Vim keybindings in terminal (Esc for normal mode, i for insert)
#                  https://github.com/jeffreytse/zsh-vi-mode
#
#   - git-auto-fetch: Automatically fetches git repos in background when you cd into them
#                     (custom implementation below)
#
# Plugin manager: Zinit - https://github.com/zdharma-continuum/zinit
# Prompt: Starship - https://starship.rs (config: ~/.config/starship.toml)

# ─────────────────────────────────────────────────────────────
# Zsh options (replaces oh-my-zsh defaults)
# ─────────────────────────────────────────────────────────────
setopt AUTO_CD              # Type directory name to cd into it (e.g., `..` instead of `cd ..`)
setopt AUTO_PUSHD           # Push directories onto stack for `cd -N` navigation
setopt PUSHD_IGNORE_DUPS    # Don't push duplicates onto directory stack
setopt PUSHD_SILENT         # Don't print directory stack after pushd/popd

# ─────────────────────────────────────────────────────────────
# Dot expansion (... → cd ../.., .... → cd ../../.., etc)
# ─────────────────────────────────────────────────────────────
rationalise-dot() {
  if [[ $LBUFFER = *.. ]]; then
    LBUFFER+=/..
  else
    LBUFFER+=.
  fi
}
zle -N rationalise-dot
bindkey . rationalise-dot

# ─────────────────────────────────────────────────────────────
# Completion system
# ─────────────────────────────────────────────────────────────
autoload -Uz compinit
# Optimize completion init: check if dump file is fresh (< 24h)
if [[ -f "${ZDOTDIR:-$HOME}/.zcompdump" ]]; then
  if [[ $(date +%s) -lt $(($(stat -f %m "${ZDOTDIR:-$HOME}/.zcompdump") + 86400)) ]]; then
    compinit -C
  else
    compinit
  fi
else
  compinit
fi

# Menu-style completion with highlighting
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'  # Case-insensitive matching
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"    # Colored completion

# Tab = next completion, Shift-Tab = previous completion
bindkey '^I' menu-complete
[[ -n "${terminfo[kcbt]}" ]] && bindkey "${terminfo[kcbt]}" reverse-menu-complete

# In menu selection mode: Tab/Shift-Tab navigate without exiting
zmodload zsh/complist
bindkey -M menuselect '^I' menu-complete
[[ -n "${terminfo[kcbt]}" ]] && bindkey -M menuselect "${terminfo[kcbt]}" reverse-menu-complete

# ─────────────────────────────────────────────────────────────
# Bootstrap zinit if not installed
# ─────────────────────────────────────────────────────────────
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
if [[ ! -d "$ZINIT_HOME" ]]; then
  print -P "%F{33}Installing zinit...%f"
  mkdir -p "$(dirname $ZINIT_HOME)"
  git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME" 2>/dev/null
fi
source "${ZINIT_HOME}/zinit.zsh"

# ─────────────────────────────────────────────────────────────
# Plugins (see header for descriptions and links)
# ─────────────────────────────────────────────────────────────

# zsh-autosuggestions: History-based command suggestions
# → to accept full suggestion, Ctrl+→ to accept word
zinit light zsh-users/zsh-autosuggestions

# zsh-syntax-highlighting: Real-time command validation
# Green = valid command, Red = invalid/not found
zinit light zsh-users/zsh-syntax-highlighting

# zsh-vi-mode: Vim keybindings in terminal
# Esc = normal mode, i = insert, v = visual, / = search
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
  if [[ -n "$DOTFILES_CACHE_DIR" ]]; then
    STARSHIP_CACHE="$DOTFILES_CACHE_DIR/starship-init.zsh"
  else
    STARSHIP_CACHE="${ZDOTDIR:-$HOME}/.starship-init.zsh"
  fi
  
  if [[ ! -f "$STARSHIP_CACHE" ]] || [[ "$(command -v starship)" -nt "$STARSHIP_CACHE" ]]; then
    starship init zsh > "$STARSHIP_CACHE"
  fi
  source "$STARSHIP_CACHE"

  if [[ -v widgets[zle-keymap-select] ]]; then
    local keymap_widget="${widgets[zle-keymap-select]#user:}"
    if [[ "$keymap_widget" == "starship_zle-keymap-select-wrapped" || "$keymap_widget" == "starship_zle-keymap-select" ]]; then
      zle -N zle-keymap-select starship_zle-keymap-select
    fi
  fi
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
