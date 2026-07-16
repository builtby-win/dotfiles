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
# Copy current working directory to clipboard
alias cwd="pwd | tr -d '\n' | pbcopy"

# Reload shell config
if [[ -n "$ZSH_VERSION" ]]; then
  alias rc="source ~/.zshrc"
elif [[ -n "$BASH_VERSION" ]]; then
  alias rc="source ~/.bashrc"
fi

# Common shortcuts
alias redo="sudo !!"

# Zed - default to opening current directory
zed() { command zed "${@:-.}"; }

# Pi model aliases with fallback support
#
# flash:  Try opencode/deepseek-v4-flash-free first, fall back to opencode-go/deepseek-v4-flash
# pro:    Try opencode/deepseek-v4-pro first, fall back to opencode-go/deepseek-v4-pro
# pi-*:   Direct model shortcuts without fallback

# Run pi with a primary model; if startup fails (non-zero, not user-cancelled),
# retry with a fallback model.
pi-with-fallback() {
  local primary="$1"
  local fallback="$2"
  shift 2

  pi --model "$primary" "$@"
  local ret=$?
  # Don't fall back on normal exit (0) or user interrupt (130=SIGINT, 143=SIGTERM)
  if [ $ret -ne 0 ] && [ $ret -ne 130 ] && [ $ret -ne 143 ]; then
    echo >&2 "⚠️  Primary model '$primary' failed (exit $ret). Falling back to '$fallback'..."
    pi --model "$fallback" "$@"
  fi
  return $?
}

# Named model shortcuts with automatic fallback
flash()  { pi-with-fallback "opencode/deepseek-v4-flash-free" "opencode-go/deepseek-v4-flash" "$@"; }
pro()    { pi-with-fallback "opencode/deepseek-v4-pro"      "opencode-go/deepseek-v4-pro"      "$@"; }

# Direct model shortcuts (no fallback)
alias pi-flash="pi --model opencode/deepseek-v4-flash-free"
alias pi-flash-go="pi --model opencode-go/deepseek-v4-flash"
alias pi-pro="pi --model opencode/deepseek-v4-pro"
alias pi-pro-go="pi --model opencode-go/deepseek-v4-pro"
alias pi-zen="pi --provider opencode"
alias pi-go="pi --provider opencode-go"
alias pi-sonnet="pi --model claude-sonnet-4"
alias pi-opus="pi --model claude-opus-4-7"

# CLI tool shortcuts
claude() {
  command claude --dangerously-skip-permissions "$@"
}

c() {
  claude "$@"
}

alias o="opencode"
gemini() {
  command gemini --yolo "$@"
}

g() {
  gemini "$@"
}

alias a="B2V_BYPASS_AGENT_WIZARD=1 b2v amp"
function kiro() {
  command kiro-cli "$@"
}
alias spark="command codex -m gpt-5.3-codex-spark"
codex() {
  B2V_BYPASS_AGENT_WIZARD=1 command codex --dangerously-bypass-approvals-and-sandbox "$@"
}

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

# Git shorthand (g* prefix convention)
alias gs='git status'
alias gd='git diff'
alias gdc='git diff --cached'
alias gl='git log --oneline --graph'
alias gll='git log --oneline --graph --all'
alias gco='git checkout'
alias gcob='git checkout -b'
alias gp='git push'
alias gpf='git push --force-with-lease'
alias gpl='git pull'
alias ga='git add'
alias gaa='git add -A'
alias gci='git commit'
alias gcia='git commit --amend --no-verify'
alias grb='git rebase'
alias grbc='git rebase --continue'
alias grba='git rebase --abort'
alias grbi='git rebase -i'
alias gcp='git cherry-pick'
alias grs='git reset'
alias grh='git reset --hard'
alias gst='git stash'
alias gsta='git stash apply'
alias gstp='git stash pop'
alias gmg='git merge'
alias gbl='git blame'
alias grv='git revert'
alias gplom='git pull origin main'

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
