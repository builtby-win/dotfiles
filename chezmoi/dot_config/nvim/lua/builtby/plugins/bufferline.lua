require("bufferline").setup({
  options = {
    always_show_bufferline = true,
    diagnostics = "nvim_lsp",
    mode = "buffers",
    offsets = {
      {
        filetype = "NvimTree",
        text = "Files",
        text_align = "left",
      },
    },
    separator_style = "slant",
    show_buffer_close_icons = false,
    show_close_icon = false,
  },
})
