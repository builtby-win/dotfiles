# Windows Setup Guide

This guide describes how to set up your Windows development environment using our opinionated dotfiles.

## Prerequisites

- **Windows 10/11**
- **Administrator Access** (required for creating symlinks)

## Installation

We provide a single bootstrap command that handles everything: installing Git, Winget, cloning the repo, and setting up your shell.

### 1. Run the Bootstrap Script

Open **PowerShell as Administrator** and run:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/builtby-win/dotfiles/main/windows/install.ps1'))
```

*Note: Replace `main` with the specific branch name if you are testing a feature branch.*

### 2. Run the Interactive Setup

Once the bootstrap completes, it will prompt you to run the interactive setup. You can run it manually at any time:

```bash
cd ~\dotfiles
pnpm run setup
```

This will:
- Check for updates
- Link your configuration files (Starship, Ghostty, etc.)
- Install optional apps

## What's Included

### Core Shell (PowerShell Core)
- **Starship:** Fast, informative prompt.
- **Zoxide:** Smarter `cd` command (use `z` to jump to directories).
- **FZF:** Fuzzy finder history search (`Ctrl+R`) and file search (`Ctrl+T`).
- **Unix Aliases:** `ls` -> `eza`, `cat` -> `bat`, `grep` -> `rg`, `sudo` -> `gsudo`.

### AI Tools
- **Cursor:** AI-first code editor.
- **Claude Code:** Terminal-based AI assistant.
- **Templates:** Pre-configured settings for both tools.

## Troubleshooting

**Symlink Errors:**
If you see errors about "Privilege not held", ensure you are running PowerShell as **Administrator** or have **Developer Mode** enabled in Windows Settings.

**Execution Policy Errors:**
If scripts refuse to run, execute `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell.