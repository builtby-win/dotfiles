# Ergonomic Kanata Layers

## TL;DR
> **Summary**: Add an ergonomic Kanata UX across both keyboard profiles: one-shot modifiers, one-shot Hyper launcher, Vim navigation, mouse controls, and repeating Backspace chords while preserving existing Sculpt/non-Sculpt differences.
> **Deliverables**:
> - Updated `kanata.kbd` and `kanata-sculpt.kbd` with shared ergonomic aliases/layers/chords
> - Updated Kanata docs and Vitest assertions
> - Syntax, test, and debug QA evidence under `.sisyphus/evidence/`
> **Effort**: Medium
> **Parallel**: LIMITED - config tasks are sequential to avoid same-file conflicts; final verification runs in parallel
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Final Verification Wave

## Context

### Original Request
The user wants the Kanata config updated so additional chords can open layers, typing is less painful, Backspace is easier, Vim-style navigation is available, mouse/computer navigation is keyboard-driven, and Hyper can be tapped for launcher-style next-key shortcuts while still working as Hyper when held. The UX must support both the Microsoft Sculpt Menu/Application key and Right Option on the other keyboard.

### Interview Summary
- Apply changes to both `chezmoi/dot_config/kanata/kanata.kbd` and `chezmoi/dot_config/kanata/kanata-sculpt.kbd`.
- Preserve existing keyboard-specific differences.
- New active chords:
  - `j+Space` → repeating Backspace while held.
  - `j+l` → momentary Vim/navigation layer.
  - `l+k` → one-shot Hyper for launcher/shortcut next key.
  - `k+Space` → momentary mouse-control layer.
- Reserved, not implemented in this pass: `fj`, `dk`, `sl`.
- Tap any physical modifier for one-shot next-key modifier; hold it for normal modifier behavior.
- One-shot timeout: `1000ms`.
- Cancel pending one-shot/launcher state with `Esc+Space` no-op chord.
- Test strategy: tests-after.

### Metis Review (gaps addressed)
- Added required alias/chord inventory and regression checks before config changes.
- Made shared UX behavior explicit and split from per-profile exceptions.
- Preserved Hammerspoon `Hyper+Space` and `Space+j`; Kanata delegates launcher bindings to Hyper next-key rather than adding app bindings.
- Required `macro-repeat`, not `rpt`, for held Backspace repeat.
- Added exact static acceptance checks for both profiles, reserved chords, one-shot timeout, and Sculpt-specific behavior.
- Converted manual ergonomic dogfooding into supplemental evidence; syntax/tests are mandatory gates.

## Work Objectives

### Core Objective
Make daily keyboard use less painful by reducing modifier holds and reach-heavy navigation while keeping existing dotfiles behavior stable.

### Deliverables
- Kanata config changes in:
  - `chezmoi/dot_config/kanata/kanata.kbd`
  - `chezmoi/dot_config/kanata/kanata-sculpt.kbd`
- Documentation updates in `docs/modules/kanata.md`.
- Test updates in `tests/kanata_module.test.ts`.
- Evidence files in `.sisyphus/evidence/`.

### Definition of Done (verifiable conditions with commands)
- `kanata --check --cfg chezmoi/dot_config/kanata/kanata.kbd` exits `0`.
- `kanata --check --cfg chezmoi/dot_config/kanata/kanata-sculpt.kbd` exits `0`.
- `pnpm test` exits `0`.
- `git diff -- chezmoi/dot_config/kanata/kanata.kbd chezmoi/dot_config/kanata/kanata-sculpt.kbd docs/modules/kanata.md tests/kanata_module.test.ts` shows no unrelated files.
- Both Kanata configs contain the new active chords and do not map `fj`, `dk`, or `sl`.
- Both Kanata configs keep `concurrent-tap-hold yes` and their existing Sculpt/non-Sculpt device filters.

