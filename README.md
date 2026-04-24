# builtby.win/dotfiles

Fast, modular dotfiles with interactive setup, curated macOS app backups, and a clear restore path.

## Quick install

macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

This installs dependencies, clones the repo, then applies the base chezmoi state by default.

Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap-linux.sh | bash
```

Windows (PowerShell as Administrator):

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

More details in `WINDOWS_README.md`.

The default bootstrap applies the base chezmoi state. Use the legacy stow/setup lane when you want the older interactive module installer:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --legacy-stow
```

## After install

Open a new shell and run:

```bash
bb help
```

`bb` is a lightweight wrapper that makes common tasks discoverable.
If `bb` is not found, run `bash scripts/apply-chezmoi.sh` and restart your shell.

## Legacy stow setup paths

These paths still use the legacy stow-backed `setup.ts` flow.

**🚀 Focused Setup (Back2Vibing):**
Optimized for AI developers. Installs Back2Vibing, tmux, sesh, fzf, and Ghostty terminal.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --focus
```

**⭐ Standard Setup (Recommended):**
Installs the `bb` helper, core aliases, and essential CLI tools.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --setup-path standard
```

**🌱 Minimal Setup (Shell only):**
Just the foundation: aliases, `bb` helper, starship, and shell config.

**🛠️ Custom Setup:**
Pick and choose exactly which apps, configs, and features you want.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --setup-path customize
```

---

Full setup (legacy interactive):

```bash
bb setup
```

This runs the legacy interactive setup and orchestrates apps, configs, and optional features.

A la carte modules:

```bash
bb setup tmux
bb setup nvim
bb setup hammerspoon
bb setup karabiner
bb sync karabiner pull
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
├── bootstrap.sh          # Entry installer (default = chezmoi base apply, legacy flags = setup.ts)
├── bootstrap-linux.sh    # Linux bootstrap shim (default = chezmoi base apply, legacy flags = setup.ts)
├── bootstrap.ps1         # Main installer (Windows)
├── chezmoi/              # Base chezmoi-managed source state
├── setup.ts              # Interactive setup (macOS/Linux)
├── setup-windows.ts      # Interactive setup (Windows)
├── shell/                # Zsh config, aliases, functions, tips
├── stow-packages/        # Legacy symlink-managed configs still used by setup.ts
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
brew install stow chezmoi fnm

# Linux (choose one)
# sudo apt-get update && sudo apt-get install -y stow curl git
# sudo dnf install -y stow curl git
# sudo pacman -S --noconfirm --needed stow curl git

fnm install --lts
npm install -g pnpm
pnpm install
bash scripts/apply-chezmoi.sh

# legacy interactive lane
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
