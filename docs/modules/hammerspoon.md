# Hammerspoon module (macOS)

Hammerspoon adds a menu bar workspace switcher and Ghostty/Rex/Helium toggles on the Hyper key. The `jk` chord is intentionally ignored: nested terminals, SSH and tmux make it collide with the prefix.

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

## Workspaces

One macOS Space, workspaces by hiding apps (macOS cannot park a window fully off-screen, so AeroSpace/Rift/Paneru leave a sliver; hiding the app does not). A workspace is a set of apps, so granularity is per app, not per window.

- Switching hides apps assigned elsewhere and unhides the target's apps.
- An app activated from outside Hammerspoon (Cmd+Tab, Dock, notification) switches to its workspace; a new app joins the current one.
- Raycast, Finder, Spotlight, System Settings, Back2Vibing, Vicinae and the Ghostty/Rex terminals are exempt (`EXEMPT` in `workspaces.lua`). Terminals open on whatever workspace is current and are never hidden or switched to.
- UI: menu bar item (`◧ 2`) lists workspaces, moves the frontmost app, shows all apps; a top-center HUD flashes the workspaces on each switch.
- Reloading or quitting Hammerspoon unhides every app. Assignments persist in `hs.settings`.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
