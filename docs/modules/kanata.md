# Kanata module

Kanata is the preferred cross-platform keyboard remapper for this repo. It is the Windows/Linux/macOS replacement for the Karabiner-only chord and Hyper-key pieces.

## Goals

- two filtered macOS Kanata profiles avoid cross-keyboard modifier conflicts
- `Menu`/`Application` becomes Hyper: `Ctrl+Alt+Shift+Meta`
- Microsoft Sculpt swaps `Left Option` and `Left Command`, and maps
  `Right Option` to `Right Command`
- Other macOS keyboards map `Right Option` to Hyper
- Other macOS keyboards keep `Left Option` and `Left Command` in normal order
- Built-in and other macOS keyboards use the Apple-style media row by
  default, with `Fn` held for raw `F1`-`F12`
- `Caps Lock` sends `Escape` when tapped and `Control` when held
- `Delete Forward` sends `Escape`
- On macOS, `j+k` is app-aware with `kanata-vk-agent`: terminal apps send
  `Ctrl+b` for the tmux/psmux leader, while non-terminal apps arm a compact
  Command layer for the next keypress
- Without macOS app context, `j+k` falls back to the compact next-key Command/Super layer
- `d+f` sends `Hyper+f`
- Keep the same muscle memory across macOS, Linux, and Windows

## Config

The starter configs are managed by the default chezmoi lane and land at:

```text
~/.config/kanata/kanata.kbd
~/.config/kanata/kanata-sculpt.kbd
```

Their sources live at:

```text
chezmoi/dot_config/kanata/kanata.kbd
chezmoi/dot_config/kanata/kanata-sculpt.kbd
```

Apply it with:

```bash
bb apply
```

For the full guided macOS setup, use:

```bash
bb kanata-setup
```

The helper installs the patched Cargo build, installs `kanata-vk-agent`, validates
both Kanata configs, reveals the Kanata binary in Finder, opens Input Monitoring
and Accessibility, stops stale helper services, restarts the filtered Kanata
daemons and matching `kanata-vk-agent` instances, and checks their logs for
permission failures.

or directly:

```bash
bash scripts/apply-chezmoi.sh
```

For a manual smoke test, run one profile at a time with its chezmoi-managed config:

```bash
kanata --cfg ~/.config/kanata/kanata.kbd
kanata --cfg ~/.config/kanata/kanata-sculpt.kbd --port 5830
```

Kanata can filter devices with `macos-dev-names-include` /
`macos-dev-names-exclude`, but it cannot express Karabiner-style per-device
`device_if` mappings inside one active config. Sculpt needs a different modifier
shape, so this repo uses two explicit filtered profiles:

```text
~/.config/kanata/kanata.kbd         excludes 0xCB1EB82FC081667C, port 5829
~/.config/kanata/kanata-sculpt.kbd  includes only 0xCB1EB82FC081667C, port 5830
```

The Microsoft Sculpt receiver is `0xCB1EB82FC081667C` in `kanata --list`, with
VendorID `1118` / ProductID `1957`. Its profile maps:

```text
Left Option  -> Left Command
Left Command -> Left Option
Right Option -> Right Command
Menu/App     -> Hyper
```

The non-Sculpt profile keeps left modifiers normal and maps `Right Option` plus
`Menu`/`Application` to Hyper. This avoids the failed `hidutil` approach: macOS
`UserKeyMapping` can show a mapping, but Kanata still reads the raw keyboard event
before that mapping affects its input path.

The config maps plain `F1`-`F12` key events to the common macOS media row:

```text
F1  -> brightness down
F2  -> brightness up
F3  -> Mission Control
F4  -> Launchpad
F5  -> keyboard backlight down
F6  -> keyboard backlight up
F7  -> previous track
F8  -> play/pause
F9  -> next track
F10 -> mute
F11 -> volume down
F12 -> volume up
```

Hold `Fn` for raw `F1`-`F12`. Tap/hold `Fn` otherwise acts as left Control when
the Apple keyboard exposes it to macOS.

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

For Kanata login startup, prefer a root `LaunchDaemon` over a user `LaunchAgent`. The
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

This repo's guided helper writes two filtered daemons with the current user's
expanded Cargo binary path and expanded chezmoi config paths:

- `/Library/LaunchDaemons/com.builtbywin.kanata.plist` on TCP port `5829`
- `/Library/LaunchDaemons/com.builtbywin.kanata-sculpt.plist` on TCP port `5830`

The helper also stops the legacy `com.builtbywin.kanata-other` daemon and the
failed `local.microsoft-sculpt-hidutil` experiment if they exist, so only the two
named filtered profiles remain.

## macOS app-aware context with kanata-vk-agent