### Must Have
- One-shot modifier aliases use `one-shot-press-pcancel 1000`.
- Held repeating Backspace uses `macro-repeat`, not `rpt`.
- Existing `j+k` app-aware terminal leader/Cmd-layer behavior remains unchanged.
- Existing `d+f` Hyper+f behavior remains unchanged.
- Existing Caps→Esc/Control, Fn layer, semicolon tap-dance, media-row behavior remain unchanged.
- Hammerspoon app launcher and Space+j navigation are not edited in this plan.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not implement direct app launcher mappings in Kanata.
- Do not map `fj`, `dk`, or `sl`; leave them reserved in docs only.
- Do not remove `kanata-vk-agent` app-aware behavior.
- Do not collapse the two filtered macOS profiles into one config.
- Do not rely on “feels good” as the only QA signal.
- Do not change files outside the four deliverable paths except `.sisyphus/evidence/` produced by executor QA.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + Vitest + Kanata syntax checks.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan is config-risk-heavy, so Task 1 gates parallel edits.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 baseline inventory.
Wave 2: Task 2 shared input/modifier scaffolding.
Wave 3: Task 3 ergonomic layers and chords.
Wave 4: Task 4 docs and tests.
Wave 5: Task 5 integrated validation and local debug QA.

### Dependency Matrix (full, all tasks)
- Task 1: Blocks Task 2.
- Task 2: Blocked by Task 1; blocks Task 3.
- Task 3: Blocked by Task 2; blocks Task 4.
- Task 4: Blocked by Task 3; blocks Task 5.
- Task 5: Blocked by Task 4.
- F1-F4: Blocked by Task 5.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `quick`.
- Wave 2 → 1 task → `quick`.
- Wave 3 → 1 task → `quick`.
- Wave 4 → 1 task → `writing`.
- Wave 5 → 1 task → `unspecified-high`.
- Final Verification → 4 review agents → `oracle`, `unspecified-high`, `unspecified-high`, `deep`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Capture Baseline Kanata Behavior Inventory

  **What to do**:
  1. Read both Kanata profiles and capture the current aliases, `defsrc`, layers, and `defchordsv2` entries.
  2. Write `.sisyphus/evidence/task-1-baseline-kanata-inventory.md` with:
     - Existing active chords: `j+k`, `d+f`.
     - Existing semantic aliases: `hyper`, `cap`, `fn`, `semi`, `leader`, `cmd-next`, `terminal-leader-or-cmd-layer`, `jk`.
     - Existing profile differences: non-Sculpt excludes `0xCB1EB82FC081667C`; Sculpt includes only it; Sculpt swaps left Option/Command and maps Right Option to Right Command.
     - Existing validation commands from docs/setup scripts.
  3. Do not edit source files in this task.

  **Must NOT do**:
  - Do not change config, docs, or tests.
  - Do not infer behavior without citing a file path and line reference.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded read-only inventory across known files.
  - Skills: [] - No special skill needed.
  - Omitted: `git-master` - No git operation required.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 2 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `chezmoi/dot_config/kanata/kanata.kbd:23-63` - current non-Sculpt `defcfg`, aliases, and app-aware `j+k` behavior.
  - Pattern: `chezmoi/dot_config/kanata/kanata.kbd:77-97` - current non-Sculpt `defsrc`, base/cmd/fn layers, and chords.
  - Pattern: `chezmoi/dot_config/kanata/kanata-sculpt.kbd:25-65` - current Sculpt `defcfg`, aliases, and app-aware `j+k` behavior.
  - Pattern: `chezmoi/dot_config/kanata/kanata-sculpt.kbd:79-99` - current Sculpt `defsrc`, base/cmd/fn layers, and chords.
  - Docs: `docs/modules/kanata.md:71-94` - two filtered profile strategy and Sculpt modifier behavior.
  - Docs: `docs/modules/kanata.md:222-265` - app-aware `j+k` convention and next-key layer fallback.
  - Validation: `scripts/setup-kanata-macos.sh:271-273` - syntax check commands used by setup helper.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/task-1-baseline-kanata-inventory.md` exists and lists both profiles, current aliases, current layers, and current chords.
  - [ ] Evidence confirms `j+k` and `d+f` are the only currently mapped `defchordsv2` home-row chords.
  - [ ] Evidence confirms `fj`, `dk`, and `sl` are not currently mapped.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Baseline inventory is complete
    Tool: Bash
    Steps: test -s .sisyphus/evidence/task-1-baseline-kanata-inventory.md
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-1-baseline-kanata-inventory.md

  Scenario: No source edits happened during inventory
    Tool: Bash
    Steps: git diff -- chezmoi/dot_config/kanata/kanata.kbd chezmoi/dot_config/kanata/kanata-sculpt.kbd docs/modules/kanata.md tests/kanata_module.test.ts
    Expected: Empty output.
    Evidence: .sisyphus/evidence/task-1-no-source-edits.diff
  ```

  **Commit**: NO | Message: n/a | Files: `.sisyphus/evidence/task-1-baseline-kanata-inventory.md`

