local M = {}

local spaceDown = false
local layerActive = false
local modal = hs.hotkey.modal.new()

local function exitLayer()
  modal:exit()
  layerActive = false
end

-- Add bindings here
modal:bind({}, 'h', function() hs.eventtap.keyStroke({}, 'left');  exitLayer() end)
modal:bind({}, 'l', function() hs.eventtap.keyStroke({}, 'right'); exitLayer() end)
modal:bind({}, 'k', function() hs.eventtap.keyStroke({}, 'up');    exitLayer() end)
modal:bind({}, 'j', function() hs.eventtap.keyStroke({}, 'down');  exitLayer() end)
modal:bind({}, 'escape', exitLayer)

local watcher = hs.eventtap.new({
  hs.eventtap.event.types.keyDown,
  hs.eventtap.event.types.keyUp,
}, function(e)
  local key = hs.keycodes.map[e:getKeyCode()]
  local isDown = e:getType() == hs.eventtap.event.types.keyDown

  if key == 'space' then
    spaceDown = isDown
    if not isDown and not layerActive then
      hs.eventtap.keyStroke({}, 'space')
    end
    return true
  end

  if key == 'j' and isDown and spaceDown and not layerActive then
    layerActive = true
    modal:enter()
    return true
  end

  return false
end)

function M.start()
  watcher:start()
end

return M
