# Implementation Plan: Remove Beads & Implement Tmux Pane Dimming

## Phase 1: Core Logic & Script Cleanup
- [x] Task: Remove `beads` from `lib/manifest.ts` 550ad48
- [x] Task: Remove `beads` detection and installation from `setup.ts` 73e41de
- [x] Task: Clean up shell initialization ae4ffd0
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Core Logic & Script Cleanup' (Protocol in workflow.md)

## Phase 2: Documentation Refresh
- [x] Task: Remove beads references from main project documentation
    - [x] Update `AGENTS.md` to remove `beads` (bd) instructions
    - [x] Update `README.md` to remove `beads` from core features
- [x] Task: Update agent-specific instructions
    - [x] Remove `beads` section from `agents/gemini/GEMINI.md`
    - [x] Remove `beads` section from `agents/claude/CLAUDE.md`
    - [x] Remove `beads` section from `agents/shared/base.md`
    - [x] Remove `beads` section from `agents/opencode/AGENTS.md`
    - [x] Remove `beads` from `agents/README.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Documentation Refresh' (Protocol in workflow.md)

## Phase 3: Tmux Visual Enhancement
- [ ] Task: Implement inactive pane dimming in `stow-packages/tmux/.tmux.conf`
    - [ ] Add `window-style` and `window-active-style` configurations
    - [ ] Set inactive style to `fg=colour245,bg=colour234`
    - [ ] Set active style to `fg=default,bg=default`
- [ ] Task: Verify Tmux styling
    - [ ] Reload tmux config: `tmux source-file ~/.tmux.conf`
    - [ ] Manually verify that inactive panes are dimmed and active panes remain full color
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Tmux Visual Enhancement' (Protocol in workflow.md)
