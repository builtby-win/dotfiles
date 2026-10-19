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

local function toggle_omp_terminal()
  if _G.Snacks and Snacks.terminal and Snacks.terminal.toggle then
    Snacks.terminal.toggle("omp", { win = { position = "right", width = 0.4 } })
    return
  end

  for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
    local buf = vim.api.nvim_win_get_buf(win)
    local name = vim.api.nvim_buf_get_name(buf)
    if vim.bo[buf].buftype == "terminal" and (name:match("omp") or vim.b[buf].is_omp_term) then
      vim.api.nvim_win_close(win, false)
      return
    end
  end

  local omp_buf = nil
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if vim.api.nvim_buf_is_valid(buf) and vim.bo[buf].buftype == "terminal" then
      local name = vim.api.nvim_buf_get_name(buf)
      if name:match("omp") or vim.b[buf].is_omp_term then
        omp_buf = buf
        break
      end
    end
  end

  local width = math.floor(vim.o.columns * 0.4)
  vim.cmd("botright " .. width .. "vsplit")
  if omp_buf and vim.api.nvim_buf_is_valid(omp_buf) then
    vim.api.nvim_win_set_buf(0, omp_buf)
  else
    vim.cmd("terminal omp")
    vim.b[0].is_omp_term = true
  end
  vim.cmd("startinsert")
end

vim.keymap.set("n", "<leader>ao", toggle_omp_terminal, { desc = "Toggle Oh My Pi" })

-- --- VSCode / IntelliJ muscle memory ---
-- A command palette already exists: <leader><leader>. These add editor
-- habits from VSCode/IntelliJ on top of mini.pick + LSP. Every action also
-- keeps its <leader> binding above, so nothing here is load-bearing.

-- Command palette (VSCode: Ctrl+Shift+P) and file search (VSCode: Ctrl+P)
vim.keymap.set("n", "<C-S-p>", with_mini_pick(command_palette), { desc = "Command palette" })
vim.keymap.set("n", "<leader>p", with_mini_pick(command_palette), { desc = "Command palette" })
vim.keymap.set("n", "<C-p>", with_mini_pick(function(MiniPick)
  MiniPick.builtin.files()
end), { desc = "Find files" })

-- Find in path (IntelliJ: Ctrl+Shift+F)
vim.keymap.set("n", "<C-S-f>", with_mini_pick(function(MiniPick)
  MiniPick.builtin.grep_live()
end), { desc = "Grep text" })
vim.keymap.set("n", "<leader>/", with_mini_pick(function(MiniPick)
  MiniPick.builtin.grep_live()
end), { desc = "Grep text" })

-- Comment line/selection (VSCode: Ctrl+/ — terminals send it as Ctrl+_)
vim.keymap.set("n", "<C-_>", "gcc", { desc = "Comment line", remap = true })
vim.keymap.set("x", "<C-_>", "gc", { desc = "Comment selection", remap = true })

-- Quick fix (IntelliJ: Alt+Enter, VSCode: Ctrl+.)
vim.keymap.set("n", "<A-CR>", vim.lsp.buf.code_action, { desc = "Code action" })
vim.keymap.set("n", "<leader>.", vim.lsp.buf.code_action, { desc = "Code action" })

-- Go to definition (IntelliJ: Ctrl+B, VSCode: F12)
vim.keymap.set("n", "<C-b>", vim.lsp.buf.definition, { desc = "LSP definition" })
vim.keymap.set("n", "<F12>", vim.lsp.buf.definition, { desc = "LSP definition" })

-- Rename (VSCode: F2, IntelliJ: Shift+F6)
vim.keymap.set("n", "<F2>", vim.lsp.buf.rename, { desc = "Rename symbol" })
vim.keymap.set("n", "<S-F6>", vim.lsp.buf.rename, { desc = "Rename symbol" })

-- Reformat file (IntelliJ: Ctrl+Alt+L)
vim.keymap.set("n", "<C-A-l>", vim.lsp.buf.format, { desc = "Format buffer" })

-- Duplicate line/selection (Ctrl+D stays half-page scroll; Shift keeps both)
vim.keymap.set("n", "<C-S-d>", ":t.<CR>", { desc = "Duplicate line" })
vim.keymap.set("x", "<C-S-d>", ":t'><CR>", { desc = "Duplicate selection" })

-- Save / undo / redo / select-all (universal habits)
vim.keymap.set("n", "<C-s>", "<cmd>write<CR>", { desc = "Save file" })
vim.keymap.set("i", "<C-s>", "<Esc><cmd>write<CR>", { desc = "Save file" })
vim.keymap.set("n", "<C-z>", "u", { desc = "Undo" })
vim.keymap.set("i", "<C-z>", "<C-o>u", { desc = "Undo" })
vim.keymap.set("n", "<C-S-z>", "<C-r>", { desc = "Redo" })
vim.keymap.set("n", "<C-a>", "ggVG", { desc = "Select all" })

-- --- Cmd-key layer (macOS Ghostty) ---
-- Ghostty forwards each Cmd combo as a high function key (F13–F24): no
-- Kitty-protocol negotiation, survives herdr/tmux/ssh. Bridge (see
-- ghostty/builtby-config): Cmd+Shift+P=F13 palette, Cmd+Shift+O/Cmd+P=F14
-- files, Cmd+O=F15 recent, Cmd+S=F16 save, Cmd+Z=F17 undo,
-- Cmd+Shift+Z=F18 redo, Cmd+A=F19 select-all, Cmd+Shift+F=F20 grep,
-- Cmd+F=F21 find-in-file, Cmd+B=F22 definition, Cmd+.=F23 code-action,
-- Cmd+Shift+D=F24 duplicate. Cmd+/ arrives as Ctrl+_ (see <C-_> above).
vim.keymap.set("n", "<F13>", with_mini_pick(command_palette), { desc = "Command palette" })
vim.keymap.set("n", "<F14>", with_mini_pick(function(MiniPick)
  MiniPick.builtin.files()
end), { desc = "Find files" })
vim.keymap.set("n", "<F15>", with_mini_pick(recent_files), { desc = "Recent files" })
vim.keymap.set("n", "<F16>", "<cmd>write<CR>", { desc = "Save file" })
vim.keymap.set("i", "<F16>", "<Esc><cmd>write<CR>", { desc = "Save file" })
vim.keymap.set("n", "<F17>", "u", { desc = "Undo" })
vim.keymap.set("i", "<F17>", "<C-o>u", { desc = "Undo" })
vim.keymap.set("n", "<F18>", "<C-r>", { desc = "Redo" })
vim.keymap.set("n", "<F19>", "ggVG", { desc = "Select all" })
vim.keymap.set("n", "<F20>", with_mini_pick(function(MiniPick)
  MiniPick.builtin.grep_live()
end), { desc = "Grep text" })
vim.keymap.set("n", "<F21>", "/", { desc = "Find in file" })
vim.keymap.set("n", "<F22>", vim.lsp.buf.definition, { desc = "LSP definition" })
vim.keymap.set("n", "<F23>", vim.lsp.buf.code_action, { desc = "Code action" })
vim.keymap.set("n", "<F24>", ":t.<CR>", { desc = "Duplicate line" })
vim.keymap.set("x", "<F24>", ":t'><CR>", { desc = "Duplicate selection" })
