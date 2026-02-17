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

## Phase 2: Tmux Keybindings & Clipboard Integration
Adjust `.tmux.conf` to improve ergonomics, fix the `Cmd+C` conflict, and add pane swapping.

- [x] Task: Red Phase - Write failing tests for tmux configuration verification 3abf36c
    - [x] Create a test in `tests/tmux_config.test.ts` that parses `.tmux.conf` to verify:
        - `M-c` is NOT bound to `new-window`.
        - `M-c` is bound to a copy-pipe command.
        - `Leader + /` is bound to the command palette.
        - `>` and `<` are bound to `swap-pane`.
    - [x] Run tests and verify failure.
- [x] Task: Green Phase - Implement keybinding changes in `stow-packages/tmux/.tmux.conf` 55b5798
    - [x] Unbind `M-c` from `new-window`.
    - [x] Map `M-c` to copy the selection to the system clipboard (using `pbcopy`).
    - [x] Add `bind -r > swap-pane -D` and `bind -r < swap-pane -U`.
    - [x] Rebind the command palette from `Leader + p` to `Leader + /`.
    - [x] Run tests and verify success.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Tmux Keybindings & Clipboard Integration' (Protocol in workflow.md)

## Phase 3: Command Palette Enhancements & UI Polish
Refine the command palette content to include new shortcuts and ensure fuzzy matching works effectively.

- [ ] Task: Red Phase - Write failing tests for command palette content
    - [ ] Update `tests/tmux_config.test.ts` to verify the new commands (`swap-pane`, `break-pane`) are present in the palette's internal list.
    - [ ] Run tests and verify failure.
- [ ] Task: Green Phase - Update the command palette script in `.tmux.conf`
    - [ ] Add `break-pane-to-window` (Leader + !), `swap-pane-right` (Leader + >), and `swap-pane-left` (Leader + <) to the palette list.
    - [ ] Ensure all descriptions are clear and categorized for better fuzzy searching.
    - [ ] Run tests and verify success.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Command Palette & UI Polish' (Protocol in workflow.md)
