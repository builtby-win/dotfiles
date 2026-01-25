# Windows Setup Guide

This guide describes how to set up your Windows development environment using our opinionated dotfiles.

## Prerequisites

- **Windows 10/11**
- **Administrator Access** (required for creating symlinks)

## Installation

We provide a single bootstrap command that handles everything: installing Git, cloning the repo, setting up Node/pnpm, and running the interactive Windows setup.

### 1. Run the Bootstrap Script

Open **PowerShell as Administrator** and run:

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

*Note: Replace `main` with the specific branch name if you are testing a feature branch.*

### 2. Run the Interactive Setup

Once the bootstrap completes, it will run the interactive setup. You can run it manually at any time:

```powershell
cd $HOME\dotfiles
pnpm exec tsx setup-windows.ts
```

This will:
- Link your configuration files (Starship, templates)
- Prompt for optional installs (terminals, Cursor, AI CLIs, Python)

## What's Included

### Core Shell (PowerShell Core)
- **Starship:** Fast, informative prompt.
- **Zoxide:** Smarter `cd` command (use `z` to jump to directories).
- **FZF:** Fuzzy finder history search (`Ctrl+R`) and file search (`Ctrl+T`).
- **Unix Aliases:** `ls` -> `eza`, `cat` -> `bat`, `grep` -> `rg`, `sudo` -> `gsudo`.

### Optional Installs (Prompted)
- **Terminals:** Warp (beginner-friendly), Windows Terminal, WezTerm, Alacritty
- **Editor:** Cursor (optional)
- **AI CLIs:** Gemini CLI, Claude Code, OpenCode
- **Other:** Python 3 (for `antigravity`)

### Templates
- Pre-configured settings for AI tools (Claude Code, Cursor)

## Troubleshooting

**Symlink Errors:**
If you see errors about "Privilege not held", ensure you are running PowerShell as **Administrator** or have **Developer Mode** enabled in Windows Settings.

**Execution Policy Errors:**
If scripts refuse to run, execute `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell.
