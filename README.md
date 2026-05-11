# builtby.win/dotfiles

Fast, modular dotfiles with interactive setup, curated macOS app backups, and a clear restore path.

## Quick install

The macOS and Linux install commands are meant to be run in a terminal. They explain the plan before changing files, then ask you to confirm.

What happens during install:

1. The dotfiles repo is cloned or updated, usually at `~/dotfiles`.
2. Required installer tools are installed or reused: Git, Homebrew or your Linux package manager, chezmoi, Node.js, and pnpm.
3. The base shell/config files are applied with chezmoi.
4. An interactive setup dashboard opens so you can choose apps, configs, and optional features.
5. Before optional dashboard changes are applied, the dashboard shows what will be installed, which files may change, and how to restore backups.

The setup dashboard backs up managed files before optional replacements. After install, run `bb setup` to change selections or restore backups.

macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

This installs dependencies, clones the repo, applies the base chezmoi state, then opens the interactive setup dashboard.

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
bb help
```

`bb` is a lightweight wrapper that makes common tasks discoverable.
If `bb` is not found, run `bash scripts/apply-chezmoi.sh` and restart your shell.

If something looks wrong, run `bb setup` and choose the revert option. The installer records backups and the setup manifest under `~/.config/dotfiles/`.

## Setup paths

These paths select interactive setup defaults after the base chezmoi apply step. You still get a review screen before optional installs or file changes happen.

**🚀 Focused Setup (Back2Vibing):**
Full AI/dev workflow. Installs Back2Vibing, tmux, sesh, fzf, Ghostty terminal, and shell polish.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --focus
```

**⭐ Standard Setup (Recommended):**
Recommended default. Installs the `bb` helper, core aliases, tmux, fzf, editor defaults, and essential CLI tools.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --setup-path standard
```

**🌱 Minimal Setup (Shell only):**
Shell foundation only: zsh config, aliases, `bb` helper, starship, fzf, and zoxide. Use this if you want the lowest-change install.

**🛠️ Custom Setup:**
Walk through each app, config, and optional feature manually.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --setup-path customize
```

---

Full setup:

```bash
bb setup
```

This applies chezmoi-managed dotfiles and orchestrates apps, configs, and optional features.

A la carte modules:

```bash
bb setup tmux
bb setup nvim
bb setup hammerspoon
bb setup karabiner
bb sync karabiner pull
bb kanata-setup
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
| Karabiner | `bb setup karabiner` | macOS only, jk to tmux prefix, `bb sync karabiner pull` imports live config | `docs/modules/karabiner.md` |
| Kanata | `bb kanata-setup` | Cross-platform remaps, macOS setup needs DriverKit and privacy approvals | `docs/modules/kanata.md` |
| Ghostty | `bb setup ghostty` | terminal config | `docs/modules/ghostty.md` |
| App backups | `bb sync macos-apps pull` | Raycast, Rectangle Pro, BetterTouchTool export sync + restore | `docs/modules/app-backups.md` |
| AI configs | `bb setup` | auto-copied from templates | `docs/modules/ai.md` |
| Back2Vibing | `bb setup back2vibing` | Focus & productivity for AI devs | `back2vibing.builtby.win` |

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

Revert via the interactive UI:

```bash
bb setup
```

Then choose "Revert" from the main menu.

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
├── chezmoi/              # Chezmoi-managed source state
├── setup.ts              # Interactive setup (macOS/Linux)
├── setup-windows.ts      # Interactive setup (Windows)
├── shell/                # Zsh config, aliases, functions, tips
├── assets/app-exports/   # Native restore artifacts for macOS apps
├── templates/            # Copy-managed configs for AI tools
└── docs/                 # Module documentation
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

OpenCode styling is copy-managed from `templates/opencode/`. See `docs/modules/opencode.md`.

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

- `docs/modules/shell.md`
- `docs/modules/tmux.md`
- `docs/modules/nvim.md`
- `docs/modules/hammerspoon.md`
- `docs/modules/karabiner.md`
- `docs/modules/ghostty.md`
- `docs/modules/chezmoi.md`
- `docs/modules/app-backups.md`
- `docs/modules/mackup.md`
- `docs/modules/ai.md`
- `agents/README.md`

## License

MIT
