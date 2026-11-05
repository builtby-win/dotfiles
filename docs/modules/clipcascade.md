# Clipboard sync (Linux and macOS)

[ClipCascade](https://github.com/Sathvik-Rao/ClipCascade) syncs text, images, and files live between machines through a small self-hosted server. Traffic is end-to-end encrypted, and the server is published only on the host's Tailscale IP.

## Server (one always-on Linux machine)

```bash
bb clipcascade server   # or: bash scripts/setup-clipcascade.sh server
```

Writes `~/.local/share/clipcascade-server/compose.yml` and starts the container with `restart: unless-stopped`. It binds `<tailscale-ip>:8080`, persists accounts in `~/.local/share/clipcascade-server/cc_users` (mounted at `/database`), and allows messages up to 20 MiB (`CLIPCASCADE_MAX_MIB`). Self-signup is off.

Log in at `http://<tailscale-ip>:8080` with `admin` / `admin123` and change the password immediately.

## Clients (every machine, including the server)

```bash
bb clipcascade client
```

- **Linux (Arch/Omarchy):** installs the dependencies, downloads the latest `ClipCascade_Linux.zip` to `~/.local/share/clipcascade`, and adds a launch entry to `~/.config/hypr/autostart.lua` (XDG autostart fallback). Run `bb clipcascade run` once to enter the server URL and credentials. On Hyprland/Wayland the client runs in CLI mode using `wl-paste --watch`.
- **macOS:** downloads the latest app to `/Applications/ClipCascade.app`, clears the quarantine flag, and opens it. Add it to Login Items to start at login.

Enter `http://<tailscale-ip>:8080` as the server. If encryption is enabled, enable it on every device.

## Notes

- Everything copied is sent to the server (encrypted end to end), including password-manager copies unless the client skips them.
- Both machines must be on the tailnet.
- The client install and the Wayland clipboard path are not yet exercised on this repo's Linux machine.
