import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");
}

describe("Neovim module wiring", () => {
  it("includes chezmoi-managed Neovim config files", () => {
    const expectedFiles = [
      "chezmoi/dot_config/nvim/init.lua",
      "chezmoi/dot_config/nvim/.luarc.json",
      "chezmoi/dot_config/nvim/nvim-pack-lock.json",
      "chezmoi/dot_config/nvim/lua/builtby/init.lua",
      "docs/modules/nvim.md",
      "chezmoi/dot_config/nvim/lua/builtby/plugins/tree.lua",
      "chezmoi/dot_config/nvim/lua/builtby/plugins/bufferline.lua",
      "chezmoi/dot_config/nvim/lua/builtby/plugins/whichkey.lua",
      "chezmoi/dot_config/nvim/lua/builtby/plugins/gitsigns.lua",
      "chezmoi/dot_config/nvim/lua/builtby/plugins/mason.lua",
      "chezmoi/dot_config/nvim/lua/builtby/plugins/treesitter.lua",
      "chezmoi/dot_config/nvim/lua/builtby/lsp/init.lua",
      "chezmoi/dot_config/nvim/lsp/lua_ls.lua",
      "chezmoi/dot_config/nvim/lsp/ts_ls.lua",
      "chezmoi/dot_config/nvim/lsp/bashls.lua",
      "chezmoi/dot_config/nvim/lsp/jsonls.lua",
      "chezmoi/dot_config/nvim/lsp/yamlls.lua",
      "chezmoi/dot_config/nvim/lsp/taplo.lua",
      "chezmoi/dot_config/nvim/lsp/marksman.lua",
      "chezmoi/dot_config/nvim/after/ftplugin/lua.lua",
      "chezmoi/dot_config/nvim/after/ftplugin/markdown.lua",
      "chezmoi/dot_config/nvim/after/ftplugin/gitcommit.lua",
      "chezmoi/dot_config/nvim/after/ftplugin/sh.lua",
      "chezmoi/dot_config/nvim/after/ftplugin/typescript.lua",
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
    expect(setupTs).toContain('nvim: [".config/nvim"]');
    expect(setupTs).not.toContain('".config/nvim/init.lua"');
    expect(setupTs).not.toContain('".config/nvim/lua/builtby/init.lua"');
    expect(setupTs).toContain('config.value === "nvim"');
    expect(functionsSh).toContain("bb setup nvim");
    expect(readme).toContain("| Neovim |");
    expect(readme).toContain("docs/modules/nvim.md");
  });

  it("uses a modular builtby bootstrap", () => {
    const builtbyInit = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/init.lua");

    expect(builtbyInit).toContain('require("builtby.options")');
    expect(builtbyInit).toContain('require("builtby.keymaps")');
    expect(builtbyInit).toContain('require("builtby.autocmds")');
    expect(builtbyInit).toContain('require("builtby.pack")');
  });

  it("defines vim.pack plugin specs for the core editor stack", () => {
    const packLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/pack.lua");

    expect(packLua).toContain("vim.pack.add({");
    expect(packLua).toContain("load = true");
    expect(packLua).toContain("vague.nvim");
    expect(packLua).toContain("oil.nvim");
    expect(packLua).toContain("mini.pick");
    expect(packLua).toContain("mini.extra");
    expect(packLua).toContain("nvim-tree.lua");
    expect(packLua).toContain("nvim-web-devicons");
    expect(packLua).toContain("bufferline.nvim");
    expect(packLua).toContain("which-key.nvim");
    expect(packLua).toContain("gitsigns.nvim");
    expect(packLua).toContain("nvim-treesitter");
    expect(packLua).toContain("mason.nvim");
  });

  it("loads plugin setup after bare vim.pack specs are added", () => {
    const packLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/pack.lua");

    expect(packLua).not.toContain("config =");
    expect(packLua).toContain('require("builtby.plugins.colors")');
    expect(packLua).toContain('require("builtby.plugins.oil")');
    expect(packLua).toContain('require("builtby.plugins.pick")');
    expect(packLua).toContain('require("builtby.plugins.tree")');
    expect(packLua).toContain('require("builtby.plugins.bufferline")');
    expect(packLua).toContain('require("builtby.plugins.whichkey")');
    expect(packLua).toContain('require("builtby.plugins.gitsigns")');
    expect(packLua.indexOf("vim.pack.add({")).toBeLessThan(packLua.indexOf('require("builtby.plugins.colors")'));
    expect(packLua.indexOf('require("builtby.plugins.colors")')).toBeLessThan(packLua.indexOf('require("builtby.plugins.oil")'));
    expect(packLua.indexOf('require("builtby.plugins.oil")')).toBeLessThan(packLua.indexOf('require("builtby.plugins.pick")'));
  });

  it("sets beginner-friendly editor defaults", () => {
    const optionsLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/options.lua");

    expect(optionsLua).toContain('vim.o.signcolumn = "yes"');
    expect(optionsLua).toContain('vim.o.clipboard = "unnamedplus"');
    expect(optionsLua).toContain('vim.o.mouse = "a"');
    expect(optionsLua).toContain("vim.o.ignorecase = true");
    expect(optionsLua).toContain("vim.o.smartcase = true");
    expect(optionsLua).toContain("vim.o.splitbelow = true");
    expect(optionsLua).toContain("vim.o.splitright = true");
    expect(optionsLua).toContain("vim.o.timeoutlen = 300");
    expect(optionsLua).toContain("vim.o.showtabline = 2");
  });

  it("uses runtime-safe MiniPick mappings and beginner shortcuts", () => {
    const keymapsLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/keymaps.lua");

    expect(keymapsLua).toContain('vim.keymap.set("i", "jj", "<Esc>"');
    expect(keymapsLua).toContain('<leader><leader>');
    expect(keymapsLua).toContain("MiniPick.start");
    expect(keymapsLua).toContain('<leader>b');
    expect(keymapsLua).toContain('<leader>ff');
    expect(keymapsLua).toContain("MiniPick.builtin.files");
    expect(keymapsLua).toContain('<leader>fg');
    expect(keymapsLua).toContain("MiniPick.builtin.grep_live");
    expect(keymapsLua).toContain('<leader>fb');
    expect(keymapsLua).toContain("MiniPick.builtin.buffers");
    expect(keymapsLua).toContain('<leader>fr');
    expect(keymapsLua).toContain('<leader>fh');
    expect(keymapsLua).toContain("MiniPick.builtin.help");
    expect(keymapsLua).toContain('<leader>bd');
    expect(keymapsLua).toContain('"<S-h>"');
    expect(keymapsLua).toContain('"<S-l>"');
    expect(keymapsLua).toContain('vim.keymap.set("x", "/"');
    expect(keymapsLua).toContain('vim.fn.setreg("/"');
    expect(keymapsLua).toContain('NvimTreeToggle');
    expect(keymapsLua).not.toContain("<cmd>Pick");
  });

  it("adds Mason, Treesitter, and native LSP entrypoints", () => {
    const builtbyInit = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/init.lua");
    const packLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/pack.lua");
    const masonLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/plugins/mason.lua");
    const treesitterLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/plugins/treesitter.lua");
    const lspInit = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/lsp/init.lua");

    expect(builtbyInit).toContain('require("builtby.lsp")');
    expect(packLua).toContain('require("builtby.plugins.mason")');
    expect(packLua).toContain('require("builtby.plugins.treesitter")');
    expect(packLua).toContain("nvim-treesitter");
    expect(masonLua).toContain('require("mason").setup');
    expect(treesitterLua).toContain('require("nvim-treesitter.config").setup');
    expect(treesitterLua).not.toContain('require("nvim-treesitter.configs").setup');
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
    const lspInit = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/lsp/init.lua");

    expect(lspInit).toContain('vim.api.nvim_create_autocmd("LspAttach"');
    expect(lspInit).toContain("args.data.client_id");
    expect(lspInit).toContain("client.id");
    expect(lspInit).toContain("vim.lsp.completion.enable(true, client.id, args.buf");
  });

  it("forces vim.pack to load plugins during startup", () => {
    const packLua = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/pack.lua");

    expect(packLua).toContain("vim.pack.add({");
    expect(packLua).toContain("}, { load = true })");
  });

  it("only enables LSP servers whose binaries are available", () => {
    const lspInit = readRepoFile("chezmoi/dot_config/nvim/lua/builtby/lsp/init.lua");

    expect(lspInit).toContain("vim.fn.executable");
    expect(lspInit).toContain("enabled_servers");
    expect(lspInit).toContain("table.insert(enabled_servers, server)");
    expect(lspInit).not.toContain("vim.lsp.enable({\n  \"lua_ls\"");
    expect(lspInit).toContain("vim.lsp.enable(enabled_servers)");
  });

  it("documents install, first launch, shortcut cheat sheet, verification, and v1 non-goals", () => {
    const nvimDocs = readRepoFile("docs/modules/nvim.md");

    expect(nvimDocs).toContain("bb setup nvim");
    expect(nvimDocs).toContain("Neovim 0.12+");
    expect(nvimDocs).toContain(":Mason");
    expect(nvimDocs).toContain(":checkhealth");
    expect(nvimDocs).toContain("Leader");
    expect(nvimDocs).toContain("Space");
    expect(nvimDocs).toContain("jj");
    expect(nvimDocs).toContain("clipboard");
    expect(nvimDocs).toContain("Space Space");
    expect(nvimDocs).toContain("<leader>b");
    expect(nvimDocs).toContain("buffer tabs");
    expect(nvimDocs).toContain("visual");
    expect(nvimDocs).toContain("Windows");
    expect(nvimDocs).toContain("<leader>ff");
    expect(nvimDocs).toContain("<leader>fg");
    expect(nvimDocs).toContain("<leader>fr");
    expect(nvimDocs).toContain("<leader>bd");
    expect(nvimDocs).toContain("<leader>lf");
    expect(nvimDocs).toContain("DAP");
    expect(nvimDocs).toContain("snippets");
    expect(nvimDocs).toContain("Typst");
    expect(nvimDocs).toContain("merge-mode");
  });
});
