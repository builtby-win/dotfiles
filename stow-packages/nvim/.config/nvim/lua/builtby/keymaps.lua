local function with_mini_pick(callback)
  return function()
    local ok, MiniPick = pcall(require, "mini.pick")
    if not ok then
      vim.notify("mini.pick is not available", vim.log.levels.WARN)
      return
    end

    callback(MiniPick)
  end
end

vim.keymap.set("n", "<leader>e", "<cmd>Oil<cr>", { desc = "Open file explorer" })
vim.keymap.set("n", "<leader>ff", with_mini_pick(function(MiniPick)
  MiniPick.builtin.files()
end), { desc = "Find files" })
vim.keymap.set("n", "<leader>fg", with_mini_pick(function(MiniPick)
  MiniPick.builtin.grep_live()
end), { desc = "Live grep" })
vim.keymap.set("n", "<leader>fb", with_mini_pick(function(MiniPick)
  MiniPick.builtin.buffers()
end), { desc = "Find buffers" })
vim.keymap.set("n", "<leader>fh", with_mini_pick(function(MiniPick)
  MiniPick.builtin.help()
end), { desc = "Help tags" })
