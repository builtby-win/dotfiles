# Hammerspoon module (macOS)

Hammerspoon adds a Hyper-key launcher, Ghostty workflow shortcuts, and the jk window leader (the keyboard front end for mimi tiling and Spaces).

## Prerequisites

- macOS
- Hammerspoon installed (brew cask: `hammerspoon`) with Accessibility permission
- Karabiner Elements with the repo config (the `j+k` chord sends `Hyper+F13`)
- mimi (`brew install --cask y3owk1n/tap/mimi`), configured by `docs/modules/mimi.md`

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

## jk window leader

Mirrors `linux/hypr/leader.lua`. Press `j+k`; a `LEADER` pill appears in the top-left. The next key runs one action and closes the leader; any other key just closes it. Tiling and Spaces are mimi commands.

| Key | Action |
| --- | --- |
| `h` `j` `k` `l` / arrows | focus the tile west / south / north / east (`mimi tiling cmd focus`) |
| `Shift` + `h` `j` `k` `l` | swap with the tile that way (`mimi tiling cmd swap`) |
| `t` / `Return` | new Ghostty window (the dwindle layout splits the focused tile) |
| `d` / `Shift+d` | new Ghostty window split to the right / below (`mimi tiling cmd preselect`) |
| `x` / `w` | close window |
| `z` / `f` / `s` | maximize / toggle floating / toggle split |
| `Space` | app launcher |
| `1`–`0` | switch to Space N (`mimi action space`) |
| `Shift` + `1`–`0` | move the window to Space N |
| `q`/`[`, `e`/`]` | previous / next Space |
| `Tab` | last Space (tracked by `modules/spaces_bar.lua`) |
| `Shift+r` | resize mode (`RESIZE` pill; `h`/`k` shrink and `j`/`l` grow the focused tile's split, `Esc` or `Return` to leave) |
| `j+k` again | send `Ctrl+b` to the app |

In a terminal (herdr, tmux) the first `j+k` is their prefix: Ctrl+B is sent and no pill is shown. A second `j+k` within one second sends Escape to cancel that prefix and opens the window leader.

## Reloading

- Menu bar icon -> `Reload Config`
- Or press `Hyper+r`
