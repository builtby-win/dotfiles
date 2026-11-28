# Neru Recursive Grid Optimization Plan

## Objective
Optimize the recursive grid configuration in `neru` to reduce the number of key presses required for screen navigation by expanding the grid size and mapping it spatially to the right hand.

## Key Files & Context
- `chezmoi/dot_config/neru/config.toml`: The main configuration file for neru where the `[recursive_grid]` section is defined.

## Implementation Steps
1. Open `chezmoi/dot_config/neru/config.toml`.
2. Locate the `[recursive_grid]` section.
3. Update the grid dimensions from 2x2 to 4x3 (4 columns, 3 rows).
4. Update the `keys` string to match the refined 4x3 spatial mapping centered around the home row (`eruidfjkcvm,`).

The updated section will look like this:
```toml
[recursive_grid]
grid_cols = 4
grid_rows = 3
keys = "eruidfjkcvm,"
min_size_width = 30
min_size_height = 30
max_depth = 8
```

## Micro-Adjustments
After the grid is sectioned, the user noted that micro-adjustments can be handled at the very end of the recursion. This configuration focuses on fast, coarse-to-fine movement using the 12-section split.

## Verification & Testing
1. Review the generated `config.toml` to ensure the syntax is correct.
2. (Manual) The user will apply the chezmoi dotfiles or restart neru to verify that the recursive grid now divides the screen into 12 sections and follows the new key mapping.