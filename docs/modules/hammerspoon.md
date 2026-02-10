# Hammerspoon module (macOS)

Hammerspoon adds a Hyper-key launcher and Ghostty workflow shortcuts.

## Prerequisites

- macOS
- Hammerspoon installed (brew cask: `hammerspoon`)

## Install

```bash
bb setup hammerspoon
```

This stows `.hammerspoon` into your home directory.

## Included hotkeys

- `Hyper+Space`: app launcher chooser
- `Hyper+g/c/v/u/s/d/f`: direct app launch (Ghostty, Chrome, VS Code, Cursor, Slack, Discord, Finder)
- `Hyper+4`: focus Ghostty and build a 2x2 (4-pane) split layout
- `Hyper+r`: reload Hammerspoon config

`Hyper` is `Ctrl+Alt+Cmd+Shift`.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
