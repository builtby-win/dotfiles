# Mackup module

Mackup syncs app settings to cloud storage (iCloud, Dropbox, etc.).

## Install

```bash
bb setup mackup
```

Manual stow:

```bash
stow -d "$DOTFILES_DIR/stow-packages" -t "$HOME" mackup
```

## Usage

1. Edit `~/.mackup.cfg` to select your storage provider.
2. Run `mackup restore` to pull settings.
3. Run `mackup backup` to push settings.
