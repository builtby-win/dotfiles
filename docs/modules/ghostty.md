# Ghostty module

Ghostty is a GPU terminal with a simple config file.

## Install

```bash
bb setup ghostty
```

Manual stow:

```bash
stow -d "$DOTFILES_DIR/stow-packages" -t "$HOME" ghostty
```

## Notes

- macOS config: `~/Library/Application Support/com.mitchellh.ghostty/config`
- Linux config: `~/.config/ghostty/config`
- Restart Ghostty to apply changes
- The Hammerspoon module uses Ghostty split defaults to build a 4-pane layout (`Hyper+4`)
