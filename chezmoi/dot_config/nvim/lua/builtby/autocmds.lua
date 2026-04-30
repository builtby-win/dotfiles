local builtbyGroup = vim.api.nvim_create_augroup("builtby", { clear = true })

vim.api.nvim_create_autocmd("TextYankPost", {
  group = builtbyGroup,
  callback = function()
    vim.highlight.on_yank()
  end,
})
