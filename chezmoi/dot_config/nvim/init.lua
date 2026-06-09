-- builtby.win/dotfiles — thin wrapper
-- Created once by chezmoi. Sources the real config from the dotfiles repo so
-- all updates are live — no chezmoi apply needed after the initial creation.

local dotfiles_dir = vim.env.DOTFILES_DIR
if not dotfiles_dir then
  local path_file = io.open(vim.env.HOME .. "/.config/dotfiles/path")
  if path_file then
    dotfiles_dir = path_file:read("*l")
    path_file:close()
  end
end

if dotfiles_dir then
  local repo_nvim = dotfiles_dir .. "/chezmoi/dot_config/nvim"
  if vim.uv.fs_stat(repo_nvim .. "/builtby-init.lua") then
    vim.opt.rtp:prepend(repo_nvim)
    vim.opt.pp:prepend(repo_nvim)
    dofile(repo_nvim .. "/builtby-init.lua")
    return
  end
end

vim.g.mapleader = " "
vim.g.maplocalleader = " "
