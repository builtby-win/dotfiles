# builtby.win/dotfiles

# Read dotfiles path (written by setup.ts to ~/.config/dotfiles/path)
if [[ -f "$HOME/.config/dotfiles/path" ]]; then
  DOTFILES_DIR="$(cat "$HOME/.config/dotfiles/path")"
  export DOTFILES_DIR
  [[ -f "$DOTFILES_DIR/shell/init.sh" ]] && source "$DOTFILES_DIR/shell/init.sh"
fi

# Added by Antigravity
export PATH="/Users/winstonzhao/.antigravity/antigravity/bin:$PATH"

# Added by Back2Vibing - b2v CLI
export PATH="$HOME/.local/bin:$PATH"

# pnpm
if [[ "$(uname -s)" == "Darwin" ]]; then
  export PNPM_HOME="${PNPM_HOME:-$HOME/Library/pnpm}"
else
  export PNPM_HOME="${PNPM_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/pnpm}"
fi
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# Added by Antigravity
export PATH="/Users/winstonzhao/.antigravity/antigravity/bin:$PATH"

# opencode
export PATH=/Users/winstonzhao/.opencode/bin:$PATH

# >>> b2v shell hook >>>
eval "$(b2v shell-hook --shell zsh)"
# <<< b2v shell hook <<<
