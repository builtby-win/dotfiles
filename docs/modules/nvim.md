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

## Basics

- Leader is `Space`
- Typing `jj` in insert mode acts like Escape
- macOS clipboard sharing is enabled through `clipboard=unnamedplus`, so yank/paste works with the system clipboard
- Press `Space` and pause to see available mappings through which-key
- Press `Space Space` for the searchable command palette

## Navigation

- `<leader>b` toggles the file sidebar
- `<leader>ff` opens fuzzy file search in the current project
- `<leader>fr` opens recent files
- `<leader>fb` switches open buffers
- `Shift+h` and `Shift+l` move to the previous and next buffer
- Buffer tabs are clickable with the mouse at the top of the window
- `:Oil` is still available when you want a directory editor for renaming or moving files

## Search

- `<leader>fg` live-greps inside the current project
- In visual mode, select text and press `/` to search for that exact selection
- Press `Esc` in normal mode to clear search highlighting

## Code

- `gd` jumps to definition
- `gr` shows references
- `K` opens hover docs
- `<leader>rn` renames the current symbol
- `<leader>ca` opens code actions
- `<leader>lf` formats the current buffer

## Buffers

- `<leader>bd` closes the current buffer
- Use the sidebar plus buffer tabs for a more app-like workflow when you are moving between files

## Verification

```bash
bb setup nvim
nvim
```

- Press `Space` to confirm which-key shows shortcut hints
- Press `Space Space` to confirm the command palette opens
- Press `<leader>b` to confirm the sidebar toggles
- Open two files and click the buffer tabs to switch between them
- Yank some text and paste it into another macOS app to confirm clipboard sharing
- Run `:Mason`
- Run `:checkhealth`

## v1 Non-Goals

- DAP
- snippets
- Typst
- merge-mode support
- Windows support
