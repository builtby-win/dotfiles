# builtby.win/dotfiles

# Read dotfiles path (written by setup.ts to ~/.config/dotfiles/path)
if [[ -f "$HOME/.config/dotfiles/path" ]]; then
  DOTFILES_DIR="$(cat "$HOME/.config/dotfiles/path")"
  export DOTFILES_DIR
  [[ -f "$DOTFILES_DIR/shell/init.sh" ]] && source "$DOTFILES_DIR/shell/init.sh"
fi

# Added by Antigravity
export PATH="/Users/winstonzhao/.antigravity/antigravity/bin:$PATH"
