# Kanata module

Kanata is the preferred cross-platform keyboard remapper for this repo. It is the Windows/Linux/macOS replacement for the Karabiner-only chord and Hyper-key pieces.

## Goals

- Microsoft Sculpt `Menu` key becomes Hyper: `Ctrl+Alt+Shift+Meta`
- `j+k` sends `Ctrl+b` for the tmux/psmux leader
- Keep the same muscle memory across macOS, Linux, and Windows

## Config

The starter config lives at:

```text
stow-packages/kanata/.config/kanata/kanata.kbd
```

After applying/stowing dotfiles, run:

```bash
kanata --cfg ~/.config/kanata/kanata.kbd
```

On Windows PowerShell, use:

```powershell
bb kanata
```

Equivalent direct command:

```powershell
kanata --cfg "$HOME\.config\kanata\kanata.kbd"
```

## Windows Install

Windows setup can install Kanata GUI:

```powershell
winget install --id jtroo.kanata_gui -e
```

For the CLI, use a release binary from Kanata or install Rust and build it:

```powershell
winget install --id Rustlang.Rustup -e
cargo install kanata
```

## Windows Autostart

Install Kanata as a login task, similar to a macOS Login Item:

```powershell
bb kanata-install
```

Check it:

```powershell
bb kanata-status
```

Remove it:

```powershell
bb kanata-uninstall
```

This registers a Task Scheduler task named `BuiltBy Kanata` that runs `windows/kanata-start.ps1` at logon with highest privileges. Run PowerShell as Administrator when installing the task.

Manual equivalent:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\dotfiles\windows\kanata-autostart.ps1" -Action install
```

## App Scope

The starter `j+k -> Ctrl+b` chord is global. Kanata is cross-platform, but strict app-aware behavior is not one-to-one across Windows, macOS, and Linux without companion tooling.

Recommended path:

- Start with the global `j+k` chord because it gives immediate tmux/psmux parity.
- If it interferes with normal typing, move the chord behind an explicit layer or add OS-specific app-aware switching later.
- Use AutoHotkey only for Windows-only gaps that Kanata cannot handle cleanly.

## Debugging

If the Microsoft Sculpt `Menu` key does not trigger Hyper, run Kanata with debug output and confirm the reported key name:

```bash
kanata --debug --cfg ~/.config/kanata/kanata.kbd
```

On Windows:

```powershell
bb kanata-debug
```

The expected key name is `menu`. Some Windows input paths may require a different Kanata binary or local key mapping.
