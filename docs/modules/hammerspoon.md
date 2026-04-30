# Hammerspoon module (macOS)

Hammerspoon adds a Hyper-key launcher and Ghostty workflow shortcuts.

## Prerequisites

- macOS
- Hammerspoon installed (brew cask: `hammerspoon`)

## Install

Chezmoi apply:

```bash
bb setup hammerspoon
```

This applies `.hammerspoon` into your home directory from `chezmoi/dot_hammerspoon`.

## Included hotkeys

- `Hyper+Space`: app launcher chooser
- `Hyper+4`: focus Ghostty and build a 2x2 (4-pane) split layout
- `Hyper+r`: reload Hammerspoon config

`Hyper` is `Ctrl+Alt+Cmd+Shift`.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
