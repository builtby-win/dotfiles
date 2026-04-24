# macOS app backups

This repo keeps native restore artifacts for apps that should be restored through their own import flow.

## Stored exports

- `assets/app-exports/raycast/archive/Raycast-2026-04-22-23-03-14.rayconfig`
- `assets/app-exports/rectangle-pro/RectangleProConfig.json`
- `assets/app-exports/bettertouchtool/Default.bttpreset`

## Sync helpers

Pull the latest machine exports into the repo:

```bash
bb sync macos-apps pull
bb sync raycast pull
bb sync rectangle-pro pull
bb sync bettertouchtool pull
```

For Raycast, export a backup first so a fresh `Raycast-*.rayconfig` file lands in `~/Downloads`.

For Rectangle Pro and BetterTouchTool, export their config/preset from the app first, then rerun sync.

## Restore helpers

Reveal all app exports and print the restore steps:

```bash
bb restore macos-apps
```

Reveal a specific export:

```bash
bb restore raycast
bb restore rectangle-pro
bb restore bettertouchtool
```

## Notes by app

### Raycast

Use Raycast's import flow for the `.rayconfig` file. Keep the export private unless you have audited it.

### Rectangle Pro

Use Rectangle Pro's import flow for `RectangleProConfig.json`.

### BetterTouchTool

Use BetterTouchTool's preset restore/import flow for `Default.bttpreset`. Treat presets carefully because they can embed actions, scripts, and other machine-specific behavior.
