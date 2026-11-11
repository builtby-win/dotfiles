-- Workspace UI: a menu bar item (always visible, click to switch or move apps)
-- and a top-center HUD that shows the workspaces plus the leader mode.
local workspaces = require('modules.workspaces')

local M = {}

local BAR_HEIGHT = 34
local PILL_HEIGHT = 24
local GAP = 8
local FLASH_SECONDS = 1.2

local COLORS = {
  panel = { red = 0.07, green = 0.08, blue = 0.1, alpha = 0.92 },
  idle = { red = 0.22, green = 0.24, blue = 0.3, alpha = 1 },
  active = { red = 0.54, green = 0.67, blue = 0.97, alpha = 1 },
  leader = { red = 0.54, green = 0.67, blue = 0.97, alpha = 1 },
  resize = { red = 0.90, green = 0.40, blue = 0.40, alpha = 1 },
  light = { red = 0.9, green = 0.92, blue = 0.97, alpha = 1 },
  dark = { red = 0.07, green = 0.08, blue = 0.1, alpha = 1 },
}

local menubar = hs.menubar.new()
local hud
local hudTimer
local mode -- 'leader' | 'resize' | nil, set by the leader module

local function summary(names)
  if #names == 0 then return '' end
  local text = table.concat(names, ', ')
  return #text > 24 and text:sub(1, 23) .. '…' or text
end

local function menuItems()
  local snapshot = workspaces.snapshot()
  local items = {}
  for workspace = 1, workspaces.COUNT do
    local names = snapshot.items[workspace]
    if workspace == snapshot.current or #names > 0 then
      table.insert(items, {
        title = string.format('%d  %s', workspace, summary(names)),
        checked = workspace == snapshot.current,
        fn = function() workspaces.switch(workspace) end,
      })
    end
  end

  local moveMenu = {}
  for workspace = 1, workspaces.COUNT do
    table.insert(moveMenu, {
      title = tostring(workspace),
      fn = function() workspaces.move(workspace) end,
    })
  end
  table.insert(items, { title = '-' })
  table.insert(items, { title = 'Move frontmost app to', menu = moveMenu })
  table.insert(items, { title = 'Show all apps', fn = workspaces.showAll })
  return items
end

local function drawHud()
  local snapshot = workspaces.snapshot()
  local pills = {}
  if mode then
    table.insert(pills, { text = mode:upper(), fill = COLORS[mode], color = COLORS.dark })
  end
  for workspace = 1, workspaces.COUNT do
    local names = snapshot.items[workspace]
    if workspace == snapshot.current or #names > 0 then
      local current = workspace == snapshot.current
      table.insert(pills, {
        text = string.format('%d %s', workspace, summary(names)):gsub('%s+$', ''),
        fill = current and COLORS.active or COLORS.idle,
        color = current and COLORS.dark or COLORS.light,
      })
    end
  end

  local width = GAP
  for _, pill in ipairs(pills) do
    pill.width = math.floor(#pill.text * 8.4) + 20
    width = width + pill.width + GAP
  end

  local screen = hs.screen.mainScreen():frame()
  if hud then hud:delete() end
  hud = hs.canvas.new({
    x = screen.x + (screen.w - width) / 2,
    y = screen.y + 8,
    w = width,
    h = BAR_HEIGHT,
  })
  hud:level(hs.canvas.windowLevels.overlay)
  hud:behavior(hs.canvas.windowBehaviors.canJoinAllSpaces + hs.canvas.windowBehaviors.stationary)
  hud[1] = {
    type = 'rectangle',
    action = 'fill',
    fillColor = COLORS.panel,
    roundedRectRadii = { xRadius = BAR_HEIGHT / 2, yRadius = BAR_HEIGHT / 2 },
  }

  local x = GAP
  local y = (BAR_HEIGHT - PILL_HEIGHT) / 2
  for _, pill in ipairs(pills) do
    hud[#hud + 1] = {
      type = 'rectangle',
      action = 'fill',
      fillColor = pill.fill,
      roundedRectRadii = { xRadius = PILL_HEIGHT / 2, yRadius = PILL_HEIGHT / 2 },
      frame = { x = x, y = y, w = pill.width, h = PILL_HEIGHT },
    }
    hud[#hud + 1] = {
      type = 'text',
      text = pill.text,
      textFont = 'Menlo-Bold',
      textSize = 13,
      textColor = pill.color,
      textAlignment = 'center',
      frame = { x = x, y = y + 3, w = pill.width, h = PILL_HEIGHT },
    }
    x = x + pill.width + GAP
  end
  hud:show()
end

local function hideHud()
  if hudTimer then
    hudTimer:stop()
    hudTimer = nil
  end
  if hud then
    hud:delete()
    hud = nil
  end
end

-- Menu bar title: the current workspace number.
local function refreshMenubar()
  menubar:setTitle(string.format('◧ %d', workspaces.current()))
end

-- Called by the leader as its mode changes. Leader and resize keep the HUD up;
-- leaving them hides it.
function M.setMode(next)
  mode = next
  if mode then
    if hudTimer then
      hudTimer:stop()
      hudTimer = nil
    end
    drawHud()
  else
    hideHud()
  end
end

function M.start()
  menubar:setMenu(menuItems)
  refreshMenubar()
  workspaces.onChange = function()
    refreshMenubar()
    drawHud()
    -- Leader modes own the HUD; a plain switch only flashes it.
    if not mode then
      if hudTimer then hudTimer:stop() end
      hudTimer = hs.timer.doAfter(FLASH_SECONDS, hideHud)
    end
  end
end

return M
