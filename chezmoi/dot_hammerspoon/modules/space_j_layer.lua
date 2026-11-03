local M = {}

local SYNTHETIC = 0x5350 -- eventSourceUserData on keys we post, so the watcher below ignores them

-- hs.eventtap.keyStroke sleeps 200ms per call, which blocks every event tap, and
-- its events re-enter the watcher (the replayed space was swallowed again).
-- Post tagged events instead.
local function tap(key)
  for _, down in ipairs({ true, false }) do
    hs.eventtap.event.newKeyEvent({}, key, down)
      :setProperty(hs.eventtap.event.properties.eventSourceUserData, SYNTHETIC)
      :post()
  end
end

local spaceDown = false
local layerActive = false
local modal = hs.hotkey.modal.new()

local function exitLayer()
  modal:exit()
  layerActive = false
end

-- Add bindings here
modal:bind({}, 'h', function() tap('left');  exitLayer() end)
modal:bind({}, 'l', function() tap('right'); exitLayer() end)
modal:bind({}, 'k', function() tap('up');    exitLayer() end)
modal:bind({}, 'j', function() tap('down');  exitLayer() end)
modal:bind({}, 'escape', exitLayer)

local watcher = hs.eventtap.new({
  hs.eventtap.event.types.keyDown,
  hs.eventtap.event.types.keyUp,
}, function(e)
  if e:getProperty(hs.eventtap.event.properties.eventSourceUserData) == SYNTHETIC then
    return false
  end

  local key = hs.keycodes.map[e:getKeyCode()]
  local isDown = e:getType() == hs.eventtap.event.types.keyDown

  if key == 'space' then
    if isDown then
      -- Modified space (Cmd+Space, Shift+Space, ...) belongs to the app.
      if next(e:getFlags()) then return false end
      spaceDown = true
      return true
    end
    if not spaceDown then return false end
    spaceDown = false
    if not layerActive then tap('space') end
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
