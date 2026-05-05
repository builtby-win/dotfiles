# Tmux module

Tmux is split into profiles:

- `basic`: beginner-friendly remaps (terminal-like splits and navigation)
- `pro`: non-invasive (keeps tmux defaults and your existing keybinds)
- `core`: shared options (mouse, status bar, terminal features)

## Install

Chezmoi apply:

```bash
bb setup tmux
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

Reload through `~/.tmux.conf`, not the individual profile files. The bootstrap
entrypoint loads core, the selected profile, and `~/.tmux.local.conf` exactly once
in the right order. This keeps reloads fast and prevents append-style tmux options
from growing duplicate entries.

Version notes:

- `fzf 0.34.x` is supported by the custom sesh picker in this repo.
- `tmux-fingers` requires a real installed binary, not just the TPM plugin checkout.
- On macOS, install the binary with Homebrew: `brew install tmux-fingers`.
- If Homebrew blocks installs because Command Line Tools are outdated, run `xcode-select --install` first.

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

Bare tmux launches now normalize to one project root: if you're inside a git repo,
new sessions use the repo root as their main cwd. If you launch tmux from outside
the shell alias (for example from a terminal app shortcut), point it at
`~/.local/bin/tmux-smart` so it can reuse an existing session for that root instead
of creating a numbered duplicate.

The old two-pane + tools-window bootstrap layout is now opt-in. Enable it in
`~/.tmux.local.conf` only if you want new sessions to be expanded automatically:

```tmux
set -g @builtby_bootstrap_layout on
```

Useful direct calls:

```bash
tmux-smart
tmux-smart --root ~/code/client-a
tmux-smart --root ~/code/client-a --new
```

- `tmux-smart` reuses the current repo/root session when possible
- `--root` targets another directory explicitly
- `--new` forces a fresh session name for that root without giving up the same cwd

## Workmux

`bb setup tmux` and `bb update` keep a local workmux config at
`~/.config/workmux/config.yaml` in sync with dotfiles. If the file already
exists, it is backed up to `~/.local/state/dotfiles/backups/workmux/`, older
copies are pruned, and then the file is updated. This file is machine-local and
not symlinked. To clean older dotfiles backups manually, run
`bb backups-clean --yes`.

For shell-backed tools that need to start in the current project directory,
wrap the pane command in a login shell. Example: `command: "bash -lc 'hydra'"`.

| Binding | Action |
| --- | --- |
| `Leader+n` | Prompt for worktree name, then `workmux add --open-if-exists` |
| `Alt+n` | Same quick worktree flow without prefix |
| `Leader+s` | Open `workmux dashboard` in a popup |

## Windows

On native Windows, use psmux as the tmux equivalent:

```powershell
winget install --id marlocarlo.psmux -e
```

psmux ships `psmux`, `pmux`, and `tmux` commands, so the normal tmux muscle memory should work from PowerShell 7:

```powershell
tmux
tmux new-session -s work
tmux attach -t work
```

For keyboard parity, Kanata maps `j+k` to `Ctrl+b`, matching the Karabiner terminal leader behavior on macOS. See `docs/modules/kanata.md`.

The Windows setup installs psmux from `windows/packages.json`. Reapply with:

```powershell
bb update
```

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
| `Leader+b` | Rebalance panes |
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

Recommended package versions for the tmux workflow in this repo:

- `fzf >= 0.34`
- `sesh >= 2.25`
- `tmux-fingers >= 2.6`

## Troubleshooting literal terminal replies

If tmux panes show text like `]10;rgb:...`, `]11;rgb:...`, `[?997;1n`, or
phantom `I` characters after a focus change, a terminal reply leaked into the pane
as normal input. `]10` and `]11` are foreground/background color replies,
`[?997;1n` is tmux theme-report traffic, and focus-in reports end with `I`.

The shared tmux profile keeps passthrough disabled to avoid forwarding wrapped
terminal queries from inner programs to the outer terminal by default. This is the
safe default for typing-heavy shells. If the leak is coming from a prompt or app
that sends plain terminal queries itself, fix that tool to either read the reply
synchronously from `/dev/tty` or skip the probe inside tmux.

Apply the safe default to the current server:

```bash
tmux source-file ~/.tmux.conf
tmux set -g allow-passthrough off
tmux set -g focus-events off
tmux switch-client -T root
```

The managed profile also removes tmux's `ccolour` terminal feature for xterm-like
terminals. That keeps tmux from advertising color/theme reporting support by
default, which reduces the chance of color replies arriving in a shell prompt.
It also does not advertise tmux focus reporting by default, and it clears stale
app-installed focus hooks from the baseline config instead of sourcing mutable
generated tmux snippets on every reload.

If you intentionally need passthrough-only features such as inline graphics,
enable it per machine in `~/.tmux.local.conf` instead of changing the repo default:

```tmux
set -g allow-passthrough on
```
