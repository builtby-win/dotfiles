vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

require("nvim-tree").setup({
  actions = {
    open_file = {
      quit_on_open = false,
    },
  },
  filters = {
    dotfiles = false,
  },
  git = {
    ignore = false,
  },
  renderer = {
    group_empty = true,
  },
  update_focused_file = {
    enable = true,
    update_root = false,
  },
  view = {
    preserve_window_proportions = true,
    side = "left",
    width = 32,
  },
})
