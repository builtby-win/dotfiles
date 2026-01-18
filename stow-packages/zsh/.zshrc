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
export PNPM_HOME="/Users/winstonzhao/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

# Added by Antigravity
export PATH="/Users/winstonzhao/.antigravity/antigravity/bin:$PATH"
