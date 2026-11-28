# Kanata Hello World Plan

## Step 1: Minimal "Hello World" Configuration
- Create a bare-minimum `kanata-hello.kbd` that maps exactly one common key (e.g., `caps` to `esc`).
- Run Kanata manually in the terminal with `--debug` to ensure it can intercept key events.
- **Goal:** Verify that Kanata can grab the input device and successfully inject a keypress. This isolates OS-level permissions (macOS Input Monitoring/Accessibility, Windows drivers, Linux udev rules) from configuration logic errors.

## Step 2: Fix OS Interception & Permissions
- If Kanata fails to detect keys or start:
  - **macOS:** Ensure Kanata has Accessibility and Input Monitoring permissions. Verify if the Karabiner driver (virtualio) is required for key injection.
  - **Windows:** Check the interception driver installation and Task Scheduler privileges.
  - **Linux:** Add the user to the `input` group or set up appropriate udev rules.
- Optional: Use `defcfg` to specifically target the correct keyboard device if multiple exist.

## Step 3: Layer Toggle Test
- Expand the configuration to test a basic layer modification.
- For example, holding `Space` triggers a `nav` layer where `j` and `k` act as `Down` and `Up`.
- **Goal:** Confirm that layer switching logic works and hold-taps are functioning properly.

## Step 4: Re-implement Target Features (Hyper & Chords)
- Map `menu` (or `caps`) to `@hyper` (Ctrl+Alt+Shift+Cmd).
- Re-implement `defchordsv2` for the `j + k -> Ctrl+b` tmux chord.
- Test timing and ensure it doesn't interfere with normal typing.

## Step 5: Autostart Configuration
- Once the config is verified to work perfectly when launched manually, re-configure the autostart mechanism (e.g., LaunchAgent on macOS, Task Scheduler on Windows, systemd on Linux).
