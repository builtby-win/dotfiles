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

local function toggle_tree()
  if vim.fn.exists(":NvimTreeToggle") == 0 then
    vim.notify("nvim-tree is not available", vim.log.levels.WARN)
    return
  end

  vim.cmd("NvimTreeToggle")
end

local function recent_files(MiniPick)
  local seen = {}
  local items = {}

  for _, file in ipairs(vim.v.oldfiles) do
    if file ~= "" and vim.fn.filereadable(file) == 1 and not seen[file] then
      table.insert(items, file)
      seen[file] = true
    end
  end

  MiniPick.start({
    source = {
      name = "Recent Files",
      items = items,
      choose = function(item)
        vim.cmd.edit(vim.fn.fnameescape(item))
      end,
    },
  })
end

local function command_palette(MiniPick)
  local actions = {
    ["Buffers: Switch open buffer"] = function()
      MiniPick.builtin.buffers()
    end,
    ["Code: Code action"] = function()
      vim.lsp.buf.code_action()
    end,
    ["Code: Format buffer"] = function()
      vim.lsp.buf.format()
    end,
    ["Code: Rename symbol"] = function()
      vim.lsp.buf.rename()
    end,
    ["Files: Find files"] = function()
      MiniPick.builtin.files()
    end,
    ["Files: Toggle sidebar"] = toggle_tree,
    ["Help: Help tags"] = function()
      MiniPick.builtin.help()
    end,
    ["Quit: Quit window"] = function()
      vim.cmd.quit()
    end,
    ["Search: Grep text"] = function()
      MiniPick.builtin.grep_live()
    end,
    ["Search: Recent files"] = function()
      recent_files(MiniPick)
    end,
  }

  local items = vim.tbl_keys(actions)
  table.sort(items)

  MiniPick.start({
    source = {
      name = "Command Palette",
      items = items,
      choose = function(item)
        local action = actions[item]
        if action ~= nil then
          action()
        end
      end,
    },
  })
end

local function get_visual_selection()
  local start_pos = vim.fn.getpos("v")
  local end_pos = vim.fn.getpos(".")
  local start_row = start_pos[2] - 1
  local start_col = start_pos[3] - 1
  local end_row = end_pos[2] - 1
  local end_col = end_pos[3]

  if start_row > end_row or (start_row == end_row and start_col > end_col) then
    start_row, end_row = end_row, start_row
    start_col, end_col = end_col - 1, start_col + 1
  end

  local lines = vim.api.nvim_buf_get_text(0, start_row, start_col, end_row, end_col, {})
  return table.concat(lines, "\n")
end

local function search_visual_selection()
  local selection = get_visual_selection()
  if selection == "" then
    return
  end

  local pattern = "\\V" .. selection:gsub("\\", "\\\\"):gsub("\n", "\\n")
  local esc = vim.api.nvim_replace_termcodes("<Esc>", true, false, true)

  vim.api.nvim_feedkeys(esc, "nx", false)
  vim.fn.setreg("/", pattern)
  vim.o.hlsearch = true
  vim.cmd.normal({ args = { "n" }, bang = true })
end

vim.keymap.set("i", "jj", "<Esc>", { desc = "Exit insert mode" })
vim.keymap.set("n", "<Esc>", "<cmd>nohlsearch<cr>", { desc = "Clear search highlight" })
vim.keymap.set("n", "<leader><leader>", with_mini_pick(function(MiniPick)
  command_palette(MiniPick)
end), { desc = "Open command palette" })
vim.keymap.set("n", "<leader>b", toggle_tree, { desc = "Toggle file sidebar" })
vim.keymap.set("n", "<leader>e", toggle_tree, { desc = "Toggle file sidebar" })
vim.keymap.set("n", "<leader>ff", with_mini_pick(function(MiniPick)
  MiniPick.builtin.files()
end), { desc = "Find files" })
vim.keymap.set("n", "<leader>fg", with_mini_pick(function(MiniPick)
  MiniPick.builtin.grep_live()
end), { desc = "Live grep" })
vim.keymap.set("n", "<leader>fb", with_mini_pick(function(MiniPick)
  MiniPick.builtin.buffers()
end), { desc = "Find buffers" })
vim.keymap.set("n", "<leader>fr", with_mini_pick(function(MiniPick)
  recent_files(MiniPick)
end), { desc = "Recent files" })
vim.keymap.set("n", "<leader>fh", with_mini_pick(function(MiniPick)
  MiniPick.builtin.help()
end), { desc = "Help tags" })
vim.keymap.set("n", "<S-h>", "<cmd>bprevious<cr>", { desc = "Previous buffer" })
vim.keymap.set("n", "<S-l>", "<cmd>bnext<cr>", { desc = "Next buffer" })
vim.keymap.set("n", "<leader>bd", "<cmd>bdelete<cr>", { desc = "Delete buffer" })
vim.keymap.set("x", "/", search_visual_selection, { desc = "Search selection" })
