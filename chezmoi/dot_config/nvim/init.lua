vim.g.mapleader = " "
vim.g.maplocalleader = " "

if vim.fn.has("nvim-0.12") == 0 or vim.pack == nil or vim.pack.add == nil then
  vim.api.nvim_echo({
    { "builtby Neovim config requires Neovim 0.12+ with vim.pack\n", "ErrorMsg" },
  }, true, {})
  return
end

require("builtby")