- [x] 2. Add Shared Ergonomic Aliases, Expanded Inputs, and Modifier One-Shots

  **What to do**:
  1. Update both Kanata profiles with a multi-line `defsrc` that includes all existing keys plus newly required physical inputs:
     - Modifiers: `lctl`, `lsft`, `lalt`, `lmet`, `ralt`, `rmet`, `rctl`, `rsft`, `menu`.
     - Existing special keys: `caps`, `fn`, `del`, `;`, `tab`, `grv`, `f1`-`f12`.
     - New chord/layer keys: `esc`, `spc`, `h`, `j`, `k`, `l`, `u`, `d`, `a`, `e`, `w`, `b`, `f`, `c`, `v`, `x`, `z`, `q`, `m`.
  2. Keep `process-unmapped-keys yes` and `concurrent-tap-hold yes` in both `defcfg` blocks.
  3. Add one-shot aliases in both profiles:
     - `os-ctl (one-shot-press-pcancel 1000 lctl)`
     - `os-sft (one-shot-press-pcancel 1000 lsft)`
     - `os-alt (one-shot-press-pcancel 1000 lalt)`
     - `os-cmd (one-shot-press-pcancel 1000 lmet)`
     - `os-rctl (one-shot-press-pcancel 1000 rctl)`
     - `os-rsft (one-shot-press-pcancel 1000 rsft)`
     - `os-ralt (one-shot-press-pcancel 1000 ralt)`
     - `os-rcmd (one-shot-press-pcancel 1000 rmet)`
     - `hyper-next (one-shot-press-pcancel 1000 @hyper)`
  4. Update base layers while preserving profile differences:
     - Non-Sculpt: `lctl→@os-ctl`, `lsft→@os-sft`, `lalt→@os-alt`, `lmet→@os-cmd`, `ralt→@hyper-next`, `rmet→@os-rcmd`, `rctl→@os-rctl`, `rsft→@os-rsft`, `menu→@hyper-next`.
     - Sculpt: `lctl→@os-ctl`, `lsft→@os-sft`, `lalt→@os-cmd`, `lmet→@os-alt`, `ralt→@os-rcmd`, `rmet→@os-rcmd`, `rctl→@os-rctl`, `rsft→@os-rsft`, `menu→@hyper-next`.
  5. Keep `caps→@cap`, `fn→@fn`, `del→esc`, `;→@semi`, function media row outputs, and all existing normal letter outputs unchanged.
  6. Expand every existing `deflayer` to match the new `defsrc` length exactly; use `_` for new keys in `cmd` and `fn` unless already intentionally mapped.

  **Must NOT do**:
  - Do not remove `@hyper`; `hyper-next` must wrap it.
  - Do not change terminal bundle IDs or `kanata-vk-agent` switch logic.
  - Do not map `fj`, `dk`, or `sl`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: two config files with direct syntactic changes.
  - Skills: [] - No special skill needed.
  - Omitted: `frontend-ui-ux` - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 3 | Blocked By: Task 1

  **References**:
  - Pattern: `chezmoi/dot_config/kanata/kanata.kbd:31-63` - extend existing alias block, preserve semantic naming style.
  - Pattern: `chezmoi/dot_config/kanata/kanata.kbd:77-90` - current `defsrc`/layers to expand.
  - Pattern: `chezmoi/dot_config/kanata/kanata-sculpt.kbd:33-65` - extend existing Sculpt alias block.
  - Pattern: `chezmoi/dot_config/kanata/kanata-sculpt.kbd:79-92` - current Sculpt `defsrc`/layers to expand.
  - External: `https://github.com/jtroo/kanata/blob/main/cfg_samples/kanata.kbd#L926-L929` - `one-shot-press-pcancel` syntax examples.
  - External: `https://github.com/jtroo/kanata/blob/ec48fe37898326cfc79b1cf8e27f91e37112eb45/docs/config.adoc#L1829-L1921` - one-shot behavior and variants.

  **Acceptance Criteria**:
  - [ ] Both configs contain `one-shot-press-pcancel 1000` aliases for Control, Shift, Option/Alt, Command/Meta, and Hyper.
  - [ ] Both configs still contain `hyper (multi lctl lalt lsft lmet reverse-release-order)`.
  - [ ] Non-Sculpt config maps `ralt` and `menu` to `@hyper-next` in base.
  - [ ] Sculpt config maps `menu` to `@hyper-next` and preserves Left Option/Command swap plus Right Option→Right Command behavior.
  - [ ] `cmd-next (one-shot 2000 (layer-while-held cmd))` remains unchanged unless only whitespace moved.
  - [ ] If `kanata --check` rejects `hyper-next (one-shot-press-pcancel 1000 @hyper)`, replace it with the inline equivalent `hyper-next (one-shot-press-pcancel 1000 (multi lctl lalt lsft lmet reverse-release-order))` in both profiles and record the syntax error plus fix in `.sisyphus/evidence/task-2-hyper-next-syntax.md`.
  - [ ] If Kanata also rejects the inline `multi` fallback, use `hyper-next (one-shot-press-pcancel 1000 (layer-while-held hyperlayer))` plus a dedicated `hyperlayer`, and update Task-2-affected `tests/kanata_module.test.ts` assertions immediately so `pnpm test` remains green.

  **QA Scenarios**:
  ```
  Scenario: One-shot aliases are present in both profiles
    Tool: Bash
    Steps: python3 - <<'PY'
from pathlib import Path
files = [Path('chezmoi/dot_config/kanata/kanata.kbd'), Path('chezmoi/dot_config/kanata/kanata-sculpt.kbd')]
required = ['os-ctl (one-shot-press-pcancel 1000 lctl)', 'os-sft (one-shot-press-pcancel 1000 lsft)']
hyper_forms = ['hyper-next (one-shot-press-pcancel 1000 @hyper)', 'hyper-next (one-shot-press-pcancel 1000 (multi lctl lalt lsft lmet reverse-release-order))', 'hyper-next (one-shot-press-pcancel 1000 (layer-while-held hyperlayer))']
for f in files:
    s = f.read_text()
    missing = [r for r in required if r not in s]
    if not any(h in s for h in hyper_forms):
        missing.append('hyper-next one-shot alias')
    if missing:
        raise SystemExit(f'{f}: missing {missing}')
PY
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-2-one-shot-aliases.txt

  Scenario: Reserved chords are still unmapped
    Tool: Bash
    Steps: python3 - <<'PY'
from pathlib import Path
for f in [Path('chezmoi/dot_config/kanata/kanata.kbd'), Path('chezmoi/dot_config/kanata/kanata-sculpt.kbd')]:
    s = f.read_text()
    for chord in ['(f j)', '(d k)', '(s l)']:
        if chord in s:
            raise SystemExit(f'{f}: reserved chord mapped: {chord}')
PY
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-2-reserved-chords.txt
  ```

  **Commit**: YES | Message: `feat(kanata): add one-shot ergonomic modifiers` | Files: `chezmoi/dot_config/kanata/kanata.kbd`, `chezmoi/dot_config/kanata/kanata-sculpt.kbd`

