# Mackup module (deprecated)

This repo no longer recommends Mackup as the macOS app-settings restore path.

Instead, keep native app exports under `assets/app-exports/` and use the restore helpers documented in:

- `docs/modules/app-backups.md`
- `docs/modules/chezmoi.md`

Current restore entrypoints:

```bash
bb restore macos-apps
bb restore raycast
bb restore rectangle-pro
bb restore bettertouchtool
```

The old `bb setup mackup` flow has been removed from the active setup catalog.
