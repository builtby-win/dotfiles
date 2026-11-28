# Specification: Remove Beads & Implement Tmux Pane Dimming

## Overview
This track involves two distinct cleanup and enhancement tasks:
1.  **Decommissioning Beads:** Removing all references, scripts, and configurations related to the "beads" (bd) issue tracking system, which is no longer in use.
2.  **Tmux Visual Enhancement:** Improving focus awareness in Tmux by visually dimming inactive panes.

## Functional Requirements

### 1. Remove Beads Implementation
- **Cleanup Shell Scripts:** Remove logic for sourcing `beads.sh` from `shell/init.sh` and delete any standalone beads scripts (e.g., `shell/experimental/beads.sh`).
- **Update Setup Logic:** Remove beads detection and configuration options from `setup.ts`.
- **Update Manifest:** Remove the `beads` feature flag from `lib/manifest.ts`.
- **Refactor Documentation:** Remove mentions of beads/bd from `AGENTS.md`, `README.md`, `agents/README.md`, and all agent-specific `GEMINI.md`/`CLAUDE.md` files.

### 2. Tmux Pane Dimming
- **Active Pane Style:** Ensure the active pane retains full color and the default background.
- **Inactive Pane Style:** Apply a subtle "greyed out" effect to inactive panes:
    - Background: `colour234` (dark grey).
    - Foreground: `colour245` (dimmed grey).
- **Preserve Borders:** Maintain the existing border styles:
    - Active border: `blue`.
    - Inactive border: `brightblack`.

## Non-Functional Requirements
- **Consistency:** Ensure documentation remains coherent after removing beads instructions.
- **Performance:** Tmux styling should not introduce any noticeable latency when switching panes.

## Acceptance Criteria
- [ ] No files in the repository contain the string "beads" or "bd" in the context of the issue tracker.
- [ ] `shell/init.sh` no longer attempts to source beads-related files.
- [ ] `setup.ts` no longer offers beads as an installation option.
- [ ] In a Tmux session with multiple panes, the inactive panes are visibly darker/dimmer than the active pane.
- [ ] Tmux borders remain blue (active) and brightblack (inactive).

## Out of Scope
- Migrating existing beads issues to a new system.
- Adding other Tmux styling features (e.g., status bar refactoring).
