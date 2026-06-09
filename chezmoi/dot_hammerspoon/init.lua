-- builtby.win/dotfiles — thin wrapper
-- Created once by chezmoi. Loads the real config from the dotfiles repo so all
-- updates are live. Chezmoi never needs to re-apply this file.

local dotfiles_dir = os.getenv("DOTFILES_DIR")
if not dotfiles_dir then
  local path_file = io.open(os.getenv("HOME") .. "/.config/dotfiles/path")
  if path_file then
    dotfiles_dir = path_file:read("*l")
    path_file:close()
  end
end

if dotfiles_dir then
  local hs_dir = dotfiles_dir .. "/chezmoi/dot_hammerspoon"
  if hs.fs.displayName(hs_dir .. "/builtby-init.lua") then
    package.path = hs_dir .. "/?.lua;" .. hs_dir .. "/?/init.lua;" .. package.path
    dofile(hs_dir .. "/builtby-init.lua")
    return
  end
end

hs.alert.show("Dotfiles repo not found — Hammerspoon config not loaded")
