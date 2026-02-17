# Implementation Plan: Terminal Workflow & Tips Revamp

## Phase 1: Terminal Tips Content Refresh [checkpoint: ba0bc51]
Focus on updating the content and structure of the tips system to provide high-value, actionable advice.

- [x] Task: Red Phase - Write failing tests for tips format validation 2eef715
    - [x] Create `tests/tips_validation.test.ts` to ensure tips follow the `[Category] Task: Description + Shortcut` format and that comments/empty lines are handled.
    - [x] Run tests and verify failure.
- [x] Task: Green Phase - Update `shell/tips.txt` with high-quality content b312ed5
    - [x] Replace existing content with at least 10 task-oriented tips covering pane management, sessions, and advanced tmux features.
    - [x] Run tests and verify success.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Terminal Tips Content Refresh' (Protocol in workflow.md)

## Phase 2: Tmux Keybindings & Clipboard Integration [checkpoint: 1a25ae7]

## Phase 3: Command Palette Enhancements & UI Polish [checkpoint: 4c0dfc4]
Refine the command palette content to include new shortcuts and significantly improve readability using columns and colors.

- [x] Task: Red Phase - Write failing tests for command palette UI/Content 39fc962
    - [x] Update `tests/tmux_config.test.ts` to verify the presence of new commands and the new `|` delimiter for columns.
    - [x] Run tests and verify failure.
- [x] Task: Green Phase - Implement UI readability improvements and new shortcuts in `.tmux.conf` 2c06b39
    - [x] Update the command palette script to use a clean `CATEGORY | ACTION | SHORTCUT` format.
    - [x] Add `fzf` flags (`--delimiter '|' --with-nth '1..3'`) for a table-like display.
    - [x] Add new shortcuts: `break-pane` (Leader + !), `swap-pane` (Leader + > / <).
    - [x] Run tests and verify success.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Command Palette & UI Polish' (Protocol in workflow.md)
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Command Palette & UI Polish' (Protocol in workflow.md)
