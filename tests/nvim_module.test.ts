import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");
}

describe("Neovim module wiring", () => {
  it("includes stowable Neovim config files", () => {
    const expectedFiles = [
      "stow-packages/nvim/.config/nvim/init.lua",
      "stow-packages/nvim/.config/nvim/.luarc.json",
      "stow-packages/nvim/.config/nvim/lua/builtby/init.lua",
      "docs/modules/nvim.md",
      "stow-packages/nvim/.config/nvim/lua/builtby/plugins/mason.lua",
      "stow-packages/nvim/.config/nvim/lua/builtby/plugins/treesitter.lua",
      "stow-packages/nvim/.config/nvim/lua/builtby/lsp/init.lua",
      "stow-packages/nvim/.config/nvim/lsp/lua_ls.lua",
      "stow-packages/nvim/.config/nvim/lsp/ts_ls.lua",
      "stow-packages/nvim/.config/nvim/lsp/bashls.lua",
      "stow-packages/nvim/.config/nvim/lsp/jsonls.lua",
      "stow-packages/nvim/.config/nvim/lsp/yamlls.lua",
      "stow-packages/nvim/.config/nvim/lsp/taplo.lua",
      "stow-packages/nvim/.config/nvim/lsp/marksman.lua",
      "stow-packages/nvim/.config/nvim/after/ftplugin/lua.lua",
      "stow-packages/nvim/.config/nvim/after/ftplugin/markdown.lua",
      "stow-packages/nvim/.config/nvim/after/ftplugin/gitcommit.lua",
      "stow-packages/nvim/.config/nvim/after/ftplugin/sh.lua",
      "stow-packages/nvim/.config/nvim/after/ftplugin/typescript.lua",
    ];

    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true);
    }
  });

  it("adds nvim to setup catalogs and README", () => {
    const setupTs = readRepoFile("setup.ts");
    const functionsSh = readRepoFile("shell/functions.sh");
    const readme = readRepoFile("README.md");

    expect(setupTs).toContain('{ name: "Neovim", value: "nvim"');
    expect(setupTs).toContain('.config/nvim/init.lua');
    expect(setupTs).toContain('.config/nvim/lua/builtby/init.lua');
    expect(setupTs).toContain('.config/nvim/lua/builtby/options.lua');
    expect(setupTs).toContain('.config/nvim/lua/builtby/plugins/mason.lua');
    expect(setupTs).toContain('.config/nvim/lsp/lua_ls.lua');
    expect(setupTs).toContain('.config/nvim/after/ftplugin/lua.lua');
    expect(setupTs).toContain('config.value === "nvim"');
    expect(functionsSh).toContain("bb setup nvim");
    expect(readme).toContain("| Neovim |");
    expect(readme).toContain("docs/modules/nvim.md");
  });

  it("uses a modular builtby bootstrap", () => {
    const builtbyInit = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/init.lua");

    expect(builtbyInit).toContain('require("builtby.options")');
    expect(builtbyInit).toContain('require("builtby.keymaps")');
    expect(builtbyInit).toContain('require("builtby.autocmds")');
    expect(builtbyInit).toContain('require("builtby.pack")');
  });

  it("defines vim.pack plugin specs for the core editor stack", () => {
    const packLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/pack.lua");

    expect(packLua).toContain("vim.pack.add({");
    expect(packLua).toContain("load = true");
    expect(packLua).toContain("vague.nvim");
    expect(packLua).toContain("oil.nvim");
    expect(packLua).toContain("mini.pick");
    expect(packLua).toContain("nvim-treesitter");
    expect(packLua).toContain("mason.nvim");
  });

  it("loads plugin setup after bare vim.pack specs are added", () => {
    const packLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/pack.lua");

    expect(packLua).not.toContain("config =");
    expect(packLua).toContain('require("builtby.plugins.colors")');
    expect(packLua).toContain('require("builtby.plugins.oil")');
    expect(packLua).toContain('require("builtby.plugins.pick")');
    expect(packLua.indexOf("vim.pack.add({")).toBeLessThan(packLua.indexOf('require("builtby.plugins.colors")'));
    expect(packLua.indexOf('require("builtby.plugins.colors")')).toBeLessThan(packLua.indexOf('require("builtby.plugins.oil")'));
    expect(packLua.indexOf('require("builtby.plugins.oil")')).toBeLessThan(packLua.indexOf('require("builtby.plugins.pick")'));
  });

  it("uses runtime-safe MiniPick mappings instead of Pick commands", () => {
    const keymapsLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/keymaps.lua");

    expect(keymapsLua).toContain('<leader>ff');
    expect(keymapsLua).toContain("MiniPick.builtin.files");
    expect(keymapsLua).toContain('<leader>fg');
    expect(keymapsLua).toContain("MiniPick.builtin.grep_live");
    expect(keymapsLua).toContain('<leader>fb');
    expect(keymapsLua).toContain("MiniPick.builtin.buffers");
    expect(keymapsLua).toContain('<leader>fh');
    expect(keymapsLua).toContain("MiniPick.builtin.help");
    expect(keymapsLua).not.toContain("<cmd>Pick");
  });

  it("adds Mason, Treesitter, and native LSP entrypoints", () => {
    const builtbyInit = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/init.lua");
    const packLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/pack.lua");
    const masonLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/plugins/mason.lua");
    const treesitterLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/plugins/treesitter.lua");
    const lspInit = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/lsp/init.lua");

    expect(builtbyInit).toContain('require("builtby.lsp")');
    expect(packLua).toContain('require("builtby.plugins.mason")');
    expect(packLua).toContain('require("builtby.plugins.treesitter")');
    expect(packLua).toContain("nvim-treesitter");
    expect(masonLua).toContain('require("mason").setup');
    expect(treesitterLua).toContain('require("nvim-treesitter.configs").setup');
    expect(lspInit).toContain("local enabled_servers = {}");
    expect(lspInit).toContain('"lua_ls"');
    expect(lspInit).toContain('"ts_ls"');
    expect(lspInit).toContain('"bashls"');
    expect(lspInit).toContain('"jsonls"');
    expect(lspInit).toContain('"yamlls"');
    expect(lspInit).toContain('"taplo"');
    expect(lspInit).toContain('"marksman"');
    expect(lspInit).toContain("vim.lsp.enable(enabled_servers)");
  });

  it("enables completion from LspAttach using the attached client id", () => {
    const lspInit = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/lsp/init.lua");

    expect(lspInit).toContain('vim.api.nvim_create_autocmd("LspAttach"');
    expect(lspInit).toContain("args.data.client_id");
    expect(lspInit).toContain("client.id");
    expect(lspInit).toContain("vim.lsp.completion.enable(true, client.id, args.buf");
  });

  it("forces vim.pack to load plugins during startup", () => {
    const packLua = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/pack.lua");

    expect(packLua).toContain("vim.pack.add({");
    expect(packLua).toContain("}, { load = true })");
  });

  it("only enables LSP servers whose binaries are available", () => {
    const lspInit = readRepoFile("stow-packages/nvim/.config/nvim/lua/builtby/lsp/init.lua");

    expect(lspInit).toContain("vim.fn.executable");
    expect(lspInit).toContain("enabled_servers");
    expect(lspInit).toContain("table.insert(enabled_servers, server)");
    expect(lspInit).not.toContain("vim.lsp.enable({\n  \"lua_ls\"");
    expect(lspInit).toContain("vim.lsp.enable(enabled_servers)");
  });

  it("documents install, first launch, keymaps, verification, and v1 non-goals", () => {
    const nvimDocs = readRepoFile("docs/modules/nvim.md");

    expect(nvimDocs).toContain("bb setup nvim");
    expect(nvimDocs).toContain("Neovim 0.12+");
    expect(nvimDocs).toContain(":Mason");
    expect(nvimDocs).toContain(":checkhealth");
    expect(nvimDocs).toContain("Windows");
    expect(nvimDocs).toContain("<leader>e");
    expect(nvimDocs).toContain("<leader>ff");
    expect(nvimDocs).toContain("<leader>fg");
    expect(nvimDocs).toContain("<leader>lf");
    expect(nvimDocs).toContain("DAP");
    expect(nvimDocs).toContain("snippets");
    expect(nvimDocs).toContain("Typst");
    expect(nvimDocs).toContain("merge-mode");
  });
});
