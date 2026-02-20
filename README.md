# builtby.win/dotfiles

Fast, modular dotfiles with interactive setup and a la carte modules.

## Quick install

macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap-linux.sh | bash
```

Windows (PowerShell as Administrator):

```powershell
irm https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.ps1 | iex
```

More details in `WINDOWS_README.md`.

## After install

Open a new shell and run:

```bash
bb help
```

`bb` is a lightweight wrapper that makes common tasks discoverable.
If `bb` is not found, run `pnpm run setup`, select Shell config, and restart your shell.

## Choose your setup path

**🚀 Focused Setup (Back2Vibing):**
Optimized for AI developers. Installs Back2Vibing, tmux, sesh, fzf, and Ghostty terminal.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --focus
```

**⭐ Standard Setup (Recommended):**
Installs the `bb` helper, core aliases, and essential CLI tools.

```bash
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash
```

**🌱 Minimal Setup (Shell only):**
Just the foundation: aliases, `bb` helper, starship, and shell config.

**🛠️ Custom Setup:**
Pick and choose exactly which apps, configs, and features you want.

---

Full setup (interactive):

```bash
bb setup
```

This runs the interactive setup and orchestrates apps, configs, and optional features.

A la carte modules:

```bash
bb setup tmux
bb setup hammerspoon
bb setup karabiner
bb setup ghostty
```

This is ideal if you want to add pieces over time.

## Module index

| Module | Install | Notes | Docs |
| --- | --- | --- | --- |
| Shell (zsh) | `bb setup shell` | zinit, starship, aliases, PATH | `docs/modules/shell.md` |
| Tmux | `bb setup tmux` | prefix Ctrl+b and sesh integration | `docs/modules/tmux.md` |
| Hammerspoon | `bb setup hammerspoon` | Hyper app launcher + Ghostty 4-pane hotkey | `docs/modules/hammerspoon.md` |
| Karabiner | `bb setup karabiner` | macOS only, jk to tmux prefix | `docs/modules/karabiner.md` |
| Ghostty | `bb setup ghostty` | terminal config | `docs/modules/ghostty.md` |
| Mackup | `bb setup mackup` | app settings backup | `docs/modules/mackup.md` |
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

## Structure

```
dotfiles/
├── bootstrap.sh          # Entry installer (routes by OS)
├── bootstrap-linux.sh    # Linux bootstrap shim (installs git/node, hands off to setup.ts)
├── bootstrap.ps1         # Main installer (Windows)
├── setup.ts              # Interactive setup (macOS/Linux)
├── setup-windows.ts      # Interactive setup (Windows)
├── shell/                # Zsh config, aliases, functions, tips
├── stow-packages/        # Symlink-managed configs
├── templates/            # Copy-managed configs for AI tools
└── docs/                 # Module documentation
```

## Manual setup (if you prefer)

```bash
git clone https://github.com/builtby-win/dotfiles.git ~/dotfiles
cd ~/dotfiles

# macOS
brew install stow fnm

# Linux (choose one)
# sudo apt-get update && sudo apt-get install -y stow curl git
# sudo dnf install -y stow curl git
# sudo pacman -S --noconfirm --needed stow curl git

fnm install --lts
npm install -g pnpm
pnpm install
pnpm run setup
```

## Docs

- `docs/modules/shell.md`
- `docs/modules/tmux.md`
- `docs/modules/hammerspoon.md`
- `docs/modules/karabiner.md`
- `docs/modules/ghostty.md`
- `docs/modules/mackup.md`
- `docs/modules/ai.md`
- `agents/README.md`

## License

MIT
