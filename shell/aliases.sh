# Shell aliases
# builtby.win/dotfiles

# Directory navigation (from oh-my-zsh)
alias -- -='cd -'
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'

alias fuck="rm -rf"
# Reload shell config
alias rc="source ~/.zshrc"

# Common shortcuts
alias redo="sudo !!"

# Git shortcuts
alias co-="git checkout -"
alias gc-="git checkout -"
alias p="git add -p"
alias stash="git stash save -u"
alias rename="git branch -m"
alias amend="git commit --amend --no-verify"
alias bname='git rev-parse --abbrev-ref HEAD'

# Work in progress
alias ggwip="git add . && git commit -m 'wip' --no-verify"
alias unwip="git reset --soft HEAD~1"

# Ship it!
alias shipit='echo "       _~\n    _~ )_)_~\n    )_))_))_)\n    _!__!__!_\n    \______t/\n  ~~~~~~~~~~~~~" && git push origin $(git rev-parse --abbrev-ref HEAD 2> /dev/null)'
alias SHIPIT='echo "       _~\n    _~ )_)_~\n    )_))_))_)\n    _!__!__!_\n    \______t/\n  ~~~~~~~~~~~~~" && git push --force-with-lease origin $(git rev-parse --abbrev-ref HEAD 2> /dev/null)'

# Directory jumping (zoxide)
alias d="z"

# Package managers
alias pp="pnpm"
alias po="pnpm run"
alias ppr="pnpm run"

# Modern CLI replacements (if installed)
if command -v eza &> /dev/null; then
  alias ls="eza"
  alias ll="eza -la"
  alias la="eza -a"
  alias lt="eza --tree"
fi

if command -v bat &> /dev/null; then
  alias cat="bat"
fi
