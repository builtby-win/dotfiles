# Tmux module

Tmux is split into profiles:

- `basic`: beginner-friendly remaps (terminal-like splits and navigation)
- `pro`: non-invasive (keeps tmux defaults and your existing keybinds)
- `core`: shared options (mouse, status bar, terminal features)

## Install

```bash
bb setup tmux
```

Manual stow:

```bash
stow -d "$DOTFILES_DIR/stow-packages" -t "$HOME" tmux
```

Then choose a bootstrap:

```bash
cp "$HOME/.config/tmux/builtby/bootstrap.basic.conf" "$HOME/.tmux.conf"
# or:
cp "$HOME/.config/tmux/builtby/bootstrap.pro.conf" "$HOME/.tmux.conf"
```

Reload tmux after install:

```bash
tmux source-file ~/.tmux.conf
```

## Prefix

- Prefix is `Ctrl+b` in `basic`
- `pro` keeps your existing prefix/settings
- With Karabiner in terminals, hold `j+k` to send the prefix

## Sessions

| Binding | Action |
| --- | --- |
| `Leader+Space` | Session picker (sesh) |
| `Leader+Tab` | Toggle last session |
| `Leader+T` | Jump to last sesh session |
| `Alt+(` / `Alt+)` | Previous / next session |

## Workmux

`bb setup tmux` and `bb update` keep a local workmux config at
`~/.config/workmux/config.yaml` in sync with dotfiles. If the file already
exists, it is backed up and then updated. This file is machine-local and not
symlinked.

| Binding | Action |
| --- | --- |
| `Leader+n` | Prompt for worktree name, then `workmux add --open-if-exists` |
| `Alt+n` | Same quick worktree flow without prefix |
| `Leader+s` | Open `workmux dashboard` in a popup |

## Windows

| Binding | Action |
| --- | --- |
| `Leader+t` | New window |
| `Alt+c` | New window (no prefix) |
| `Leader+w` | Close window |
| `Leader+q` / `Leader+e` | Previous / next window |
| `Alt+1-9` | Jump to window |

## Panes

| Binding | Action |
| --- | --- |
| `Leader+h/j/k/l` | Move between panes |
| `Alt+h/j/k/l` | Move between panes (no prefix) |
| `Leader+d` | Split vertical |
| `Leader+D` | Split horizontal |
| `Leader+x` | Close pane |
| `Alt+\` | Split vertical (no prefix) |
| `Alt+-` | Split horizontal (no prefix) |

## Copy and search

| Binding | Action |
| --- | --- |
| `Leader+f` | tmux-fingers quick copy |
| `Leader+v` | Enter copy mode |
| `v` / `y` | Select and copy in copy mode |

## Plugins

TPM is configured but not installed automatically.

```bash
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Then in tmux:

- `Leader+I` installs plugins
- `Leader+U` updates plugins
