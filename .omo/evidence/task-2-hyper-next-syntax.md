## Task 2 hyper-next syntax check

- `kanata --check --cfg chezmoi/dot_config/kanata/kanata.kbd` rejected `hyper-next (one-shot-press-pcancel 1000 @hyper)` and also rejected the `multi` fallback.
- Kanata reported: `one-shot is only allowed to contain layer-while-held, a keycode, or a chord`.
- Final fix: `hyper-next (one-shot-press-pcancel 1000 (layer-while-held hyperlayer))` with a dedicated hyper layer for modifier-chord output.
