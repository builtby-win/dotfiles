# builtby.win/dotfiles

Fast, modular dotfiles with interactive setup, curated macOS app backups, and a clear restore path.

## Quick install

The macOS and Linux install commands are meant to be run in a terminal. They explain the plan before changing files, then ask you to confirm.

What happens during install:

1. The dotfiles repo is cloned or updated, usually at `~/dotfiles`.
2. Required installer tools are installed or reused: Git, Homebrew or your Linux package manager, chezmoi, Node.js, and pnpm. If a system install needs admin access, the script checks it first with `sudo -v`.
3. The base shell/config files are applied with chezmoi.
4. A guided setup checklist opens with the recommended AI/dev workflow selected by default.
5. Before optional changes are applied, setup shows what will be installed, which files may change, and how to restore backups.

Setup backs up managed files before optional replacements. After install, run `bb setup` to change selections or `bb setup revert` to restore backups.

macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

This installs dependencies, clones the repo, applies the base chezmoi state, then opens the guided setup checklist.

If you have never used `sudo` in Terminal before, macOS/Linux may show a short safety message and ask for your computer password. The password will not show as you type. The installer uses the safe preflight command `sudo -v` rather than asking you to run `sudo ls`.

Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap-linux.sh | bash
```

Windows (PowerShell as Administrator):

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

More details in `WINDOWS_README.md`.

Windows uses a separate PowerShell flow. Follow `WINDOWS_README.md` for the exact prompts and recovery steps.

The default bootstrap applies the chezmoi-managed source state, then launches the interactive setup when run from an interactive terminal.

## After install

Open a new shell and run:

```bash
exec zsh
```

You now have a new shell with dotfiles applied. Next steps:

```bash
bb setup       # Change your selections (add/remove tools)
bb tip         # See a quick tip each day
bb help        # See all available commands
```

If something looks wrong, restore from backups:

```bash
bb setup revert
```

The installer records backups and setup info under `~/.config/dotfiles/`.

## Getting started

**First 5 minutes:**
- Your shell is ready to use with new aliases and tools
- Try `bb tip` to see quick tips
- Run `exec zsh` again if you don't see the prompt change

**First week:**
- Use `bb help` to see available commands
- `bb setup` to add/remove optional tools (Codex, Ghostty, etc.)
- Check out your new keybindings (tmux prefix is Ctrl+b, see `bb tip`)

**Changing things later:**
- Add a new module: `bb setup nvim` or `bb setup karabiner`
- Update everything: `bb update`
- Undo changes: `bb setup revert`

**If bb is not found:**
Run `bash scripts/apply-chezmoi.sh` and restart your shell.

## Setup

The default install uses the recommended full AI/dev workflow. It starts with iTerm2 as the first terminal plus Claude Code, OpenCode, and GitHub CLI, then gives you one checklist where you can add optional tools like Codex or Ghostty and uncheck anything you do not want. You still get a review screen before optional installs or file changes happen.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

This applies chezmoi-managed dotfiles and orchestrates apps, configs, and optional features.

Claude Code users can use the bundled `dotfiles-setup` skill for a conversational install or customization flow. It asks about intent, setup profile, apps, managed configs, optional features, and shell handoff, then maps the answers to the existing bootstrap or `bb setup` commands.

Change selections later:

```bash
bb setup
```

Advanced: pass `--setup-path standard`, `minimal`, `customize`, or `ai_agent` only when you intentionally want a non-default setup.

A la carte modules:

```bash
bb setup tmux
bb setup nvim
bb setup hammerspoon
bb setup karabiner
bb sync karabiner pull
bb setup iterm2
bb setup ghostty
```

This is ideal if you want to add pieces over time.

## Module index

| Module | Install | Notes | Docs |
| --- | --- | --- | --- |
| Shell (zsh) | `bb setup shell` | zinit, starship, aliases, PATH | `docs/modules/shell.md` |
| Tmux | `bb setup tmux` | prefix Ctrl+b and sesh integration | `docs/modules/tmux.md` |
| Neovim | `bb setup nvim` | bleeding-edge vim.pack config for Neovim 0.12+ | `docs/modules/nvim.md` |
| Hammerspoon | `bb setup hammerspoon` | Hyper app launcher + Ghostty 4-pane hotkey | `docs/modules/hammerspoon.md` |
| Karabiner | `bb setup karabiner` | macOS chords, app-aware Command/tmux behavior, Hyper, and Neru modes | `docs/modules/karabiner.md` |
| Neru | Auto-loaded with Karabiner | App context grid launcher for macOS | `docs/modules/karabiner.md` |
| iTerm2 | `bb setup iterm2` | recommended first terminal key defaults | `docs/modules/app-backups.md` |
| Ghostty | `bb setup ghostty` | optional terminal config | `docs/modules/ghostty.md` |
| App backups | `bb sync macos-apps pull` | Raycast, Rectangle Pro, BetterTouchTool export sync + restore | `docs/modules/app-backups.md` |
| AI configs | `bb setup` | auto-copied from templates | `docs/modules/ai.md` |
| Back2Vibing | `bb setup back2vibing` | Focus modes, workflow transitions, and context for AI devs | `docs/modules/back2vibing.md` |

## Onboarding tips

Enable "Shell Tips (Daily)" during setup to get one short tip each day when the shell starts.

Show a tip any time:

```bash
bb tip
```

Example tip:

```
Karabiner + tmux: hold j+k to send the tmux prefix (Ctrl+b). Enable with: bb setup karabiner
```

## Update and revert

Update dotfiles:

```bash
bb update
```

Revert setup-managed files from backups:

```bash
bb setup revert
```

Check what was installed:

```bash
bb status
```

## Key defaults (tmux + karabiner)

- tmux prefix: `Ctrl+b`
- with Karabiner in terminals: hold `j+k` to send the prefix
- tmux-fingers: `Leader+f`
- copy mode: `Leader+v`
- new window: `Leader+t` (or `Alt+c`)

For the tmux workflow in this repo, keep these tools current:

- `fzf >= 0.34`
- `sesh >= 2.25`
- `tmux-fingers >= 2.6`

On macOS, `tmux-fingers` also needs working Xcode Command Line Tools before Homebrew can install it.

## Structure

```
dotfiles/
├── bootstrap.sh          # Entry installer (chezmoi apply + interactive setup)
├── bootstrap-linux.sh    # Linux bootstrap shim (chezmoi apply + interactive setup)
├── bootstrap.ps1         # Main installer (Windows)
├── DESIGN.md             # UX design principles and product promise
├── AGENTS.md             # Multi-agent workflow and collaboration rules
├── WINDOWS_README.md     # Windows-specific setup guide and recovery
│
├── chezmoi/              # Chezmoi-managed source state (dotfiles, configs, scripts)
├── setup.ts              # Interactive setup orchestration (macOS/Linux)
├── setup-windows.ts      # Interactive setup orchestration (Windows)
├── shell/                # Zsh config, aliases, functions, tips, agent setup
├── lib/                  # TypeScript utilities (config builders, manifest management)
├── scripts/              # Helper scripts (chezmoi apply, app sync/restore, defaults)
│
├── templates/            # Copy-managed configs for AI tools (Claude, Gemini, OpenCode)
├── agents/               # Agent config templates and symlink helpers
├── apps/                 # Brewfile for macOS app installation
├── assets/app-exports/   # Native restore artifacts for macOS apps
├── windows/              # Windows-specific configs (profiles, kanata, packages)
│
├── tests/                # Test suite (bootstrap, modules, setup flows, platforms)
└── docs/                 # Module documentation and planning
```

## macOS app restore artifacts

Native app exports live under `assets/app-exports/`:

- `assets/app-exports/raycast/archive/`
- `assets/app-exports/rectangle-pro/`
- `assets/app-exports/bettertouchtool/`

Sync the latest machine exports back into the repo:

```bash
bb sync macos-apps pull
bb sync raycast pull
bb sync rectangle-pro pull
bb sync bettertouchtool pull
```

Reveal/import the repo copies:

```bash
bb restore macos-apps
bb restore raycast
bb restore rectangle-pro
bb restore bettertouchtool
```

OpenCode is installed by default in the recommended setup, with styling copy-managed from `templates/opencode/`. Codex CLI is available as an optional checkbox. See `docs/modules/opencode.md`.

## Agent configs and symlinks

Agent configuration templates live in `agents/` and can be symlinked to any git repository for consistent rules across projects:

```bash
agent-link              # Interactive: select agents to link
agent-link claude       # Link just Claude Code config
agent-link all          # Link all agents (Claude, Gemini, OpenCode)
agent-update            # Pull latest agent configs from dotfiles
agent-status            # Check which repos have which configs
```

Each template pulls from a shared base (`agents/shared/base.md`) plus agent-specific extensions. See `agents/README.md` for details.

## AI tool configs

When you run `bb setup`, AI tool configurations are automatically copied from `templates/`:

- `templates/claude/` → Claude Code settings
- `templates/gemini/` → Gemini/Antigravity settings  
- `templates/opencode/` → OpenCode styling and extensions

These are copy-managed, so edits in the dotfiles will copy on next setup run without overwriting local changes during active development.

## Development & Contributing

### Understanding the design

Before modifying setup flows or UX, read `DESIGN.md`. It documents the product promise, UX principles (make the next step obvious, show consequences before changes), and how to keep recovery paths clear.

### Multi-agent workflows

`AGENTS.md` covers the mandatory workflow for multi-agent sessions: quality gates, pushing to remote, cleanup, and handoff. Work is not complete until `git push` succeeds.

### Testing

Run the test suite to validate bootstrap flows, module configs, platform support, and setup edge cases:

```bash
pnpm test              # Run all tests
pnpm test shell        # Run shell config tests
pnpm test karabiner    # Run Karabiner module tests
pnpm test windows      # Run Windows-specific tests
```

Key test files:
- `tests/bootstrap_chezmoi.test.ts` — Chezmoi apply and structure
- `tests/linux*.test.ts` — Linux bootstrap and package flows
- `tests/windows*.test.ts` — Windows-specific bootstrap, profile, autostart
- `tests/setup*.test.ts` — Setup orchestration and manifest management
- `tests/*_module.test.ts` — Individual module (Karabiner, Hammerspoon, Neovim, etc.) validation

### Scripts and helpers

Utility scripts in `scripts/`:

- `apply-chezmoi.sh` — Apply chezmoi state without running full setup
- `sync-karabiner.sh` — Sync Karabiner configs to/from repo
- `sync-macos-app-backups.sh` — Backup and restore macOS app configs
- `restore-macos-app-backups.sh` — Restore saved app exports
- `setup-iterm-defaults.sh` — Apply iTerm2 key binding defaults

### Windows development

Windows-specific files live in `windows/`:

- `install.ps1` — Main Windows setup and package installation
- `kanata.kbd` — Keybindings config for Windows equivalent of Karabiner
- `kanata-autostart.ps1` — Autostart kanata as a service
- `Microsoft.PowerShell_profile.ps1` — PowerShell profile (aliases, functions, shell setup)
- `packages.json` — Winget/scoop package list
- `profile/` — Windows profile directory structure

## Manual setup (if you prefer)

```bash
git clone https://github.com/builtby-win/dotfiles.git ~/dotfiles
cd ~/dotfiles

# macOS
brew install chezmoi fnm

# Linux (choose one)
# sudo apt-get update && sudo apt-get install -y chezmoi curl git
# sudo dnf install -y chezmoi curl git
# sudo pacman -S --noconfirm --needed chezmoi curl git

fnm install --lts
npm install -g pnpm
pnpm install
bash scripts/apply-chezmoi.sh

# interactive setup
pnpm run setup
```

## Docs

### Top-level guidance
- `DESIGN.md` — UX design system and product principles
- `AGENTS.md` — Agent workflow, landing the plane, multi-session collaboration
- `WINDOWS_README.md` — Windows setup, prompts, recovery paths

### Module docs
- `docs/modules/shell.md` — Zsh, zinit, starship, aliases, PATH management
- `docs/modules/tmux.md` — Tmux config, sesh integration, key bindings
- `docs/modules/nvim.md` — Neovim config, vim.pack structure, bleeding-edge setup
- `docs/modules/hammerspoon.md` — Hyper launcher, Ghostty pane hotkeys, Lua modules
- `docs/modules/karabiner.md` — Karabiner config, chords, app-aware bindings, Neru
- `docs/modules/ghostty.md` — Ghostty terminal config and theme
- Back2Vibing — Focus modes and workflow guide at [back2vibing.builtby.win](https://back2vibing.builtby.win)
- `docs/modules/chezmoi.md` — Chezmoi structure, templates, state management
- `docs/modules/app-backups.md` — macOS app export/restore, sync workflows
- `docs/modules/mackup.md` — Mackup setup (legacy/reference)
- `docs/modules/ai.md` — AI tool config templates and setup

### Guides and content
- `docs/content/why-tmux.md` — Philosophy and benefits of tmux
- `docs/content/tmux-quickstart.md` — Tmux quick reference
- `docs/content/tmux-b2v-video-script.md` — Back2Vibing tmux integration video

### Agent config
- `agents/README.md` — Agent template system, symlink helpers, shared base rules

## License

MIT
