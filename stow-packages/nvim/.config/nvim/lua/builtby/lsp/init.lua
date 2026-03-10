local group = vim.api.nvim_create_augroup("builtby.lsp", { clear = true })

vim.api.nvim_create_autocmd("LspAttach", {
  group = group,
  callback = function(args)
    local client = assert(vim.lsp.get_client_by_id(args.data.client_id))
    local map = function(lhs, rhs, desc)
      vim.keymap.set("n", lhs, rhs, { buffer = args.buf, desc = desc })
    end

    map("gd", vim.lsp.buf.definition, "LSP definition")
    map("gr", vim.lsp.buf.references, "LSP references")
    map("K", vim.lsp.buf.hover, "LSP hover")
    map("<leader>ca", vim.lsp.buf.code_action, "Code action")
    map("<leader>rn", vim.lsp.buf.rename, "Rename symbol")
    map("<leader>lf", vim.lsp.buf.format, "Format buffer")

    if client:supports_method("textDocument/completion") then
      vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
    end
  end,
})

vim.diagnostic.config({
  float = { border = "rounded" },
  severity_sort = true,
  underline = true,
  virtual_text = true,
})

local server_commands = {
  lua_ls = "lua-language-server",
  ts_ls = "typescript-language-server",
  bashls = "bash-language-server",
  jsonls = "vscode-json-language-server",
  yamlls = "yaml-language-server",
  taplo = "taplo",
  marksman = "marksman",
}

local enabled_servers = {}

for _, server in ipairs({
  "lua_ls",
  "ts_ls",
  "bashls",
  "jsonls",
  "yamlls",
  "taplo",
  "marksman",
}) do
  local command = server_commands[server]
  if command ~= nil and vim.fn.executable(command) == 1 then
    table.insert(enabled_servers, server)
  end
end

vim.lsp.enable(enabled_servers)
