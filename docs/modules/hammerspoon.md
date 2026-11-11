# Hammerspoon module (macOS)

Hammerspoon adds Ghostty/Rex/Helium toggles on the Hyper key.

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

- `Hyper+Return` / `Hyper+\` / `Hyper+h`: toggle Ghostty / Rex / Helium (hide if frontmost, else focus or launch)
- `Hyper+r`: reload Hammerspoon config

`Hyper` is `Ctrl+Alt+Cmd+Shift`.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
