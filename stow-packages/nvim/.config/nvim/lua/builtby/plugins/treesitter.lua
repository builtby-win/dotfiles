require("nvim-treesitter.configs").setup({
  ensure_installed = {
    "bash",
    "javascript",
    "json",
    "lua",
    "markdown",
    "markdown_inline",
    "query",
    "toml",
    "typescript",
    "vim",
    "vimdoc",
    "yaml",
  },
  auto_install = true,
  highlight = { enable = true },
  indent = { enable = true },
})
