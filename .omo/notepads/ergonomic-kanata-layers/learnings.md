# Learnings

- 2026-04-30T23:55:40-07:00 — task-1 baseline Kanata inventory captured; evidence written to `.sisyphus/evidence/task-1-baseline-kanata-inventory.md`.
- 2026-05-01T00:06:33-07:00 — Kanata v1.11.0 only allows one-shot actions to wrap `layer-while-held`, a keycode, or an output chord; a dedicated layer was needed for the `hyper-next` one-shot fallback.
- 2026-05-01T00:16:55-07:00 — Task 2 needed test updates earlier than the original split; the verification gate caught stale `kanata_module.test.ts` assertions, so the module test was aligned with the expanded Task 2 config before moving on.
- 2026-05-01T00:23:22-07:00 — deflayermap works best with explicit input/action pairs only; unmapped keys stay transparent, so nav/mouse layers can stay terse without wildcard `_` entries.
- 2026-05-01T00:25:38-07:00 — Reserved-chord notes belong immediately above each `defchordsv2`; keeping the comment in place satisfies verification without changing chord behavior.
- 2026-05-01T00:31:00-07:00 — Task 4 test coverage now scans active `defchordsv2` entries with comment stripping, so reserved chords stay validated as unmapped even if prose mentions them in docs.
- 2026-05-01T00:47:00-07:00 — `j+k` fallback depends on `defsrc` coverage and `deflayer cmd`; missing physical letters like `t` cannot work in the next-key Command layer until both rows include them and map them to `M-<letter>`.
