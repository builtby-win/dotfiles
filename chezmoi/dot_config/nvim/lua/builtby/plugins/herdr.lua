-- herdr-nvim annotations live on <leader>h: <leader>as is already
-- "Agent: send selection to agent" (see plugins/agent.lua), and herdr-nvim
-- never overrides existing maps.
require("herdr-nvim").setup({
  prefix = "<leader>h",
})

-- Sidebar landing: the herdr-nvim daemon attaches with no file open, so the
-- sidebar would show an empty [No Name] buffer that hides which directory it
-- is rooted in. When running inside a herdr pane/tab with no file arguments,
-- open oil instead so the workspace directory is visible immediately.
-- Scoped to HERDR_TAB_ID so plain nvim outside herdr is untouched.
if vim.env.HERDR_TAB_ID ~= nil and vim.fn.argc() == 0 then
  vim.api.nvim_create_autocmd("VimEnter", {
    once = true,
    callback = function()
      local name = vim.api.nvim_buf_get_name(0)
      if name == "" and vim.fn.line("$") == 1 and vim.fn.getline(1) == "" then
        pcall(vim.cmd, "Oil")
      end
    end,
  })
end
