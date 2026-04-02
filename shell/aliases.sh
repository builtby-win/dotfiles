# Shell aliases
# builtby.win/dotfiles
#
# Note: Directory navigation is handled in zinit.sh:
#   - AUTO_CD: type `..` to cd up (no `cd` needed)
#   - rationalise-dot: `...` → `../..`, `....` → `../../..`, etc as you type

# Directory navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'
alias ......='cd ../../../../../'

# Global aliases (allow usage like `ls .../foo`)
alias -g ...='../..'
alias -g ....='../../..'
alias -g .....='../../../..'
alias -g ......='../../../../..'

# Quick shortcuts
alias -- -='cd -'  # Go to previous directory
alias fuck="rm -rf"
# Reload shell config
if [[ -n "$ZSH_VERSION" ]]; then
  alias rc="source ~/.zshrc"
elif [[ -n "$BASH_VERSION" ]]; then
  alias rc="source ~/.bashrc"
fi

# Common shortcuts
alias redo="sudo !!"

# CLI tool shortcuts
alias c="claude --dangerously-skip-permissions"
alias claude="claude --dangerously-skip-permissions"
alias o="opencode"
alias g="gemini --yolo"
alias a="B2V_BYPASS_AGENT_WIZARD=1 b2v amp"
alias kiro="B2V_BYPASS_AGENT_WIZARD=1 b2v kiro-cli"
alias spark="B2V_BYPASS_AGENT_WIZARD=1 b2v codex -m gpt-5.3-codex-spark"
alias codex="B2V_BYPASS_AGENT_WIZARD=1 b2v codex"

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

# Back2Vibing
alias vibe="back2vibing"
alias vb="back2vibing"

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

# Smart tmux launcher:
# - no args: reuse existing session by canonical root path, else create/connect via sesh
# - args: pass through to tmux as-is
tmux() {
  command tmux-smart "$@"
}
