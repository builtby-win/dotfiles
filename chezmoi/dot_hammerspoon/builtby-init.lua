hs.window.animationDuration = 0

local appLauncher = require('modules.app_launcher')
local ghostty = require('modules.ghostty')
local spaceJLayer = require('modules.space_j_layer')

hyper = { 'ctrl', 'alt', 'cmd', 'shift' }

hs.hotkey.bind(hyper, 'space', appLauncher.show)
hs.hotkey.bind(hyper, '4', ghostty.fourPane)
hs.hotkey.bind(hyper, 'r', hs.reload)

spaceJLayer.start()

hs.alert.show('Hammerspoon loaded')
