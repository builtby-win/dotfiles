local M = {}

local appShortcuts = {
  { key = 'g', app = 'Ghostty', label = 'Ghostty terminal' },
  { key = 'c', app = 'Google Chrome', label = 'Google Chrome' },
  { key = 'v', app = 'Visual Studio Code', label = 'VS Code' },
  { key = 'u', app = 'Cursor', label = 'Cursor' },
  { key = 's', app = 'Slack', label = 'Slack' },
  { key = 'd', app = 'Discord', label = 'Discord' },
  { key = 'f', app = 'Finder', label = 'Finder' },
}

local chooser

local function launchApp(appName)
  hs.application.launchOrFocus(appName)
end

function M.show()
  if chooser == nil then
    chooser = hs.chooser.new(function(choice)
      if choice == nil then
        return
      end

      launchApp(choice.app)
    end)
  end

  local choices = {}
  for _, shortcut in ipairs(appShortcuts) do
    table.insert(choices, {
      text = shortcut.app,
      subText = 'Hyper+' .. shortcut.key .. ' - ' .. shortcut.label,
      app = shortcut.app,
    })
  end

  chooser:choices(choices)
  chooser:show()
end

function M.bindDirectShortcuts(mods)
  for _, shortcut in ipairs(appShortcuts) do
    hs.hotkey.bind(mods, shortcut.key, function()
      launchApp(shortcut.app)
    end)
  end
end

return M
