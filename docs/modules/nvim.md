# Neovim module

Requires Neovim 0.12+ because the config uses `vim.pack`. Nightly is recommended until 0.12 is widely available, using `bob` or another Neovim nightly installer.

## Install

```bash
bb setup nvim
```

## First Launch

After stowing the module, start Neovim and install the language server binaries you want:

```vim
:Mason
```

Then verify the runtime state:

```vim
:checkhealth
```

## Keymaps

- `<leader>e` opens Oil
- `<leader>ff` opens file search
- `<leader>fg` opens live grep
- `<leader>lf` formats the current buffer with LSP

## Verification

```bash
bb setup nvim
nvim
:Mason
:checkhealth
```

## v1 Non-Goals

- DAP
- snippets
- Typst
- merge-mode support
- Windows support
