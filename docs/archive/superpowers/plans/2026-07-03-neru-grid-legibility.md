# Neru Grid Legibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Neru recursive grid letters easier to read with a config-only UI tweak.

**Architecture:** Update the existing `[recursive_grid.ui]` values in `chezmoi/dot_config/neru/config.toml`. No new files, dependencies, or behavior paths.

**Tech Stack:** TOML config, Neru, existing Vitest repository checks.

## Global Constraints

- Do not change recursive grid dimensions, key mappings, hotkeys, Kanata layers, or Neru behavior.
- Do not add scripts, dependencies, or custom rendering logic.
- Keep the change config-only.

---

### Task 1: Increase Recursive Grid Label Legibility

**Files:**
- Modify: `chezmoi/dot_config/neru/config.toml:121-133`

**Interfaces:**
- Consumes: existing Neru `[recursive_grid.ui]` config keys.
- Produces: more legible grid label rendering via larger, higher-contrast existing config values.

- [ ] **Step 1: Record current values**

Confirm this block exists:

```toml
[recursive_grid.ui]
label_background = true
label_background_color = "#CCFFF7B8"
font_size = 14
text_color = "#EE111111"
```

- [ ] **Step 2: Apply the minimal config change**

Set these values:

```toml
label_background_color = "#F8FFF7B8"
font_size = 18
text_color = "#FF111111"
```

- [ ] **Step 3: Verify config syntax through repository tests**

Run: `pnpm test`

Expected: Vitest exits `0`.

- [ ] **Step 4: Commit**

```bash
git add chezmoi/dot_config/neru/config.toml docs/superpowers/specs/2026-07-03-neru-grid-legibility-design.md docs/superpowers/plans/2026-07-03-neru-grid-legibility.md
git commit -m "fix: improve neru grid label legibility"
```
