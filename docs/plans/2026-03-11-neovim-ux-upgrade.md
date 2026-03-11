# Neovim UX Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Neovim module easier for a beginner to use with macOS clipboard sharing, discoverable shortcuts, a searchable command palette, a real file sidebar, and clickable buffer tabs.

**Architecture:** Keep the existing `vim.pack`-based Neovim module and extend it with beginner-friendly UX plugins instead of replacing the whole stack. Keep `mini.pick` as the fuzzy finder, add a custom command palette on top of it, add a dedicated sidebar tree for project browsing, and document the new workflow in the module guide.

**Tech Stack:** Lua, Neovim `0.12+`, `vim.pack`, `mini.pick`, `mini.extra`, `nvim-tree.lua`, `bufferline.nvim`, `which-key.nvim`, `gitsigns.nvim`, Vitest

---

### Task 1: Lock in the new Neovim UX with failing tests

**Files:**
- Modify: `tests/nvim_module.test.ts`
- Test: `tests/nvim_module.test.ts`

**Step 1: Add expectations for the new defaults and plugins**

Extend `tests/nvim_module.test.ts` so it asserts all of the following:
- `clipboard = "unnamedplus"`, `mouse = "a"`, `ignorecase`, `smartcase`, and `showtabline = 2` exist in `stow-packages/nvim/.config/nvim/lua/builtby/options.lua`
- `nvim-tree.lua`, `bufferline.nvim`, `which-key.nvim`, `mini.extra`, and `gitsigns.nvim` exist in `stow-packages/nvim/.config/nvim/lua/builtby/pack.lua`
- new plugin config files exist for the sidebar, tabs, key hints, and git signs
- keymaps include `jj`, `<leader>b`, `<leader><leader>`, `<leader>fr`, `<leader>bd`, `<S-h>`, `<S-l>`, and the visual `/` search helper
- docs mention `Space` as leader, `jj` as Escape, the command palette, the sidebar, buffer tabs, and clipboard sharing

**Step 2: Run the focused test to confirm RED**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: FAIL because the new strings and plugin files are not present yet.

**Step 3: Commit**

```bash
git add tests/nvim_module.test.ts
git commit -m "test: cover Neovim UX shortcuts and plugins"
```

### Task 2: Add the editor defaults and plugin bootstrap for the UX upgrade

**Files:**
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/options.lua`
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/pack.lua`
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/init.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/tree.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/bufferline.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/whichkey.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/gitsigns.lua`
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/pick.lua`
- Test: `tests/nvim_module.test.ts`

**Step 1: Update the core editor defaults**

Set the options needed for the new UX in `options.lua`:

```lua
local opt = vim.opt

opt.number = true
opt.relativenumber = true
opt.signcolumn = "yes"
opt.termguicolors = true
opt.clipboard = "unnamedplus"
opt.mouse = "a"
opt.ignorecase = true
opt.smartcase = true
opt.splitbelow = true
opt.splitright = true
opt.timeoutlen = 300
opt.showtabline = 2
```

**Step 2: Expand `vim.pack` with the new UX plugins**

Add these plugin specs to `pack.lua` and then require their config files after plugin load:
- `nvim-tree/nvim-tree.lua`
- `nvim-tree/nvim-web-devicons`
- `akinsho/bufferline.nvim`
- `folke/which-key.nvim`
- `echasnovski/mini.extra`
- `lewis6991/gitsigns.nvim`

Keep the existing `mini.pick`, Treesitter, Mason, and color scheme plugins.

**Step 3: Add plugin setup files**

Implement minimal configs:
- `tree.lua`: left-side toggleable tree, follow current file, rounded floats, and git icons
- `bufferline.lua`: buffer mode, clickable tabs, no close button clutter, NvimTree offset
- `whichkey.lua`: enable leader-key discovery popups
- `gitsigns.lua`: enable signs with default lightweight setup
- `pick.lua`: keep `mini.pick` setup small and add any tiny config needed for the command palette helper

