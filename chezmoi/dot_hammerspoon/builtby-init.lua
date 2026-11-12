require('hs.ipc')
hs.window.animationDuration = 0

local appToggle = require('modules.app_toggle')
local workspaces = require('modules.workspaces')
local ui = require('modules.ui')

hyper = { 'ctrl', 'alt', 'cmd', 'shift' }

hs.hotkey.bind(hyper, 'r', hs.reload)
appToggle.bind(hyper, {
  { key = 'return', bundle = 'com.mitchellh.ghostty' },
  { key = '\\', bundle = 'com.superlogical.rex' },
  { key = 'h', bundle = 'net.imput.helium' },
})
workspaces.start()
ui.start()
hs.alert.show('Hammerspoon loaded')