- [x] 3. Add Navigation, Launcher, Mouse, Backspace, and Cancel Chords

  **What to do**:
  1. In both profiles, add aliases:
     - `bksp-repeat (macro-repeat bspc 35)`.
     - `nav-layer (layer-while-held nav)`.
     - `mouse-layer (layer-while-held mouse)`.
     - Mouse movement aliases:
       - `mm-up (movemouse-accel-up 1 1000 1 5)`
       - `mm-down (movemouse-accel-down 1 1000 1 5)`
       - `mm-left (movemouse-accel-left 1 1000 1 5)`
       - `mm-right (movemouse-accel-right 1 1000 1 5)`
       - `mw-up (mwheel-up 50 120)`
       - `mw-down (mwheel-down 50 120)`
       - `mw-left (mwheel-left 50 120)`
       - `mw-right (mwheel-right 50 120)`
  2. Add `deflayermap (nav)` in both profiles:
     - `h left`
     - `j down`
     - `k up`
     - `l rght`
     - `u pgup`
     - `d pgdn`
     - `a M-left`
     - `e M-rght`
     - `w A-rght`
     - `b A-left`
     - `esc esc`
     - `spc XX`
  3. Add `deflayermap (mouse)` in both profiles:
     - `h @mm-left`
     - `j @mm-down`
     - `k @mm-up`
     - `l @mm-right`
     - `u @mw-up`
     - `d @mw-down`
     - `a @mw-left`
     - `e @mw-right`
     - `spc mlft`
     - `; mrgt`
     - `m mmid`
     - `esc esc`
  4. Update `defchordsv2` in both profiles, preserving existing entries:
     - Keep `(j k) @jk 150 first-release ()`.
     - Keep `(d f) (macro C-A-S-M-f) 100 first-release ()`.
     - Add `(j spc) @bksp-repeat 100 first-release ()`.
     - Add `(j l) @nav-layer 150 first-release ()`.
     - Add `(l k) @hyper-next 150 first-release ()`.
     - Add `(k spc) @mouse-layer 150 first-release ()`.
     - Add `(esc spc) XX 80 first-release ()` for accidental one-shot/launcher cancellation.
  5. Add comments above `defchordsv2` stating `fj`, `dk`, and `sl` are intentionally reserved and unmapped.

  **Must NOT do**:
  - Do not add app-specific commands to Kanata launcher mode.
  - Do not use `rpt` for Backspace.
  - Do not edit Hammerspoon files.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: targeted config additions in two files.
  - Skills: [] - No special skill needed.
  - Omitted: `browse` - No browser testing required for config syntax.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 4 | Blocked By: Task 2

  **References**:
  - Pattern: `chezmoi/dot_config/kanata/kanata.kbd:93-97` - current `defchordsv2` style.
  - Pattern: `chezmoi/dot_config/kanata/kanata-sculpt.kbd:95-99` - current Sculpt `defchordsv2` style.
  - External: `https://github.com/jtroo/kanata/blob/ec48fe37898326cfc79b1cf8e27f91e37112eb45/docs/config.adoc#L859-L909` - `layer-while-held` semantics.
  - External: `https://github.com/jtroo/kanata/blob/ec48fe37898326cfc79b1cf8e27f91e37112eb45/docs/config.adoc#L1172-L1204` - `rpt` does not repeat while held.
  - External: `https://github.com/jtroo/kanata/blob/main/docs/config.adoc#L1499-L1508` - mouse wheel action names.
  - External: `https://github.com/jtroo/kanata/blob/main/docs/config.adoc#L1642-L1669` - mouse movement and acceleration action names.
  - External: `https://github.com/jtroo/kanata/blob/main/docs/config.adoc#L1717-L1731` - concrete mouse action examples.
  - Existing UX: `chezmoi/dot_hammerspoon/modules/space_j_layer.lua:12-17` - existing nav mapping to mirror and supersede in Kanata.
  - Existing UX: `chezmoi/dot_hammerspoon/init.lua:7-10` - Hyper+Space already opens Hammerspoon app launcher.

  **Acceptance Criteria**:
  - [ ] Both profiles contain `bksp-repeat (macro-repeat bspc 35)`.
  - [ ] Both profiles contain `deflayermap (nav)` with all specified nav mappings.
  - [ ] Both profiles contain `deflayermap (mouse)` with movement, click, and scroll mappings.
  - [ ] Both profiles contain all five new `defchordsv2` entries.
  - [ ] Both profiles still contain existing `j+k` and `d+f` entries.
  - [ ] Both profiles contain comments reserving `fj`, `dk`, and `sl` without active mappings for those chords.

  **QA Scenarios**:
  ```
  Scenario: Active ergonomic chords are present
    Tool: Bash
    Steps: python3 - <<'PY'
from pathlib import Path
required = ['(j spc) @bksp-repeat 100 first-release ()', '(j l) @nav-layer 150 first-release ()', '(l k) @hyper-next 150 first-release ()', '(k spc) @mouse-layer 150 first-release ()', '(esc spc) XX 80 first-release ()']
for f in [Path('chezmoi/dot_config/kanata/kanata.kbd'), Path('chezmoi/dot_config/kanata/kanata-sculpt.kbd')]:
    s = f.read_text()
    missing = [r for r in required if r not in s]
    if missing:
        raise SystemExit(f'{f}: missing {missing}')
PY
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-3-chords-present.txt

  Scenario: Backspace repeat uses macro-repeat only
    Tool: Bash
    Steps: python3 - <<'PY'
from pathlib import Path
for f in [Path('chezmoi/dot_config/kanata/kanata.kbd'), Path('chezmoi/dot_config/kanata/kanata-sculpt.kbd')]:
    s = f.read_text()
    if 'bksp-repeat (macro-repeat bspc 35)' not in s:
        raise SystemExit(f'{f}: missing macro-repeat Backspace')
    if 'bksp-repeat rpt' in s:
        raise SystemExit(f'{f}: uses rpt for Backspace')
PY
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-3-backspace-repeat.txt
  ```

  **Commit**: YES | Message: `feat(kanata): add ergonomic navigation layers` | Files: `chezmoi/dot_config/kanata/kanata.kbd`, `chezmoi/dot_config/kanata/kanata-sculpt.kbd`

