hs.window.animationDuration = 0

local appToggle = require('modules.app_toggle')

hyper = { 'ctrl', 'alt', 'cmd', 'shift' }

hs.hotkey.bind(hyper, 'r', hs.reload)
appToggle.bind(hyper, {
  { key = 'return', bundle = 'com.mitchellh.ghostty' },
  { key = '\\', bundle = 'com.superlogical.rex' },
  { key = 'h', bundle = 'net.imput.helium' },
})
hs.alert.show('Hammerspoon loaded')
