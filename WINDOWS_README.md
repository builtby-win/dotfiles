# Windows Setup Guide

This guide covers Windows setup for these dotfiles.

## Quick install

Open PowerShell as Administrator and run:

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

This clones or updates `~/dotfiles`, installs the Windows core toolchain, links configs, installs Node/pnpm, and launches the interactive Windows setup.

## After install

Re-run the interactive setup any time:

```powershell
cd $HOME\dotfiles
pnpm run setup:windows
```

Reapply/update the full Windows environment any time:

```powershell
bb update
```

Equivalent direct command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\dotfiles\windows\update.ps1"
```

## What gets configured

- Starship prompt (linked to dotfiles config)
- Kanata keyboard config (linked to dotfiles config)
- PowerShell profile and helper functions (linked to dotfiles config)
- PowerShell profile with zoxide, fnm, and fzf keybindings
- tmux/psmux config copied to `.config/tmux` with `.tmux.conf` linked
- Unix-like aliases (`ls`, `cat`, `grep`, `sudo`)
- AI tool templates for Claude Code and Cursor

## Optional installs (prompted)

- Terminals: Warp, Windows Terminal, WezTerm, Alacritty
- Editor: Cursor
- AI CLIs: Gemini CLI, Claude Code, OpenCode
- Dev shell: PowerShell 7, psmux
- Keyboard: Kanata GUI, Rustup for Kanata CLI builds
- Other: Python 3

## Recommended Windows parity stack

Use Windows-native tools first:

- Shell: PowerShell 7
- Terminal: Warp first, Windows Terminal fallback, WezTerm optional
- Multiplexer: psmux as the tmux equivalent
- Keyboard remapping: Kanata for cross-platform Hyper/chord behavior

Core packages are installed from `windows/packages.json`, including Git, PowerShell 7, Windows Terminal, Warp, psmux, Kanata GUI, Neovim, Starship, zoxide, fzf, ripgrep, bat, eza, fnm, gsudo, and Cursor.

The PowerShell profile includes Unix-style helper commands:

```powershell
bb status      # show installed tool status
bb update      # pull dotfiles and reapply Windows setup
bb setup       # rerun interactive setup
bb kanata      # run shared Kanata config
bb kanata-debug
bb kanata-install    # install login autostart task
bb kanata-status     # inspect login autostart task
bb kanata-uninstall  # remove login autostart task
ls, ll, la, lt, cat, grep, sudo, mkcd, extract
```

`bb` is also installed as a PATH-safe PowerShell script at `windows/bin/bb.ps1`, so it still works if the profile has not loaded yet. Open a new terminal after setup so Windows picks up the updated PATH.
The installer also adds `windows/bin/bb.cmd`, which makes `bb` discoverable from PowerShell and cmd without relying on PowerShell profile loading.

Install psmux manually if needed:

```powershell
winget install --id marlocarlo.psmux -e
```

Install Kanata GUI manually if needed:

```powershell
winget install --id jtroo.kanata_gui -e
```

Run the shared Kanata config:

```powershell
kanata --cfg "$HOME\.config\kanata\kanata.kbd"
```

Make Kanata run automatically at login:

```powershell
bb kanata-install
```

Run that from an Administrator PowerShell. It creates a Task Scheduler login task named `BuiltBy Kanata`.

The starter config maps the Microsoft Sculpt `Menu` key to Hyper and maps `j+k` to `Ctrl+b` for tmux/psmux leader muscle memory. The `j+k` chord is global until we add OS-specific app-aware switching.

## Updating

```powershell
bb update
```

`bb update` runs `git pull --rebase --autostash`, refreshes package/config links through `windows/install.ps1`, and reinstalls Node dependencies when `pnpm` is available.

## Notes

The `bb` helper command is available in zsh on macOS/Linux. On Windows, use the PowerShell commands above.

AutoHotkey is intentionally not part of the default path. Keep it as a fallback for Windows-only automation gaps that Kanata cannot cover cleanly.

## Troubleshooting

Symlink errors:
Run PowerShell as Administrator or enable Developer Mode.

Execution policy errors:
Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell.

`bb` is not recognized:

```powershell
& "$HOME\dotfiles\windows\install.ps1"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
bb status
```

If that still fails, run the shim directly:

```powershell
& "$HOME\dotfiles\windows\bin\bb.ps1" status
```

One-shot repair command:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; & "$HOME\dotfiles\windows\install.ps1"; $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User"); bb status
```