- [x] 4. Update Docs and Tests for the Ergonomic UX

  **What to do**:
  1. Update `docs/modules/kanata.md` Goals with the new UX:
     - Tap modifiers for one-shot next-key behavior; hold modifiers normally.
     - `j+Space`, `j+l`, `l+k`, `k+Space` active chords.
     - `fj`, `dk`, `sl` reserved for future use.
     - `l+k`/Hyper next-key delegates to Raycast/Hammerspoon/apps; Kanata does not define app launches.
     - `Esc+Space` cancels accidental pending one-shot/launcher state.
  2. Add a compact “Ergonomic layers” section near the app-aware `j+k` section that documents the exact mapping table.
  3. Mention Hammerspoon interaction:
     - Existing `Hyper+Space` remains available; tap Hyper then Space should still open the Hammerspoon chooser.
     - Existing Hammerspoon `Space+j` remains untouched, but Kanata `j+l` is the preferred cross-profile navigation layer.
  4. Extend `tests/kanata_module.test.ts` with assertions for Task 3 behavior, preserving the Task 2 assertions already added for expanded `defsrc`, one-shot aliases, and `hyperlayer`:
     - `bksp-repeat (macro-repeat bspc 35)`.
     - `deflayermap (nav)` and `deflayermap (mouse)`.
     - Active chord entries.
     - Reserved chords absent as active mappings.
     - Existing `j+k`, `d+f`, terminal bundle IDs, and profile filters still present.

  **Must NOT do**:
  - Do not document `fj`, `dk`, or `sl` as active.
  - Do not promise Raycast config changes in this repo.
  - Do not remove existing Kanata setup/debug docs.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: docs plus test assertions, no architecture change.
  - Skills: [] - No special skill needed.
  - Omitted: `humanizer` - Technical docs should stay precise.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Task 5 | Blocked By: Task 3

  **References**:
  - Docs: `docs/modules/kanata.md:5-22` - existing Goals list to extend.
  - Docs: `docs/modules/kanata.md:222-265` - current app-aware `j+k` convention; add ergonomic layers nearby.
  - Docs: `docs/modules/kanata.md:372-387` - existing debug section to preserve.
  - Test: `tests/kanata_module.test.ts:22-48` - existing profile/chord assertions to extend.
  - Hammerspoon: `chezmoi/dot_hammerspoon/init.lua:7-10` - Hyper+Space launcher binding to reference in docs.
  - Hammerspoon: `chezmoi/dot_hammerspoon/modules/app_launcher.lua:3-11` - current chooser apps, but do not modify.

  **Acceptance Criteria**:
  - [ ] `docs/modules/kanata.md` documents all active new chords and their UX.
  - [ ] `docs/modules/kanata.md` states `fj`, `dk`, and `sl` are reserved and unmapped.
  - [ ] `tests/kanata_module.test.ts` fails if any new active chord is missing.
  - [ ] `tests/kanata_module.test.ts` fails if `fj`, `dk`, or `sl` become active mappings.
  - [ ] Existing tests still assert filtered profile behavior.

  **QA Scenarios**:
  ```
  Scenario: Documentation includes ergonomic mapping table
    Tool: Bash
    Steps: python3 - <<'PY'
from pathlib import Path
s = Path('docs/modules/kanata.md').read_text()
for text in ['j+Space', 'j+l', 'l+k', 'k+Space', 'Esc+Space', 'reserved']:
    if text not in s:
        raise SystemExit(f'missing docs text: {text}')
PY
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-4-docs-check.txt

  Scenario: Vitest assertions cover new Kanata UX
    Tool: Bash
    Steps: python3 - <<'PY'
from pathlib import Path
s = Path('tests/kanata_module.test.ts').read_text()
for text in ['one-shot-press-pcancel 1000', 'macro-repeat bspc 35', '(j spc) @bksp-repeat', '(j l) @nav-layer', '(l k) @hyper-next', '(k spc) @mouse-layer']:
    if text not in s:
        raise SystemExit(f'missing test assertion text: {text}')
PY
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-4-test-assertions.txt
  ```

  **Commit**: YES | Message: `test(kanata): cover ergonomic layer mappings` | Files: `docs/modules/kanata.md`, `tests/kanata_module.test.ts`