Kanata cannot natively match Karabiner's `frontmost_application_if`. On macOS,
this repo uses [`kanata-vk-agent`](https://github.com/devsunb/kanata-vk-agent)
as a small context bridge instead of running Karabiner Elements. Kanata remains
the only keyboard remapper; `kanata-vk-agent` only watches the frontmost app and
presses/releases Kanata virtual keys over the TCP server.

Install manually if needed:

```bash
brew tap devsunb/tap
brew install kanata-vk-agent
```

The guided helper installs one user LaunchAgent per Kanata TCP port:

```text
~/Library/LaunchAgents/local.kanata-vk-agent.plist
~/Library/LaunchAgents/local.kanata-vk-agent-sculpt.plist
```

It also stops the legacy `local.kanata-vk-agent-other` LaunchAgent if it exists.

Each agent connects to its matching Kanata TCP port and tracks these terminal
bundle IDs:

```text
com.mitchellh.ghostty,com.googlecode.iterm2,com.apple.Terminal,dev.warp.Warp-Stable,net.kovidgoyal.kitty,org.alacritty,io.alacritty,com.github.wez.wezterm,com.cmuxterm.app
```

Those IDs are mirrored in both Kanata configs under `defvirtualkeys`. The `j+k`
chord uses `switch` with `input virtual ...`:

- terminal virtual key pressed: send `Ctrl+b`
- no terminal virtual key pressed: arm the `cmd` layer for the next keypress

The config keeps app-aware behavior behind semantic aliases so future chords do
not need to duplicate raw bundle-ID logic. The current shape is:

```lisp
(defalias
  leader (macro C-b)
  cmd-next (one-shot 2000 (layer-while-held cmd))
  terminal-leader-or-cmd-layer (switch
    ((input virtual com.mitchellh.ghostty)) @leader break
    ;; ...other terminal bundle IDs...
    () @cmd-next break
  )
  jk @terminal-leader-or-cmd-layer
)

(defvirtualkeys
  ;; ...terminal bundle IDs...
)

(defchordsv2
  (j k) @jk 75 first-release ()
)
```

The fallback `cmd` layer intentionally uses `one-shot` instead of a held layer.
Press `j+k`, release it, then press the next key. That one key is interpreted
through `cmd`, then Kanata returns to the base layer. The `2000` timeout is only a
safety cap if no next key arrives.

When adding another app-aware chord or layer, follow the same convention:

1. Add the bundle ID to `TERMINAL_BUNDLE_IDS` in `scripts/setup-kanata-macos.sh`
   if `kanata-vk-agent` should track it.
2. Add the same ID to `defvirtualkeys` in both Kanata configs.
3. For next-key layer fallbacks, use `(one-shot <timeout-ms> (layer-while-held <layer>))`.
4. Put the `switch` in a named alias, for example
   `terminal-foo-or-default-layer`.
5. Point the chord at the semantic alias, for example `(x y) @terminal-foo-or-default-layer ...`.

This keeps chord definitions readable and localizes app-context branching to the
alias block. Kanata itself still does not know app context; `kanata-vk-agent`
presses/releases virtual keys over the TCP server, and Kanata reacts to those
virtual keys.

The `cmd` layer currently keeps the scope intentionally small:

```text
tab -> Cmd+Tab
`   -> Cmd+`
a   -> Cmd+A
c   -> Cmd+C
v   -> Cmd+V
x   -> Cmd+X
z   -> Cmd+Z
w   -> Cmd+W
q   -> Cmd+Q
```

Discover additional bundle IDs with:

```bash
kanata-vk-agent -f
```

Logs live at:

```text
/tmp/kanata-vk-agent.out.log
/tmp/kanata-vk-agent.err.log
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

Kanata is cross-platform, but strict app-aware behavior is not one-to-one across
Windows, macOS, and Linux without companion tooling. macOS gets app-aware
terminal detection through `kanata-vk-agent`; other platforms currently use the
same shared fallback as an unclassified macOS app: `j+k` arms the compact
Command/Super layer for the next keypress.

Recommended path:

- On macOS, use `bb kanata-setup` so both filtered Kanata daemons and their
  matching `kanata-vk-agent` instances are started.
- If `kanata-vk-agent` is not running, terminal apps are not classified and
  `j+k` will arm the fallback Command/Super layer instead of sending `Ctrl+b`.
- If `j+k` interferes with normal typing, move the chord behind an explicit layer
  or tune the chord timeout.
- Use AutoHotkey only for Windows-only gaps that Kanata cannot handle cleanly.

## Debugging

If the Microsoft Sculpt `Menu` key does not trigger Hyper, run the Sculpt profile
with debug output and confirm the reported key name:

```bash
kanata --debug --cfg ~/.config/kanata/kanata-sculpt.kbd --port 5830
```

On Windows:

```powershell
bb kanata-debug
```

The expected key name is `menu`; Karabiner's `application` key maps to Kanata's `menu` alias. If debug logs show `InputEvent { value: 1, page: 7, code: 101 } is unrecognized!`, rebuild with `bash scripts/install-kanata-macos.sh` and restart the LaunchDaemon. Some Windows input paths may require a different Kanata binary or local key mapping.
