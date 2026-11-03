# Clipboard sync (Linux and macOS)

[CopyQ](https://hluk.github.io/CopyQ/) keeps the clipboard history. Its `itemsync` plugin mirrors the clipboard tab to `~/ClipSync` as one file per item, and [Syncthing](https://syncthing.net) replicates that folder between machines. Both are free and need no server or account.

## Install

```bash
bb clipsync   # or: bash scripts/setup-clipsync.sh
```

On Omarchy, `scripts/setup-linux-desktop.sh` runs this. The script is idempotent and:

- Installs CopyQ and Syncthing (`pacman` on Linux, Homebrew on macOS).
- Adds `itemsync\sync_tabs=&clipboard, ~/ClipSync` to `copyq.conf` without touching other settings. A timestamped `.bak.<epoch>` copy is made first. If a different `sync_tabs` already exists it is left alone with a warning.
- Starts Syncthing at login (`systemctl --user` on Linux, `brew services` on macOS) and creates the `clipsync` folder.
- Starts CopyQ at login: `o.launch_on_start` in `~/.config/hypr/autostart.lua` (XDG autostart fallback) on Linux, a `~/Library/LaunchAgents/win.builtby.copyq.plist` agent on macOS.

Set `CLIPSYNC_DIR` to use a folder other than `~/ClipSync` (absolute path, no commas, quotes, or backslashes).

## Pair machines (once per pair)

Syncthing only syncs with devices it trusts, and device IDs are generated per machine, so this step cannot live in a template. Run on each machine with the other's ID:

```bash
bb clipsync id                          # prints this machine's ID
bb clipsync pair <other-device-id> laptop
```

Both sides must add each other. After that everything starts on its own at login.

## Behavior to know

- Copies you make on one machine are written to `~/ClipSync` immediately. The other machine imports them when its CopyQ starts or when the CopyQ window is open on the clipboard tab (it re-checks the folder about every 10 seconds). The incoming copy does not become the other machine's active clipboard; it appears in history.
- Everything copied is stored unencrypted in `~/ClipSync`, including password-manager copies unless CopyQ skips them. Syncthing encrypts it in transit.
- Both machines need to be online to exchange items. Syncthing catches up when they reconnect.
- Verified on Linux with CopyQ 16 and Syncthing 2.1. macOS paths (`/Applications/CopyQ.app`, the LaunchAgent, `brew services`) are not yet exercised on a Mac.
