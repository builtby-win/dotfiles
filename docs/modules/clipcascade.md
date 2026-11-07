# Clipboard sync (Linux and macOS)

[ClipCascade](https://github.com/Sathvik-Rao/ClipCascade) syncs text, images, and files live between machines through a small self-hosted server. Traffic is end-to-end encrypted, and the server is published only on the host's Tailscale IP.

## Server (one always-on Linux machine)

```bash
bb clipcascade server   # or: bash scripts/setup-clipcascade.sh server
```

Writes `~/.local/share/clipcascade-server/compose.yml` and starts the container with `restart: unless-stopped`. It also enables `docker.service` so the server comes back after a reboot, and adds a `docker.service.d/clipcascade-after-tailscale.conf` drop-in that starts Docker after `tailscaled` and waits (up to 60 s) for the Tailscale IP, since the container binds it. It prompts for `sudo`. It binds `<tailscale-ip>:8080`, persists accounts in `~/.local/share/clipcascade-server/cc_users` (mounted at `/database`), and allows messages up to 20 MiB (`CLIPCASCADE_MAX_MIB`). Self-signup is off.

Log in at `http://<tailscale-ip>:8080` with `admin` / `admin123` and change the password immediately.

## Clients (every machine, including the server)

```bash
bb clipcascade client
```

- **Linux (Arch/Omarchy):** installs the dependencies, downloads the latest `ClipCascade_Linux.zip` to `~/.local/share/clipcascade`, and installs an enabled user service, `~/.config/systemd/user/clipcascade.service`. `pyfiglet` (imported unconditionally in CLI mode) is not packaged for Arch, so the client runs from a venv at `~/.local/share/clipcascade-venv` that uses the system packages (`--system-site-packages`) and installs `pyfiglet` from PyPI. The service is wanted by `graphical-session.target`, so it starts with the Hyprland session (Omarchy autologin + uwsm) and restarts after 10 s if it exits. It is skipped until a login has been saved (`DATA`). Run `bb clipcascade run` once to enter the server URL and credentials, press Ctrl+C, then `systemctl --user restart clipcascade`. The client is launched with `--gui false --xmode false` (CLI, `wl-paste`), because upstream classifies Hyprland with `DISPLAY` set as XWayland and would otherwise pick `xclip`. Reinstalling keeps the saved login (`DATA`). Logs: `journalctl --user -u clipcascade`.
- **macOS:** downloads the latest app to `/Applications/ClipCascade.app`, clears the quarantine flag, and opens it. Add it to Login Items to start at login.

Enter `http://<tailscale-ip>:8080` as the server. If encryption is enabled, enable it on every device.

## Notes

- Everything copied is sent to the server (encrypted end to end), including password-manager copies unless the client skips them.
- Both machines must be on the tailnet.
- The client install and the Wayland clipboard path are not yet exercised on this repo's Linux machine.
