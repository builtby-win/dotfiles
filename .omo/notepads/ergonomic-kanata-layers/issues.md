# Issues

- 2026-04-30T23:57:12-07:00 — Task 1 verification encountered pre-existing Kanata/doc/test drift in the workspace, so the requested empty-source-diff QA cannot pass here without source edits; leave the source files untouched.
- 2026-05-01T00:06:33-07:00 — Kanata v1.11.0 rejected `hyper-next (one-shot-press-pcancel 1000 @hyper)` because one-shot accepts only a keycode, chord, or `layer-while-held`; the final fix used a dedicated `hyperlayer` workaround in both profiles.
- 2026-05-01T00:23:22-07:00 — Kanata rejected full-width `_` placeholders inside `deflayermap`; the fix was to use explicit pair mappings for nav/mouse and let unmapped keys fall through transparently.

- 2026-05-01T00:35:19-0700 — Task 5 live Kanata debug QA was skipped because the executor runs in a non-interactive API shell; starting sudo `kanata --debug` would capture keyboard input without a human present to exercise chords or stop the process. Evidence records non-invasive checks and confirms no debug process was left running.
