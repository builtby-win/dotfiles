vim.pack.add({
  { src = "https://github.com/vague2k/vague.nvim" },
  { src = "https://github.com/stevearc/oil.nvim" },
  { src = "https://github.com/echasnovski/mini.pick" },
  { src = "https://github.com/echasnovski/mini.extra" },
  { src = "https://github.com/nvim-tree/nvim-web-devicons" },
  { src = "https://github.com/nvim-tree/nvim-tree.lua" },
  { src = "https://github.com/akinsho/bufferline.nvim" },
  { src = "https://github.com/folke/which-key.nvim" },
  { src = "https://github.com/lewis6991/gitsigns.nvim" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter" },
  { src = "https://github.com/mason-org/mason.nvim" },
}, { load = true })

require("builtby.plugins.colors")
require("builtby.plugins.oil")
require("builtby.plugins.pick")
require("builtby.plugins.tree")
require("builtby.plugins.bufferline")
require("builtby.plugins.whichkey")
require("builtby.plugins.gitsigns")
require("builtby.plugins.mason")
require("builtby.plugins.treesitter")
