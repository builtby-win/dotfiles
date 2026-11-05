# Herdr Pane HUD

A lightweight, persistent top-right pane layout HUD for [Herdr](https://herdr.dev).

Shows the visual split topology of the current tab directly on the top tab bar:
- **`│` (pipe)**: separates horizontal splits (columns side-by-side)
- **`/` (slash)**: separates vertical splits (stacked panes top/bottom)
- **Active pane**: highlighted in place using standard ANSI reverse-video styling without changing the digit size or font metrics
- **Agent name**: displays the occupant of the active pane (e.g. `omp`, `agy`, `claude`)

---

### Installation

#### As a Herdr Plugin
```bash
herdr plugin install <username>/herdr-pane-hud
```
Or for local development:
```bash
herdr plugin link path/to/herdr-pane-hud
```

#### Configuration
Add to your `~/.config/herdr/config.toml`:

```toml
[ui]
# Keep standard tab bar on mobile so tab_bar_right stays permanently visible in the top right
mobile_width_threshold = 0

# Register the Pane HUD in the top-right status area
tab_bar_right = [
  { type = "command", command = "herdr-pane-layout-status", interval_seconds = 1 }
]
```

Then reload Herdr:
```bash
herdr server reload-config
```
