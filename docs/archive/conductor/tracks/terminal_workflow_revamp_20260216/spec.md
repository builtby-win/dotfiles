# Specification: Terminal Workflow & Tips Revamp

## Overview
This track aims to improve the terminal user experience by refreshing the "Tip of the Day" content with actionable tmux and shell advice, remapping `Cmd+C` from its current behavior (opening new panes) to a standard yank/copy action that integrates with both the tmux buffer and the system clipboard, and enhancing the tmux command palette for better discoverability.

## Functional Requirements

### 1. Refreshed Tips System
- **Content Overhaul**: Replace existing tips in `shell/tips.txt` with high-quality, task-based tips focusing on:
    - **Pane Management**: Splitting (`Leader + d/D`), resizing (`Alt + Arrows`), and navigating (`Alt + hjkl`).
    - **Advanced Layouts**: Breaking a pane into a new window (`Leader + !`), swapping panes (`Leader + >/<`).
    - **Session/Window Management**: Using `sesh` (`Leader + Space`), switching windows (`Alt + number`), and renaming (`Leader + ,/$`).
    - **Copy Mode**: Entering copy mode (`Leader + v`), selecting text, and yanking.
- **Formatting**: Use a consistent format: `[Category] Task: Description + Shortcut` (e.g., `[TMUX] Split Vertically: Create a side-by-side pane with Leader + d`).

### 2. `Cmd+C` Yank/Copy Integration
- **Remove Conflicting Binding**: Unbind `M-c` (which macOS/Ghostty often sends for `Cmd+C`) from `new-window` in `.tmux.conf`.
- **Implement Copy/Yank**: Map `M-c` to copy the current selection (if in copy mode) to both the tmux buffer and the system clipboard using `pbcopy`.
- **Expected Behavior**: Pressing `Cmd+C` while text is selected in the terminal should copy it to the system clipboard and the tmux buffer.

### 3. Enhanced Command Palette
- **New Keybinding**: Map `Leader + /` to trigger the tmux command palette (currently on `Leader + p`).
- **Fuzzy Matching**: Ensure the command palette uses `fzf` for fuzzy matching across all categorized commands (Sessions, Windows, Panes, Copy & Paste).
- **Better Discoverability**: Add the new/updated shortcuts (like `Leader + !` for breaking panes) to the palette.

### 4. New Tmux Shortcuts
- **Pane Swapping**: Add `bind -r > swap-pane -D` and `bind -r < swap-pane -U` to allow quick pane reordering.

## Acceptance Criteria
- [ ] `shell/tips.txt` contains at least 10 new, task-oriented tips for tmux and shell usage.
- [ ] Pressing `Cmd+C` in Ghostty (which sends `M-c`) no longer opens a new window/pane.
- [ ] Pressing `Cmd+C` while in tmux copy-mode copies the selected text to the macOS clipboard and exits copy-mode.
- [ ] `Leader + /` opens a fuzzy-searchable popup showing available tmux commands.
- [ ] `Leader + >` and `Leader + <` successfully swap the current pane with its neighbor.

## Out of Scope
- Modifying Ghostty's core binary or global macOS shortcuts outside of Karabiner/Tmux/Ghostty config files.
- Implementing a persistent "Tips" database; will remain a simple text-file-based system.
