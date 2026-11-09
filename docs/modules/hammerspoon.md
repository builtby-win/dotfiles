# Hammerspoon module (macOS)

Hammerspoon adds a Hyper-key app launcher, Ghostty/Rex/Helium toggles, and a Ghostty 4-pane layout hotkey.

## Prerequisites

- macOS
- Hammerspoon installed (brew cask: `hammerspoon`) with Accessibility permission
- Karabiner Elements with the repo config (sends Hyper)

## Install

Chezmoi apply:

```bash
bb setup hammerspoon
```

This applies `.hammerspoon` into your home directory from `chezmoi/dot_hammerspoon`.

## Included hotkeys

- `Hyper+Space`: app launcher chooser
- `Hyper+Return` / `Hyper+\` / `Hyper+h`: toggle Ghostty / Rex / Helium (hide if frontmost, else focus or launch)
- `Hyper+4`: focus Ghostty and build a 2x2 (4-pane) split layout
- `Hyper+r`: reload Hammerspoon config

`Hyper` is `Ctrl+Alt+Cmd+Shift`.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
