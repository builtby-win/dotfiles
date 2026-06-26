# Task 1 Baseline Kanata Behavior Inventory

Timestamp: 2026-04-30T23:55:40-07:00

## Source inventory

### `chezmoi/dot_config/kanata/kanata.kbd`
- Profile scope: non-Sculpt macOS keyboards excluded from `0xCB1EB82FC081667C` (`defcfg`, lines 23-29).
- Current aliases: `hyper`, `cap`, `fn`, `semi`, `leader`, `cmd-next`, `terminal-leader-or-cmd-layer`, `jk` (`defalias`, lines 31-63).
- Current `defsrc`: `lalt lmet ralt rmet menu caps fn del ; j k d f tab grv a c v x z w q f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12` (`defsrc`, lines 77-79).
- Current layers: `base`, `cmd`, `fn` (`deflayer`, lines 81-91).
- Current `defchordsv2` entries:
  - `(j k) @jk 150 first-release ()` (`defchordsv2`, lines 93-96)
  - `(d f) (macro C-A-S-M-f) 100 first-release ()` (`defchordsv2`, lines 93-97)
- Current active chords confirmed from the file: `j+k` and `d+f` only (`defchordsv2`, lines 93-97).

### `chezmoi/dot_config/kanata/kanata-sculpt.kbd`
- Profile scope: Sculpt-only macOS keyboard include for `0xCB1EB82FC081667C` (`defcfg`, lines 25-31).
- Current aliases: `hyper`, `cap`, `fn`, `semi`, `leader`, `cmd-next`, `terminal-leader-or-cmd-layer`, `jk` (`defalias`, lines 33-65).
- Current `defsrc`: `lalt lmet ralt rmet menu caps fn del ; j k d f tab grv a c v x z w q f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12` (`defsrc`, lines 79-81).
- Current layers: `base`, `cmd`, `fn` (`deflayer`, lines 83-93).
- Current `defchordsv2` entries:
  - `(j k) @jk 150 first-release ()` (`defchordsv2`, lines 95-98)
  - `(d f) (macro C-A-S-M-f) 100 first-release ()` (`defchordsv2`, lines 95-99)
- Current active chords confirmed from the file: `j+k` and `d+f` only (`defchordsv2`, lines 95-99).

## Current profile differences

### Non-Sculpt profile
- Excludes `0xCB1EB82FC081667C` (`chezmoi/dot_config/kanata/kanata.kbd:23-29`).
- Keeps normal left Option / left Command order (`chezmoi/dot_config/kanata/kanata.kbd:81-83`; docs strategy at `docs/modules/kanata.md:91-94`).
- Maps Right Option and Menu/Application to Hyper (`chezmoi/dot_config/kanata/kanata.kbd:81-83`; docs strategy at `docs/modules/kanata.md:91-94`).

### Sculpt profile
- Includes only `0xCB1EB82FC081667C` (`chezmoi/dot_config/kanata/kanata-sculpt.kbd:25-31`).
- Swaps left Option / left Command (`chezmoi/dot_config/kanata/kanata-sculpt.kbd:83-85`; docs strategy at `docs/modules/kanata.md:81-89`).
- Right Option sends Right Command (`chezmoi/dot_config/kanata/kanata-sculpt.kbd:83-85`; docs strategy at `docs/modules/kanata.md:81-89`).
- Menu/Application is Hyper (`chezmoi/dot_config/kanata/kanata-sculpt.kbd:83-85`; docs strategy at `docs/modules/kanata.md:81-89`).

## Current unmapped chords check

- `fj`, `dk`, and `sl` are not present as current `defchordsv2` entries in either profile; the only home-row chords defined are `j+k` and `d+f` (`chezmoi/dot_config/kanata/kanata.kbd:93-97`; `chezmoi/dot_config/kanata/kanata-sculpt.kbd:95-99`).
- `defsrc` exposes `j k d f` as separate keys, but there are no `fj`, `dk`, or `sl` chord definitions in the current files (`chezmoi/dot_config/kanata/kanata.kbd:77-79`; `chezmoi/dot_config/kanata/kanata-sculpt.kbd:79-81`).

## Validation commands

### From `scripts/setup-kanata-macos.sh`
- `"$KANATA_BIN" --check --cfg "$KANATA_CFG"` (`scripts/setup-kanata-macos.sh:271-273`)
- `"$KANATA_BIN" --check --cfg "$KANATA_SCULPT_CFG"` (`scripts/setup-kanata-macos.sh:271-273`)

### Docs manual/debug commands
- `kanata --cfg ~/.config/kanata/kanata.kbd` (`docs/modules/kanata.md:64-67`)
- `kanata --cfg ~/.config/kanata/kanata-sculpt.kbd --port 5830` (`docs/modules/kanata.md:64-69`)
- `sudo ~/.cargo/bin/kanata --debug --cfg ~/.config/kanata/kanata.kbd` (`docs/modules/kanata.md:159-163`)
- `kanata --debug --cfg ~/.config/kanata/kanata-sculpt.kbd --port 5830` (`docs/modules/kanata.md:372-379`)
- `kanata-vk-agent -f` for bundle discovery (`docs/modules/kanata.md:286-290`)
- `kanata --cfg "$HOME\.config\kanata\kanata.kbd"` (Windows equivalent, `docs/modules/kanata.md:299-309`)

## QA scenario outcomes

- `test -s .sisyphus/evidence/task-1-baseline-kanata-inventory.md` would pass after this file exists.
- `git diff -- chezmoi/dot_config/kanata/kanata.kbd chezmoi/dot_config/kanata/kanata-sculpt.kbd docs/modules/kanata.md tests/kanata_module.test.ts` returned non-empty output in the current workspace, showing pre-existing edits outside this task’s scope.

## Notes

- This task made no source changes.
- The evidence above reflects the current checked-in/worktree state only.

## Pre-existing source drift

- This drift was present before Task 1 verification and is outside the read-only inventory scope.
- `git diff -- chezmoi/dot_config/kanata/kanata.kbd chezmoi/dot_config/kanata/kanata-sculpt.kbd docs/modules/kanata.md tests/kanata_module.test.ts` is non-empty in the current workspace.
- Exact hunk summary:
  - Both Kanata profiles changed the `j+k` chord from `75` to `150` and replaced the old comment with `Match Karabiner's jk simultaneous window.` (`chezmoi/dot_config/kanata/kanata.kbd:91-96`, `chezmoi/dot_config/kanata/kanata-sculpt.kbd:93-98`).
  - The docs example changed `j+k` from `75` to `150` (`docs/modules/kanata.md:245-249`).
  - The test assertion changed from broad `(j k) @jk` to exact `150` checks for both profiles (`tests/kanata_module.test.ts:42-45`).
- Because the workspace is already dirty, the original empty-source-diff QA expectation cannot be satisfied in Task 1 without editing source files, which is out of scope for this read-only inventory task.
