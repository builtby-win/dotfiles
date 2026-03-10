# Bleeding-Edge Neovim Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new stow-managed Neovim module that targets Neovim nightly / `0.12+`, uses `vim.pack`, and provides a small but high-quality native-first editing stack for the languages used in this repo.

**Architecture:** The module lives in `stow-packages/nvim/.config/nvim/` and keeps `init.lua` tiny: version guard, leader, and `require("builtby")`. All real logic lives in `lua/builtby/` with separate files for options, keymaps, autocmds, `vim.pack` plugin specs, and native LSP wiring. LSP server definitions live in local `lsp/*.lua` files, Mason is used only as an installer, and v1 deliberately skips merge-mode support, Windows support, DAP, snippets, and highly personal remaps.

**Tech Stack:** Lua, Neovim nightly / `0.12+`, `vim.pack`, `oil.nvim`, `mini.pick`, `nvim-treesitter`, `mason.nvim`, built-in LSP/completion, Vitest

---

### Task 1: Add failing tests for the new Neovim module

**Files:**
- Create: `tests/nvim_module.test.ts`
- Modify: `tests/linux_bootstrap.test.ts:106`

**Reference files (read before editing):**
- `tests/hammerspoon_module.test.ts:11`
- `tests/tmux_config.test.ts:87`
- `setup.ts:482`
- `shell/functions.sh:263`
- `README.md:81`

**Step 1: Write `tests/nvim_module.test.ts` as a string/fixture test**

Use the same style as `tests/hammerspoon_module.test.ts`: read repo files with `fs.readFileSync`, then assert on exact strings and file existence.

The first version of the test should fail because the module does not exist yet. Include assertions for:

```typescript
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");
}

describe("Neovim module wiring", () => {
  it("includes stowable Neovim config files", () => {
    const expectedFiles = [
      "stow-packages/nvim/.config/nvim/init.lua",
      "stow-packages/nvim/.config/nvim/.luarc.json",
      "stow-packages/nvim/.config/nvim/lua/builtby/init.lua",
      "docs/modules/nvim.md",
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true);
    }
  });

  it("adds nvim to setup catalogs and README", () => {
    const setupTs = readRepoFile("setup.ts");
    const functionsSh = readRepoFile("shell/functions.sh");
    const readme = readRepoFile("README.md");

    expect(setupTs).toContain('{ name: "Neovim", value: "nvim"');
    expect(setupTs).toContain('.config/nvim/init.lua');
    expect(setupTs).toContain('config.value === "nvim"');
    expect(functionsSh).toContain("bb setup nvim");
    expect(readme).toContain("| Neovim |");
    expect(readme).toContain("docs/modules/nvim.md");
  });
});
```

**Step 2: Update the Linux setup test so Linux can install the Neovim config**

In `tests/linux_bootstrap.test.ts`, change the existing string assertion so it expects the Linux selectable stow config filter to include `nvim` alongside `zsh` and `tmux`.

Expected target string:

```typescript
expect(content).toContain('platformStowConfigs.filter((config) => config.value === "zsh" || config.value === "tmux" || config.value === "nvim")');
```

**Step 3: Run the focused tests to confirm they fail**

Run: `pnpm test -- tests/nvim_module.test.ts tests/linux_bootstrap.test.ts`
Expected: FAIL because `stow-packages/nvim/.config/nvim/init.lua` does not exist yet and `setup.ts` does not contain `value: "nvim"` yet.

**Step 4: Commit the failing tests**

```bash
git add tests/nvim_module.test.ts tests/linux_bootstrap.test.ts
git commit -m "test: add failing coverage for Neovim module wiring"
```

---

### Task 2: Wire the Neovim module into setup, helper commands, and docs

**Files:**
- Modify: `setup.ts:482`
- Modify: `setup.ts:961`
- Modify: `setup.ts:2020`
- Modify: `shell/functions.sh:263`
- Modify: `shell/functions.sh:290`
- Modify: `README.md:70`
- Modify: `README.md:81`
- Modify: `README.md:175`
- Create: `docs/modules/nvim.md`
- Create: `stow-packages/nvim/.config/nvim/init.lua`
- Create: `stow-packages/nvim/.config/nvim/.luarc.json`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/init.lua`

**Step 1: Add `nvim` to the stow config catalog in `setup.ts`**

Add a new `STOW_CONFIGS` entry near the other terminal/editor configs:

```typescript
{ 
  name: "Neovim",
  value: "nvim",
  checked: true,
  platforms: { macos: true, linux: true, windows: false },
  desc: "Bleeding-edge vim.pack Neovim config (requires Neovim 0.12+)"
},
```

Then add a new `STOW_TARGETS.nvim` entry:

```typescript
nvim: [
  ".config/nvim/init.lua",
  ".config/nvim/.luarc.json",
],
```

Finally, update the Linux filter so `bb setup` on Linux offers `nvim` too:

```typescript
const selectableStowConfigs = currentPlatform === "linux"
  ? platformStowConfigs.filter((config) => config.value === "zsh" || config.value === "tmux" || config.value === "nvim")
  : platformStowConfigs;
