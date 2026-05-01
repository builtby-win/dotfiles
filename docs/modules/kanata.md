# Kanata module

Kanata is the preferred cross-platform keyboard remapper for this repo. It is the Windows/Linux/macOS replacement for the Karabiner-only chord and Hyper-key pieces.

## Goals

- Microsoft Sculpt `Menu`/`Application` key becomes Hyper: `Ctrl+Alt+Shift+Meta`
- Microsoft Sculpt `Left Option`/`Left Command` match the old Karabiner swap
- Microsoft Sculpt `Right Option` sends `Right Command`
- `Caps Lock` sends `Escape` when tapped and `Control` when held
- `Delete Forward` sends `Escape`
- `j+k` sends `Ctrl+b` for the tmux/psmux leader
- `d+f` sends `Hyper+f`
- Keep the same muscle memory across macOS, Linux, and Windows

## Config

The starter config is managed by the default chezmoi lane and lands at:

```text
~/.config/kanata/kanata.kbd
```

Its source lives at:

```text
chezmoi/dot_config/kanata/kanata.kbd
```

Apply it with:

```bash
bb apply
```

For the full guided macOS setup, use:

```bash
bb kanata-setup
```

The helper installs the patched Cargo build, validates `~/.config/kanata/kanata.kbd`,
reveals the Kanata binary in Finder, opens Input Monitoring and Accessibility,
installs the LaunchDaemon, restarts Kanata, and checks `/tmp/kanata.err.log` for
permission failures.

or directly:

```bash
bash scripts/apply-chezmoi.sh
```

Then run Kanata with the chezmoi-managed config:

```bash
kanata --cfg ~/.config/kanata/kanata.kbd
```

On macOS, the default config targets the Microsoft Sculpt receiver by its Kanata
device hash:

```lisp
macos-dev-names-include (
  "0xCB1EB82FC081667C"
)
```

That prevents these modifier swaps from affecting the built-in MacBook keyboard.
The receiver also appears as `Microsoft® 2.4GHz Transceiver v9.0` in macOS, but
Kanata's hash match is more reliable for this setup.

## macOS Install

Install the Kanata CLI with Cargo instead of Homebrew. The Homebrew formula builds
Kanata without the `cmd` feature, which prints `compiled to never allow cmd` at
startup. The dotfiles setup uses Cargo so the binary is built with upstream `cmd`
support:

```bash
cargo install kanata --features cmd
```

On macOS, use the repo installer instead:

```bash
bash scripts/install-kanata-macos.sh
```

That script applies one local Kanata 1.11.0 patch before rebuilding, then ad-hoc
signs the binary as `com.builtbywin.kanata` so macOS privacy permissions have a
stable identity. The Microsoft
Sculpt Application/Menu key reports `InputEvent { page: 7, code: 101 }`, which is
HID keyboard usage `0x07/0x65`. Kanata 1.11.0 can emit that code for `menu`, but
its macOS input table does not recognize the same physical key on the way in. The
patch maps `0x07/0x65` back to `KEY_COMPOSE`, letting this config's `menu -> Hyper`
rule run.

If `cargo` is missing, install Rust first from <https://rustup.rs>.

Kanata's macOS backend uses the Karabiner virtual HID driver and should run as
root. The official Kanata path is the standalone `Karabiner-DriverKit-VirtualHIDDevice`
package from Kanata's macOS release notes. Installing full Karabiner Elements is
acceptable as a fallback because it brings the driver and approval flow, but you
do not need to use Karabiner Elements for remaps once Kanata is working.

Grant the exact Kanata binary, usually `~/.cargo/bin/kanata`, the required macOS
privacy permissions:

- **System Settings → Privacy & Security → Input Monitoring**
- **System Settings → Privacy & Security → Accessibility**

If you rebuild Kanata, remove and re-add the binary in both panes. macOS privacy
grants are tied to the executable identity, and Cargo replaces the binary in place.

For a first smoke test, keep it in the foreground so errors are visible:

```bash
sudo ~/.cargo/bin/kanata --debug --cfg ~/.config/kanata/kanata.kbd
```

For login startup, prefer a root `LaunchDaemon` over a user `LaunchAgent`. The
official Kanata sample uses `/Library/LaunchDaemons` and points `--cfg` at an
absolute config path such as `/etc/kanata/kanata.kbd`. If you keep the config
managed by chezmoi at `~/.config/kanata/kanata.kbd`, either copy that file to
`/etc/kanata/kanata.kbd` in your service install step or point the daemon at the
expanded absolute path under your home directory. With Cargo, the daemon should
run the expanded binary path, for example `/Users/<you>/.cargo/bin/kanata`, not
`~/.cargo/bin/kanata`.

Example one-time copy after `bb apply`:

```bash
sudo mkdir -p /etc/kanata
sudo cp ~/.config/kanata/kanata.kbd /etc/kanata/kanata.kbd
```

This repo's guided helper instead writes `/Library/LaunchDaemons/com.builtbywin.kanata.plist`
with the current user's expanded Cargo binary path and expanded chezmoi config path.

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

The expected key name is `menu`; Karabiner's `application` key maps to Kanata's `menu` alias. If debug logs show `InputEvent { value: 1, page: 7, code: 101 } is unrecognized!`, rebuild with `bash scripts/install-kanata-macos.sh` and restart the LaunchDaemon. Some Windows input paths may require a different Kanata binary or local key mapping.
