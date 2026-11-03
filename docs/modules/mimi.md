# mimi module (macOS)

[mimi](https://github.com/y3owk1n/mimi) tiles windows and switches native Spaces with SIP left on. The jk leader (`docs/modules/hammerspoon.md`) is its keyboard front end, so macOS behaves like `linux/hypr/leader.lua`.

## What you see

- Dwindle tiling like Hyprland: a new window splits the focused tile, closing hands the area back. `bsp.py` is vendored from mimi's `examples/tiling` (MIT) into `chezmoi/dot_config/mimi/tiling/`.
- A purple ring around the focused window, grey rings on the rest (`[border]`).
- A Space list in the menu bar (`1 [2] 4`: Spaces with windows, active one in brackets), drawn by Hammerspoon (`modules/spaces_bar.lua`).
- Dragging an edge resizes a split; dropping a window on another swaps them (`relayout_on_drag`).

Workspaces are native macOS Spaces. mimi cannot create them without SIP changes, so add them once in Mission Control, then switch with leader `1`–`0`, `q`/`e`. In System Settings > Desktop & Dock, turn off "Automatically rearrange Spaces based on most recent use" so Space numbers stay put.

## Install

```bash
brew install --cask y3owk1n/tap/mimi
bb setup mimi          # applies ~/.config/mimi from chezmoi/dot_config/mimi
mimi services install  # daemon at login (borders, tiling, menu bar)
mimi doctor            # permissions and config checks
```

Grant Accessibility to mimi when asked.

## Editing

`~/.config/mimi/config.toml` reloads when saved. Float rules (`[[tiling.rules]]`) keep windows such as Finder and System Settings out of the layout. Check what the layout would do with `mimi tiling preview | jq`.

## Spaces menu bar

`chezmoi/dot_hammerspoon/modules/spaces_bar.lua` shows the Spaces that hold windows, with the active one in brackets. It re-reads `mimi query spaces` when a window opens, closes or gains focus, when the Space changes, and after leader actions. mimi's own menu bar Space number is turned off so the two do not duplicate.

## How windows tile

- **New window:** splits the focused tile, side by side when the tile is wider than tall, stacked otherwise (Hyprland's dwindle default, which Omarchy uses). The new window takes focus.
- **New Space:** starts with an empty tree. The first window fills the Space; layout state is kept per Space and per layout.
- **Closing:** the sibling tile takes the freed area.
- **Floating:** leader `f` takes the focused window out of the tree (and back). `[[tiling.rules]]` keeps whole apps and small windows out permanently.
- **Maximize:** leader `z` (`togglemax`) fills the area with the focused window until toggled off; the other tiles stay in the tree.
- **macOS full screen** (green button) moves the window to its own full-screen Space, where the layout does not run. `mimi action fullscreen_window` toggles it.
- **Stacks:** `mimi tiling cmd stack <dir>`, `unstack`, `next`, `prev` stack windows in one tile like tabs. They are not bound to a leader key.
