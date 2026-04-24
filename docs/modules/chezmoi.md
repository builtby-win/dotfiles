# Chezmoi backbone

This repo now has a **real chezmoi-first bootstrap lane** for the base shell/bootstrap state.

The ownership split is deliberate:

- `chezmoi/` manages the base applied state used by default bootstrap
- `stow-packages/` remains the legacy module installer lane used by `bb setup` and `bb setup <module>`
- `assets/app-exports/` keeps native restore artifacts for apps that should not be symlinked into place
- `templates/` keeps copy-managed configs for tools that rewrite their own files

## Current bootstrap contract

- Running `bootstrap.sh` or `bootstrap-linux.sh` with no setup-path flag applies the base chezmoi state.
- Passing `--legacy-stow`, `--focus`, or `--setup-path ...` uses the legacy `setup.ts` flow instead.
- `bb apply` reapplies the base chezmoi state from the checked-out repo.
- `bb setup` and `bb setup <module>` remain the legacy interactive/stow-driven path.

## Why not symlink app exports?

Raycast `.rayconfig`, Rectangle Pro JSON exports, and BetterTouchTool presets are **restore artifacts**, not stable home-state files. They should stay versioned in the repo, but they should be imported through the app's own UI or restore flow.

## Current practical workflow

1. Clone the repo.
2. Install dependencies and apps.
3. Apply the base chezmoi state:

```bash
bb apply
```

4. Optionally run the legacy module installer for modules that still live under `stow-packages/`:

```bash
bb setup
bb setup tmux
bb setup ghostty
```

5. Sync or restore macOS app exports separately:

```bash
bb sync macos-apps pull
bb restore macos-apps
```

The sync command copies fresh exports into the repo. The restore command reveals the versioned exports and prints the import path for each app.
