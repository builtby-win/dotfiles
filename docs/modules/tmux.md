# Tmux module

Tmux is preconfigured with a vim-style workflow, sesh integration, and a custom prefix.

## Install

```bash
bb setup tmux
```

Manual stow:

```bash
stow -d "$DOTFILES_DIR/stow-packages" -t "$HOME" tmux
```

Reload tmux after install:

```bash
tmux source-file ~/.tmux.conf
```

## Prefix

- Prefix is `Ctrl+.`
- With Karabiner in terminals, hold `j+k` to send the prefix

## Sessions

| Binding | Action |
| --- | --- |
| `Leader+Space` | Session picker (sesh) |
| `Leader+Tab` | Toggle last session |
| `Leader+T` | Jump to last sesh session |
| `Alt+(` / `Alt+)` | Previous / next session |

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
