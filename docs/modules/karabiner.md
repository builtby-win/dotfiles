# Karabiner Elements module (macOS)

Karabiner Elements provides the macOS keyboard layer, app-aware chords, and Neru mode integration.

## Prerequisites

- macOS
- Karabiner Elements installed (brew cask: `karabiner-elements`)

## Install

Chezmoi apply:

```bash
bb setup karabiner
```

This applies the Karabiner config, Neru integration, and `karabiner-layer` helper, then restarts Karabiner Elements.

Manual sync and restart:

```bash
./scripts/sync-karabiner.sh push
```

Pull the current machine config back into dotfiles:

```bash
bb sync karabiner pull
# or
./scripts/sync-karabiner.sh pull
```

## Key mappings

- `f+j` opens the Neru pointer grid
- `j+l` opens the Neru recursive grid
- `d+k` opens Neru scroll mode
- `d+f` opens Neru hints
- `j+k` sends `Ctrl+b` in terminals and arms Command for the next key elsewhere
- Holding `j`, then pressing Space repeatedly, sends Backspace outside GUI Vim editors
- Tapping Right Option arms Hyper for the next key; holding it holds Hyper
- Tapping a modifier arms it for the next key; holding it behaves normally
- `Caps Lock` is Escape when tapped and Control when held
- `Fn` exposes raw function keys and taps as Control
- Forward Delete becomes Escape
- Double semicolon (`;;`) opens AltTab

Neru calls `karabiner-layer` to switch between grid, scroll, nudge, and normal modes through Karabiner variables. App-specific behavior uses Karabiner's native foreground-application conditions; no polling agent is required.

Microsoft Sculpt keyboards are detected by vendor/product ID:

- Left Alt becomes Command
- Left Windows becomes Option
- Right Alt becomes Command
- Menu becomes tap/hold Hyper