```

Do **not** add `nvim` to `MERGEABLE_CONFIGS` in v1. Merging a whole Neovim tree into an existing config is out of scope.

**Step 2: Add `bb setup nvim` to `shell/functions.sh`**

Update the help text so `Modules:` includes `nvim`, then add a new `case "$module" in` branch:

```bash
        nvim)
          stow -d "$dotfiles_dir/stow-packages" -t "$HOME" nvim
          echo "Neovim config stowed. Launch with: nvim"
          ;;
```

Keep it as simple as the `ghostty` and `mackup` branches. Do not try to install Neovim itself here.

**Step 3: Update `README.md`**

Make three changes:

1. Add `bb setup nvim` to the a la carte example block.
2. Add a `Neovim` row to the module index table.
3. Add `docs/modules/nvim.md` to the docs list.

Use wording consistent with the existing module table, for example:

```markdown
| Neovim | `bb setup nvim` | bleeding-edge vim.pack config for Neovim 0.12+ | `docs/modules/nvim.md` |
```

**Step 4: Create the first version of `docs/modules/nvim.md`**

This first pass only needs:
- a title (`# Neovim module`)
- prerequisite note: “Requires Neovim nightly / `0.12+` because the config uses `vim.pack`”
- install command: `bb setup nvim`
- explicit v1 scope note: no Windows support, no merge-mode support

**Step 5: Create a minimal bootstrap config tree**

Create `stow-packages/nvim/.config/nvim/init.lua` with a version guard and a require:

```lua
vim.g.mapleader = " "
vim.g.maplocalleader = " "

if vim.fn.has("nvim-0.12") == 0 or vim.pack == nil or vim.pack.add == nil then
  vim.api.nvim_echo({
    { "builtby Neovim config requires Neovim 0.12+ with vim.pack\n", "ErrorMsg" },
  }, true, {})
  return
end

require("builtby")
```

Create `stow-packages/nvim/.config/nvim/.luarc.json`:

```json
{
  "runtime.version": "LuaJIT",
  "runtime.path": [
    "lua/?.lua",
    "lua/?/init.lua"
  ],
  "diagnostics.globals": ["vim"],
  "workspace.checkThirdParty": false,
  "workspace.library": [
    "$VIMRUNTIME"
  ]
}
```

Create a placeholder `stow-packages/nvim/.config/nvim/lua/builtby/init.lua`:

```lua
require("builtby.options")
require("builtby.keymaps")
require("builtby.autocmds")
require("builtby.pack")
```

The required files can be created empty in this step if needed; Task 3 fills them in.

**Step 6: Run the focused tests again**

Run: `pnpm test -- tests/nvim_module.test.ts tests/linux_bootstrap.test.ts`
Expected: PASS.

**Step 7: Commit**

```bash
git add setup.ts shell/functions.sh README.md docs/modules/nvim.md stow-packages/nvim tests/nvim_module.test.ts tests/linux_bootstrap.test.ts
git commit -m "feat: wire Neovim module into dotfiles setup"
```

---

### Task 3: Build the modular `vim.pack` bootstrap and core editor UX

