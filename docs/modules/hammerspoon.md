# Hammerspoon module (macOS)

Hammerspoon adds the `jk` window leader (focus, swap, zoom, resize, workspaces) for floating windows, plus Ghostty/Rex/Helium toggles on the Hyper key.

## Prerequisites

- macOS
- Hammerspoon installed (brew cask: `hammerspoon`) with Accessibility permission
- Karabiner Elements with the repo config (sends Hyper, and Hyper+F13 / Hyper+F14 for `jk`)

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

## jk leader

`jk` (Karabiner) sends Hyper+F13; in a terminal a second `jk` sends Hyper+F14 after cancelling the herdr/tmux prefix. Either opens the leader, which runs one key and closes. Any key without an action just closes it. Mirrors `linux/hypr/leader.lua`.

| Key | Action |
| --- | --- |
| `h j k l` / arrows | focus the window in that direction |
| `shift+h j k l` | swap frames with that window |
| `z` | zoom: toggle almost-maximized with a gap |
| `x` / `w` | close window |
| `` ` `` | previous window |
| `t` / `return` | new Ghostty window |
| `1`..`9` / `shift+1`..`9` | switch workspace / move the frontmost app there |
| `q` `e` `[` `]` / `tab` | previous / next / last workspace |
| `a` | unhide every app (escape hatch) |
| `space` | toggle the Vicinae launcher (apps it opens join the current workspace) |
| `shift+r` | sticky resize mode (`hjkl`, `esc`/`return` to leave) |

## Workspaces

One macOS Space, workspaces by hiding apps (macOS cannot park a window fully off-screen, so AeroSpace/Rift/Paneru leave a sliver; hiding the app does not). A workspace is a set of apps, so granularity is per app, not per window.

- Switching hides apps assigned elsewhere and unhides the target's apps.
- An app activated from outside the leader (Cmd+Tab, Dock, notification) switches to its workspace; a new app joins the current one.
- Raycast, Finder, Spotlight, System Settings and Back2Vibing are exempt (`EXEMPT` in `workspaces.lua`).
- UI: menu bar item (`◧ 2`) lists workspaces, moves the frontmost app, shows all apps; a top-center HUD shows workspaces plus LEADER/RESIZE.
- Reloading or quitting Hammerspoon unhides every app. Assignments persist in `hs.settings`.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
