hs.window.animationDuration = 0

local appLauncher = require('modules.app_launcher')
local appToggle = require('modules.app_toggle')
local ghostty = require('modules.ghostty')

hyper = { 'ctrl', 'alt', 'cmd', 'shift' }

hs.hotkey.bind(hyper, 'space', appLauncher.show)
hs.hotkey.bind(hyper, '4', ghostty.fourPane)
hs.hotkey.bind(hyper, 'r', hs.reload)
appToggle.bind(hyper, {
  { key = 'return', bundle = 'com.mitchellh.ghostty' },
  { key = '\\', bundle = 'com.superlogical.rex' },
  { key = 'h', bundle = 'net.imput.helium' },
})
hs.alert.show('Hammerspoon loaded')