- [x] 5. Run Integrated Validation and Debug QA

  **What to do**:
  1. Resolve the Kanata binary with `KANATA_BIN="${KANATA_BIN:-$(command -v kanata || printf '%s/.cargo/bin/kanata' "$HOME")}"`; fail with a clear evidence file if the resolved path is not executable.
  2. Run `"$KANATA_BIN" --check --cfg chezmoi/dot_config/kanata/kanata.kbd` and save stdout/stderr to `.sisyphus/evidence/task-5-kanata-check-regular.txt`.
  3. Run `"$KANATA_BIN" --check --cfg chezmoi/dot_config/kanata/kanata-sculpt.kbd` and save stdout/stderr to `.sisyphus/evidence/task-5-kanata-check-sculpt.txt`.
  4. Run `pnpm test` and save output to `.sisyphus/evidence/task-5-pnpm-test.txt`.
  5. Run static invariants with Python and save output to `.sisyphus/evidence/task-5-static-invariants.txt`:
     - Both configs contain active new chords.
     - Both configs omit active `(f j)`, `(d k)`, `(s l)` mappings.
     - Both configs contain `one-shot-press-pcancel 1000`.
     - Both configs contain `macro-repeat bspc 35`.
     - Both configs preserve existing `j+k`, `d+f`, and device filters.
  6. If running on macOS with Kanata installed, run manual debug sessions one profile at a time:
     - `sudo ~/.cargo/bin/kanata --debug --cfg ~/.config/kanata/kanata.kbd`
     - `sudo ~/.cargo/bin/kanata --debug --cfg ~/.config/kanata/kanata-sculpt.kbd --port 5830`
     - Capture observations for `j+Space`, `j+l`, `l+k`, `k+Space`, `Esc+Space` in `.sisyphus/evidence/task-5-debug-qa.md`.
     - If Kanata is unavailable, record `SKIPPED: kanata binary unavailable` with the exact `command -v kanata` or `test -x ~/.cargo/bin/kanata` result. Syntax checks remain mandatory if any Kanata binary is available.

  **Must NOT do**:
  - Do not run launchd restart commands unless explicitly needed for debug and safe in the current environment.
  - Do not leave Kanata debug sessions running after evidence capture.
  - Do not claim manual QA passed if it was skipped.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: validation spans config syntax, tests, platform availability, and evidence capture.
  - Skills: [] - No special skill required.
  - Omitted: `ship` - This is not PR/deploy work.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: F1-F4 | Blocked By: Task 4

  **References**:
  - Validation: `scripts/setup-kanata-macos.sh:271-273` - syntax check both configs.
  - Docs: `docs/modules/kanata.md:64-69` - direct manual smoke-test commands.
  - Docs: `docs/modules/kanata.md:159-163` - foreground debug command.
  - Docs: `docs/modules/kanata.md:372-387` - Sculpt debug path and expected Menu key name.
  - Package: `package.json:6-10` - `pnpm test` runs `vitest run`.

  **Acceptance Criteria**:
  - [ ] Both Kanata syntax check evidence files exist and show exit code `0`.
  - [ ] `pnpm test` evidence exists and shows exit code `0`.
  - [ ] Static invariant evidence exists and reports all checks passed.
  - [ ] Debug QA evidence exists with either tested observations or explicit skip reason.
  - [ ] `git diff --name-only` contains only the planned source/docs/test files plus `.sisyphus/evidence/` artifacts.

  **QA Scenarios**:
  ```
  Scenario: Syntax and tests pass
    Tool: Bash
    Steps: KANATA_BIN="${KANATA_BIN:-$(command -v kanata || printf '%s/.cargo/bin/kanata' "$HOME")}"; "$KANATA_BIN" --check --cfg chezmoi/dot_config/kanata/kanata.kbd && "$KANATA_BIN" --check --cfg chezmoi/dot_config/kanata/kanata-sculpt.kbd && pnpm test
    Expected: Exit code 0 for all commands.
    Evidence: .sisyphus/evidence/task-5-kanata-check-regular.txt, .sisyphus/evidence/task-5-kanata-check-sculpt.txt, .sisyphus/evidence/task-5-pnpm-test.txt

  Scenario: Cancel and reserved-chord invariants hold
    Tool: Bash
    Steps: python3 static invariant script described above.
    Expected: Exit code 0 and output `all invariants passed`.
    Evidence: .sisyphus/evidence/task-5-static-invariants.txt
  ```

  **Commit**: YES | Message: `chore(kanata): validate ergonomic layer rollout` | Files: `.sisyphus/evidence/*` if evidence is intentionally tracked; otherwise source commits from Tasks 2-4 only.

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer two source commits plus optional evidence/docs commit:
  1. `feat(kanata): add one-shot ergonomic modifiers`
  2. `feat(kanata): add ergonomic navigation layers`
  3. `test(kanata): cover ergonomic layer mappings`
- Follow the active execution environment's git/landing policy for push/PR behavior; never add generated-by footers or co-authored-by lines.

## Success Criteria
- The user can reduce sustained modifier holds by tapping modifiers for the next key.
- The user can tap Hyper/Menu/Right Option then press the next launcher key instead of holding Hyper.
- The user can hold `j+Space` to Backspace repeatedly from home row.
- The user can hold `j+l` for Vim navigation and `k+Space` for mouse movement/click/scroll.
- Existing `j+k`, `d+f`, Caps, Fn, media row, and Sculpt-specific behavior continue to work.
- `fj`, `dk`, and `sl` remain safely reserved for a future iteration.
