# Shell module (zsh)

Zsh is the main shell setup for these dotfiles. It includes zinit, starship, aliases, and helper functions.

## Install

```bash
bb setup shell
```

Manual stow:

```bash
stow -d "$DOTFILES_DIR/stow-packages" -t "$HOME" zsh
```

## What is included

- zinit plugin manager
- starship prompt
- git auto-fetch on repo change
- aliases and helper functions
- optional daily tips (if enabled in setup)

## Notable commands

- `bb` - dotfiles helper (setup, update, tips)
- `mkcd <dir>` - create and cd into a directory
- `extract <file>` - unpack common archive types
- `c` - quick git commit
- `co` - fzf-based git checkout

## Local overrides

Put machine-specific changes in `~/.config/dotfiles/local.sh`.
This file is created during setup, stays local to each machine, and is never symlinked.

Legacy fallback: if `~/.config/dotfiles/local.sh` is missing, `shell/local.sh` (repo-local, gitignored) is still sourced.

## Tips

Enable "Shell Tips (Daily)" in `bb setup` to show a short hint on shell start.
Use `bb tip` to show a tip on demand.
