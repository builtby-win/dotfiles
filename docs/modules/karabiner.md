# Karabiner Elements module (macOS)

Karabiner Elements provides keyboard remaps and tmux integration.

## Prerequisites

- macOS
- Karabiner Elements installed (brew cask: `karabiner-elements`)

## Install

```bash
bb setup karabiner
```

This stows the config and restarts Karabiner Elements.

Manual sync and restart:

```bash
./scripts/sync-karabiner.sh
```

## Key mappings

- `j` + `k` held together in terminals sends tmux prefix (`Ctrl+b`)
- `Caps Lock` and `Fn` become `Control`
- `Delete` (forward delete) becomes `Escape`
- Double semicolon (`;;`) opens AltTab (Ctrl+Opt+Tab)

External keyboard (Windows layout):

- Left Alt -> Command
- Left Windows -> Option
- Right Alt -> Command
- Menu key -> Hyper (Ctrl+Opt+Shift+Cmd)
