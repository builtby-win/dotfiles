# Setup presets

A preset JSON decides the app/config/feature selection up front, so setup
skips the selection checklists and goes straight to the single review screen
before anything installs.

## General presets (shipped here)

Only general archetypes live in this repo — never per-client files:

| Preset | For |
| --- | --- |
| `basic` | Essentials only: terminal, editor, `gh`, Codex, Docker, shell. No extras to get lost in. |
| `pro` | Full workflow: the recommended defaults plus Codex, Docker, and Ghostty. |

They also appear in the first-run CLI menu ("Preset: …") and in the setup
skill's starting-point choices.

## Individualized presets (passed in, not committed)

For a specific person, write any JSON file following the schema below, get it
onto their machine (AirDrop, download, …), and pass its path:

```bash
# Shipped general preset, by name:
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --preset basic

# Individualized file already on the machine:
curl -fsSL https://raw.githubusercontent.com/builtby-win/dotfiles/main/bootstrap.sh | bash -s -- --preset ~/Downloads/their-setup.json

# Or after install, via the bb helper:
bb setup --preset pro
bb setup --preset ~/their-setup.json
```

## Schema

All fields are optional. Unknown app/config/feature values fail with an error
listing the valid values — typos never silently change the selection.

| Field | Meaning |
| --- | --- |
| `name` | Label shown in the CLI menu and when the preset is applied. |
| `apps` | Full app selection (values from `APPS` in `setup.ts`). Replaces the checked defaults. |
| `addApps` | Added on top of the checked defaults (ignored when `apps` is present). |
| `removeApps` | Removed from the selection, applied last. |
| `configs` | Managed configs to apply (`zsh`, `tmux`, `nvim`, `hammerspoon`, `karabiner`, `iterm2`, `ghostty`). Defaults to the checked defaults. |
| `features` | Optional features (`tips`). Defaults to the checked defaults. |

Without `apps`, the base selection is the setup checklist's checked defaults
plus anything already installed. Apps that don't exist on the current platform
(e.g. `docker` on Linux) are skipped.

Presets only choose what the existing installer installs. They never run
arbitrary commands, and logins (`gh`, Infisical, AI CLIs) and GUI first-launch
steps (Docker Desktop) still happen interactively as usual.
