# Windows Setup Guide

This guide covers Windows setup for these dotfiles.

## Quick install

Open PowerShell as Administrator and run:

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

## After install

Re-run the interactive setup any time:

```powershell
cd $HOME\dotfiles
pnpm exec tsx setup-windows.ts
```

## What gets configured

- Starship prompt (linked to dotfiles config)
- PowerShell profile with zoxide, fnm, and fzf keybindings
- Unix-like aliases (`ls`, `cat`, `grep`, `sudo`)
- AI tool templates for Claude Code and Cursor

## Optional installs (prompted)

- Terminals: Warp, Windows Terminal, WezTerm, Alacritty
- Editor: Cursor
- AI CLIs: Gemini CLI, Claude Code, OpenCode
- Other: Python 3

## Updating

```powershell
cd $HOME\dotfiles
git pull
pnpm exec tsx setup-windows.ts
```

## Notes

The `bb` helper command is available in zsh on macOS/Linux. On Windows, use the PowerShell commands above.

## Troubleshooting

Symlink errors:
Run PowerShell as Administrator or enable Developer Mode.

Execution policy errors:
Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell.
