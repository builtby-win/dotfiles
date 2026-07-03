# Neru Grid Legibility Design

## Goal
Make Neru recursive grid letters easier to read without changing grid behavior or key mappings.

## Current State
`chezmoi/dot_config/neru/config.toml` already defines `[recursive_grid.ui]` with label backgrounds, padding, `font_size = 14`, translucent text, and translucent background colors.

## Approved Approach
Use the smallest config-only change:

- Increase `font_size` from `14` to `18` so letters read larger.
- Make `text_color` near-black and fully opaque so strokes look less thin.
- Make `label_background_color` more opaque so page content does not bleed through.

## Non-Goals
- Do not change recursive grid dimensions, key mappings, hotkeys, Kanata layers, or Neru behavior.
- Do not add scripts, dependencies, or custom rendering logic.

## Verification
Run the existing test suite after the config edit. The expected result is no regression in repository tests; visual legibility still requires using Neru locally after applying dotfiles.
