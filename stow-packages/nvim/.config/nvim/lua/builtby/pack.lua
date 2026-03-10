vim.pack.add({
  { src = "https://github.com/vague2k/vague.nvim" },
  { src = "https://github.com/stevearc/oil.nvim" },
  { src = "https://github.com/echasnovski/mini.pick" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter" },
  { src = "https://github.com/mason-org/mason.nvim" },
}, { load = true })

require("builtby.plugins.colors")
require("builtby.plugins.oil")
require("builtby.plugins.pick")
require("builtby.plugins.mason")
require("builtby.plugins.treesitter")