**Step 4: Run the focused test to confirm GREEN**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: PASS for the plugin/default coverage.

**Step 5: Commit**

```bash
git add stow-packages/nvim/.config/nvim/lua/builtby tests/nvim_module.test.ts
git commit -m "feat: add beginner-friendly Neovim UX plugins"
```

### Task 3: Add keymaps and command-palette behavior for daily use

**Files:**
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/keymaps.lua`
- Test: `tests/nvim_module.test.ts`

**Step 1: Add `jj` and beginner-friendly navigation maps**

Add normal/insert/visual maps that cover the desired workflow:
- `jj` in insert mode -> `<Esc>`
- `<leader>b` -> toggle the sidebar tree
- `<leader><leader>` -> open the command palette
- `<leader>ff`, `<leader>fg`, `<leader>fb`, `<leader>fr`, `<leader>fh` -> find files / grep / buffers / recent files / help
- `<S-h>` / `<S-l>` -> previous / next buffer
- `<leader>bd` -> delete current buffer
- `<Esc>` -> clear search highlight

**Step 2: Add visual selection search behavior**

Implement a small helper that:
- reads the current visual selection
- escapes it for search
- writes it into the `/` register
- exits visual mode and jumps to the next match

Map visual `/` to that helper so selecting text and pressing `/` searches for the selected text.

**Step 3: Implement the command palette with `mini.pick`**

Create a tiny searchable action list in `keymaps.lua` for the most useful commands:
- find files
- recent files
- grep text
- buffers
- help
- toggle sidebar
- rename symbol
- code action
- format buffer
- quit

The command palette should use `MiniPick.start()` with human-readable labels so a new user can hit `Space Space`, type a few words, and run the action.

**Step 4: Run the focused test again**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: PASS with the new keymap coverage.

**Step 5: Commit**

```bash
git add stow-packages/nvim/.config/nvim/lua/builtby/keymaps.lua tests/nvim_module.test.ts
git commit -m "feat: add beginner-friendly Neovim shortcuts"
```

### Task 4: Document the new workflow so the shortcuts are learnable

**Files:**
- Modify: `docs/modules/nvim.md`
- Test: `tests/nvim_module.test.ts`

**Step 1: Rewrite the keymap section into a cheat sheet**

Update `docs/modules/nvim.md` so it clearly explains:
- leader is `Space`
- `jj` exits insert mode
- macOS clipboard works through `unnamedplus`
- the command palette lives on `Space Space`
- the file sidebar lives on `<leader>b`
- buffer tabs are clickable with the mouse
- the visual `/` selection search exists

Organize the doc into sections like `Basics`, `Navigation`, `Search`, `Buffers`, and `Code` so it reads like onboarding instead of raw notes.

**Step 2: Update verification instructions**

Add a short verification flow that tells the user to open Neovim, press `Space` to see which-key hints, press `Space Space` for the command palette, press `<leader>b` for the sidebar, and copy/paste through the system clipboard.

**Step 3: Run the focused test again**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: PASS with the updated docs expectations.

**Step 4: Commit**

```bash
git add docs/modules/nvim.md tests/nvim_module.test.ts
git commit -m "docs: add Neovim shortcut cheat sheet"
```

### Task 5: Verify the new Neovim UX end-to-end

**Files:**
- Test: `tests/nvim_module.test.ts`
- Test: `stow-packages/nvim/.config/nvim/**/*`

**Step 1: Run the focused automated check**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: PASS.

**Step 2: Run a headless Neovim startup check**

Run: `nvim --headless "+qa"`
Expected: exit code `0` with no Lua errors.

**Step 3: Record any unrelated repo failures separately**

If the full repo test suite still fails for unrelated tmux/worktree reasons, do not fix them as part of this feature. Capture that they are pre-existing and keep the verification scoped to the Neovim module changes.