**Files:**
- Modify: `stow-packages/nvim/.config/nvim/init.lua`
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/init.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/options.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/keymaps.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/autocmds.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/pack.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/colors.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/oil.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/pick.lua`
- Modify: `tests/nvim_module.test.ts`

**Step 1: Extend the test so the next implementation step is pinned down**

Add assertions that check for:
- `vim.pack.add({` in `pack.lua`
- `require("builtby.options")` / `keymaps` / `autocmds` in `lua/builtby/init.lua`
- `oil.nvim` in the plugin spec
- `mini.pick` in the plugin spec

Example assertions:

```typescript
const packLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/pack.lua");
expect(packLua).toContain("vim.pack.add({");
expect(packLua).toContain("stevearc/oil.nvim");
expect(packLua).toContain("echasnovski/mini.pick");
```

**Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: FAIL because the plugin/bootstrap files are still missing or empty.

**Step 3: Implement the core runtime files**

`stow-packages/nvim/.config/nvim/lua/builtby/options.lua` should set sane defaults without copying Sylvan’s aggressive remaps:

```lua
local opt = vim.opt

opt.number = true
opt.relativenumber = true
opt.signcolumn = "yes"
opt.termguicolors = true
opt.clipboard = "unnamedplus"
opt.ignorecase = true
opt.smartcase = true
opt.expandtab = true
opt.shiftwidth = 2
opt.tabstop = 2
opt.smartindent = true
opt.splitbelow = true
opt.splitright = true
opt.updatetime = 200
opt.timeoutlen = 300
opt.completeopt = { "menuone", "noselect", "popup" }
opt.winborder = "rounded"
```

`stow-packages/nvim/.config/nvim/lua/builtby/keymaps.lua` should keep keymaps small and legible:

```lua
local map = vim.keymap.set

map("n", "<leader>w", "<Cmd>write<CR>", { desc = "Write buffer" })
map("n", "<leader>q", "<Cmd>quit<CR>", { desc = "Quit window" })
map("n", "<Esc>", "<Cmd>nohlsearch<CR>", { desc = "Clear search" })
map("n", "<leader>e", "<Cmd>Oil<CR>", { desc = "Open file explorer" })
map("n", "<leader>ff", function() MiniPick.builtin.files() end, { desc = "Find files" })
map("n", "<leader>fg", function() MiniPick.builtin.grep_live() end, { desc = "Live grep" })
map("n", "<leader>fb", function() MiniPick.builtin.buffers() end, { desc = "Buffers" })
map("n", "<leader>fh", function() MiniPick.builtin.help() end, { desc = "Help" })
```

`stow-packages/nvim/.config/nvim/lua/builtby/autocmds.lua` can stay tiny:

```lua
local group = vim.api.nvim_create_augroup("builtby.core", { clear = true })

vim.api.nvim_create_autocmd("TextYankPost", {
  group = group,
  callback = function()
    vim.hl.on_yank()
  end,
})
```

`stow-packages/nvim/.config/nvim/lua/builtby/pack.lua` should declare a short, explicit plugin list:

```lua
vim.pack.add({
  { src = "https://github.com/vague2k/vague.nvim" },
  { src = "https://github.com/stevearc/oil.nvim" },
  { src = "https://github.com/nvim-tree/nvim-web-devicons" },
  { src = "https://github.com/echasnovski/mini.pick" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter", version = "main" },
  { src = "https://github.com/mason-org/mason.nvim" },
})

require("builtby.plugins.colors")
require("builtby.plugins.oil")
require("builtby.plugins.pick")
```

`stow-packages/nvim/.config/nvim/lua/builtby/plugins/colors.lua`:

```lua
vim.opt.termguicolors = true
require("vague").setup({ transparent = true })
vim.cmd.colorscheme("vague")
```

`stow-packages/nvim/.config/nvim/lua/builtby/plugins/oil.lua`:

```lua
require("oil").setup({
  default_file_explorer = true,
  columns = { "icon" },
  float = { border = "rounded" },
})
```

`stow-packages/nvim/.config/nvim/lua/builtby/plugins/pick.lua`:

```lua
require("mini.pick").setup()
```

**Step 4: Run the focused test again**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add stow-packages/nvim/.config/nvim tests/nvim_module.test.ts
git commit -m "feat: add vim.pack bootstrap and core Neovim UX"
```

---

### Task 4: Add native LSP, Mason installer-only setup, and minimal Treesitter

**Files:**
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/init.lua`
- Modify: `stow-packages/nvim/.config/nvim/lua/builtby/pack.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/lsp/init.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/mason.lua`
- Create: `stow-packages/nvim/.config/nvim/lua/builtby/plugins/treesitter.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/lua_ls.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/ts_ls.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/bashls.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/jsonls.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/yamlls.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/taplo.lua`
- Create: `stow-packages/nvim/.config/nvim/lsp/marksman.lua`
- Modify: `tests/nvim_module.test.ts`

**Step 1: Extend the test with native-editor expectations**

Add assertions for:
- `require("mason").setup` in `plugins/mason.lua`
- `vim.lsp.enable({` in `lua/builtby/lsp/init.lua`
- `lua_ls`, `ts_ls`, `bashls`, `jsonls`, `yamlls`, `taplo`, `marksman` in the enabled server list
- `nvim-treesitter` in `pack.lua`
- existence of the local `lsp/*.lua` files

**Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: FAIL because the LSP and Treesitter files do not exist yet.

**Step 3: Add Mason as an installer, not as LSP orchestration**

`stow-packages/nvim/.config/nvim/lua/builtby/plugins/mason.lua`:

```lua
require("mason").setup({
  ui = {
    border = "rounded",
  },
})
```

Do **not** add `mason-lspconfig.nvim`. Users will run `:Mason` to install binaries, but Neovim itself owns the client setup.

**Step 4: Add the native LSP entrypoint**

`stow-packages/nvim/.config/nvim/lua/builtby/lsp/init.lua`:

```lua
local group = vim.api.nvim_create_augroup("builtby.lsp", { clear = true })

vim.api.nvim_create_autocmd("LspAttach", {
  group = group,
  callback = function(args)
    local client = assert(vim.lsp.get_client_by_id(args.data.client_id))
    local map = function(lhs, rhs, desc)
      vim.keymap.set("n", lhs, rhs, { buffer = args.buf, desc = desc })
    end

    map("gd", vim.lsp.buf.definition, "LSP definition")
    map("gr", vim.lsp.buf.references, "LSP references")
    map("K", vim.lsp.buf.hover, "LSP hover")
    map("<leader>ca", vim.lsp.buf.code_action, "Code action")
    map("<leader>rn", vim.lsp.buf.rename, "Rename symbol")
    map("<leader>lf", vim.lsp.buf.format, "Format buffer")

    if client:supports_method("textDocument/completion") then
      vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
    end
  end,
})

vim.diagnostic.config({
  float = { border = "rounded" },
  severity_sort = true,
  underline = true,
  virtual_text = true,
})

vim.lsp.enable({
  "lua_ls",
  "ts_ls",
  "bashls",
  "jsonls",
  "yamlls",
  "taplo",
  "marksman",
})
```

**Step 5: Add local server definitions under `lsp/`**

Start with repo-focused servers only.

`stow-packages/nvim/.config/nvim/lsp/lua_ls.lua`:

```lua
return {
  cmd = { "lua-language-server" },
  filetypes = { "lua" },
  root_markers = {
    ".luarc.json",
    ".luarc.jsonc",
    ".stylua.toml",
    "stylua.toml",
    ".git",
  },
  settings = {
    Lua = {
      diagnostics = { globals = { "vim" } },
      workspace = { checkThirdParty = false },
    },
  },
}
```

`stow-packages/nvim/.config/nvim/lsp/ts_ls.lua`:

```lua
return {
  cmd = { "typescript-language-server", "--stdio" },
  filetypes = { "javascript", "javascriptreact", "typescript", "typescriptreact" },
  root_markers = { "package.json", "tsconfig.json", ".git" },
}
```

`stow-packages/nvim/.config/nvim/lsp/bashls.lua`:

```lua
return {
  cmd = { "bash-language-server", "start" },
  filetypes = { "bash", "sh", "zsh" },
  root_markers = { ".git" },
}
```

`stow-packages/nvim/.config/nvim/lsp/jsonls.lua`:

```lua
return {
  cmd = { "vscode-json-language-server", "--stdio" },
  filetypes = { "json", "jsonc" },
  root_markers = { ".git" },
}
```

`stow-packages/nvim/.config/nvim/lsp/yamlls.lua`:

```lua
return {
  cmd = { "yaml-language-server", "--stdio" },
  filetypes = { "yaml" },
  root_markers = { ".git" },
}
```

`stow-packages/nvim/.config/nvim/lsp/taplo.lua`:

```lua
return {
  cmd = { "taplo", "lsp", "stdio" },
  filetypes = { "toml" },
  root_markers = { ".git" },
}
```

`stow-packages/nvim/.config/nvim/lsp/marksman.lua`:

```lua
return {
  cmd = { "marksman", "server" },
  filetypes = { "markdown" },
  root_markers = { ".git" },
}
```

**Step 6: Add minimal Treesitter config**

`stow-packages/nvim/.config/nvim/lua/builtby/plugins/treesitter.lua`:

```lua
require("nvim-treesitter.configs").setup({
  ensure_installed = {
    "bash",
    "javascript",
    "json",
    "lua",
    "markdown",
    "markdown_inline",
    "query",
    "toml",
    "typescript",
    "vim",
    "vimdoc",
    "yaml",
  },
  auto_install = true,
  highlight = { enable = true },
  indent = { enable = true },
})
```

Update `lua/builtby/pack.lua` so it requires `plugins.mason`, `plugins.treesitter`, and `builtby.lsp.init`.

**Step 7: Run verification**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: PASS.

If Neovim nightly is installed locally, also run:

```bash
XDG_CONFIG_HOME="$(pwd)/stow-packages/nvim/.config" nvim --headless "+qa"
```

Expected: exit code `0` after first-run `vim.pack`/Treesitter messages. If this fails, fix runtime errors before moving on.

**Step 8: Commit**

```bash
git add stow-packages/nvim/.config/nvim tests/nvim_module.test.ts
git commit -m "feat: add native LSP and Treesitter Neovim stack"
```

---

### Task 5: Add repo-focused ftplugins and finish the Neovim module docs

**Files:**
- Create: `stow-packages/nvim/.config/nvim/after/ftplugin/lua.lua`
- Create: `stow-packages/nvim/.config/nvim/after/ftplugin/markdown.lua`
- Create: `stow-packages/nvim/.config/nvim/after/ftplugin/gitcommit.lua`
- Create: `stow-packages/nvim/.config/nvim/after/ftplugin/sh.lua`
- Create: `stow-packages/nvim/.config/nvim/after/ftplugin/typescript.lua`
- Modify: `docs/modules/nvim.md`
- Modify: `tests/nvim_module.test.ts`

**Step 1: Extend the tests one last time**

Add assertions for:
- existence of the `after/ftplugin/*.lua` files
- `docs/modules/nvim.md` mentioning `bb setup nvim`
- `docs/modules/nvim.md` mentioning `Neovim 0.12+`
- `docs/modules/nvim.md` mentioning `:Mason`
- `docs/modules/nvim.md` mentioning that Windows is not supported yet

**Step 2: Run the focused test and confirm it fails first**

Run: `pnpm test -- tests/nvim_module.test.ts`
Expected: FAIL because the ftplugin files and final docs content do not exist yet.

**Step 3: Add repo-focused ftplugins**

Keep them tiny and obviously useful.

`stow-packages/nvim/.config/nvim/after/ftplugin/lua.lua`:

```lua
vim.bo.shiftwidth = 2
vim.bo.tabstop = 2
vim.bo.expandtab = true
```

`stow-packages/nvim/.config/nvim/after/ftplugin/markdown.lua`:

```lua
vim.wo.wrap = true
vim.wo.linebreak = true
vim.wo.spell = true
```

`stow-packages/nvim/.config/nvim/after/ftplugin/gitcommit.lua`:

```lua
vim.wo.spell = true
vim.bo.textwidth = 72
```

`stow-packages/nvim/.config/nvim/after/ftplugin/sh.lua`:

```lua
vim.bo.shiftwidth = 2
vim.bo.tabstop = 2
vim.bo.expandtab = true
```

`stow-packages/nvim/.config/nvim/after/ftplugin/typescript.lua`:

```lua
vim.bo.shiftwidth = 2
vim.bo.tabstop = 2
vim.bo.expandtab = true
```

**Step 4: Finish `docs/modules/nvim.md`**

Expand the docs so they include:
- prerequisite install recommendation via `bob` or another nightly installer
- `bb setup nvim`
- first launch instructions
- `:Mason` for installing server binaries
- keymaps you actually shipped (`<leader>e`, `<leader>ff`, `<leader>fg`, `<leader>lf`)
- verification commands:

```bash
bb setup nvim
nvim
:Mason
:checkhealth
```

- explicit “v1 deliberately does not include” note: DAP, snippets, Typst, merge-mode, Windows support

**Step 5: Run full verification**

Run: `pnpm test`
Expected: PASS.

If Neovim nightly is installed, re-run:

```bash
XDG_CONFIG_HOME="$(pwd)/stow-packages/nvim/.config" nvim --headless "+qa"
```

Expected: exit code `0`.

**Step 6: Commit**

```bash
git add stow-packages/nvim/.config/nvim docs/modules/nvim.md tests/nvim_module.test.ts
git commit -m "feat: finish bleeding-edge Neovim module"
```

---

### Task 6: Final review and follow-up cleanup

**Files:**
- Modify: `docs/modules/nvim.md` (only if review finds gaps)
- Modify: `README.md` (only if review finds gaps)

**Step 1: Manually review against the non-goals**

Confirm the implementation did **not** accidentally add:
- `lazy.nvim`
- `packer.nvim`
- `mason-lspconfig.nvim`
- `nvim-cmp`
- `LuaSnip`
- DAP plugins
- merge-mode support for Neovim
- Windows setup wiring for this module

If any of those appear, remove them before finishing.

**Step 2: Run final verification again**

Run: `pnpm test`
Expected: PASS.

If Neovim nightly is installed, run the headless smoke command one more time.

**Step 3: Commit the final cleanup if needed**

```bash
git add README.md docs/modules/nvim.md stow-packages/nvim/.config/nvim tests/nvim_module.test.ts
git commit -m "chore: polish Neovim module docs and guardrails"
```
