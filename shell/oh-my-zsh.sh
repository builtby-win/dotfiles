# Oh-my-zsh configuration
# builtby.win/dotfiles

# Path to oh-my-zsh installation
export ZSH="${HOME}/.oh-my-zsh"

# Theme
ZSH_THEME="robbyrussell"

# Plugins
plugins=(
  git
  vi-mode
  macos
  zsh-autosuggestions
  git-auto-fetch
)

# Load oh-my-zsh
[[ -f "$ZSH/oh-my-zsh.sh" ]] && source "$ZSH/oh-my-zsh.sh"

# SSH agent forwarding
zstyle :omz:plugins:ssh-agent agent-forwarding on

# Window title shows current directory
function precmd() {
  window_title="\033]0;${PWD##*/}\007"
  echo -ne "$window_title"
}
