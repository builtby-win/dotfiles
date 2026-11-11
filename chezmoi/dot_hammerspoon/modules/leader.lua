-- jk window leader for floating windows, the macOS twin of linux/hypr/leader.lua.
--
-- Karabiner turns the jk chord into Hyper+F13 (outside terminals) or Hyper+F14
-- (a second jk in a terminal, after Karabiner cancelled the herdr / tmux
-- prefix). Either opens the leader; the next key runs one action and the leader
-- closes. A key without an action just closes it.
--
--   h j k l / arrows   focus the window that way   shift+h/j/k/l   swap frames with it
--   z                  zoom: toggle almost-maximized with a gap
--   x or w             close window                `               previous window
--   t or return        new terminal
--   1..9               workspace                   shift+1..9      move app to workspace
--   q / e, [ / ]       previous / next workspace   tab             last workspace
--   a                  show every app (escape hatch if apps are hidden)
--   shift+r            resize mode (hjkl, esc or return to leave)
local workspaces = require('modules.workspaces')
local ui = require('modules.ui')

local M = {}

local ZOOM_GAP = 24
local RESIZE_STEP = 40
local MIN_SIZE = 240
local SYNTHETIC = 0x4A4B -- eventSourceUserData marking keys we post, so our tap ignores them

-- nil | 'leader' | 'resize'
local mode = nil
local swallowedUp = {}
local zoomed = {} -- window id -> frame before zoom

local function setMode(next)
  mode = next
  ui.setMode(next)
end

local function post(mods, key)
  for _, down in ipairs({ true, false }) do
    hs.eventtap.event.newKeyEvent(mods, key, down)
      :setProperty(hs.eventtap.event.properties.eventSourceUserData, SYNTHETIC)
      :post()
  end
end

local function newTerminal()
  local app = hs.application.get('com.mitchellh.ghostty')
  if app then
    app:activate()
    hs.timer.doAfter(0.1, function() post({ 'cmd' }, 'n') end)
  else
    hs.application.launchOrFocus('Ghostty')
  end
end

local function toggleLauncher()
  hs.task.new('/Applications/Vicinae.app/Contents/MacOS/vicinae-cli', nil, { 'toggle' }):start()
end

local function sameFrame(a, b)
  return math.abs(a.x - b.x) < 4 and math.abs(a.y - b.y) < 4
    and math.abs(a.w - b.w) < 4 and math.abs(a.h - b.h) < 4
end

local function zoom()
  local win = hs.window.focusedWindow()
  if not win then return end
  local area = win:screen():frame()
  local target = hs.geometry.rect(
    area.x + ZOOM_GAP, area.y + ZOOM_GAP, area.w - 2 * ZOOM_GAP, area.h - 2 * ZOOM_GAP)
  local id = win:id()
  if zoomed[id] and sameFrame(win:frame(), target) then
    win:setFrame(zoomed[id])
    zoomed[id] = nil
  else
    zoomed[id] = win:frame()
    win:setFrame(target)
  end
end

local function lastWindow()
  local windows = hs.window.orderedWindows()
  if windows[2] then windows[2]:focus() end
end

local function closeWindow()
  local win = hs.window.focusedWindow()
  if win then win:close() end
end

-- Directional focus and swap use the window frames, like Hyprland's focus l/r/u/d.
local DIRECTIONS = {
  { keys = { 'h', 'left' }, name = 'West', dw = -RESIZE_STEP, dh = 0 },
  { keys = { 'j', 'down' }, name = 'South', dw = 0, dh = RESIZE_STEP },
  { keys = { 'k', 'up' }, name = 'North', dw = 0, dh = -RESIZE_STEP },
  { keys = { 'l', 'right' }, name = 'East', dw = RESIZE_STEP, dh = 0 },
}

local function focus(direction)
  return function()
    local win = hs.window.focusedWindow()
    if win then win['focusWindow' .. direction](win, nil, true) end
  end
end

local function swap(direction)
  return function()
    local win = hs.window.focusedWindow()
    if not win then return end
    local neighbour = win['windowsTo' .. direction](win, nil, true, true)[1]
    if not neighbour then return end
    local mine, theirs = win:frame(), neighbour:frame()
    win:setFrame(theirs)
    neighbour:setFrame(mine)
  end
end

local function resize(dw, dh)
  return function()
    local win = hs.window.focusedWindow()
    if not win then return end
    local frame = win:frame()
    frame.w = math.max(MIN_SIZE, frame.w + dw)
    frame.h = math.max(MIN_SIZE, frame.h + dh)
    win:setFrame(frame)
  end
end

-- Run after the leader has closed. 'shift+' prefixes shifted keys.
local leaderActions = {
  ['z'] = zoom,
  ['x'] = closeWindow,
  ['w'] = closeWindow,
  ['`'] = lastWindow,
  ['t'] = newTerminal,
  ['return'] = newTerminal,
  ['tab'] = workspaces.last,
  ['q'] = function() workspaces.step(-1) end,
  ['['] = function() workspaces.step(-1) end,
  ['e'] = function() workspaces.step(1) end,
  [']'] = function() workspaces.step(1) end,
  ['a'] = workspaces.showAll,
  ['space'] = toggleLauncher,
}
local resizeActions = {}
for _, entry in ipairs(DIRECTIONS) do
  for _, key in ipairs(entry.keys) do
    leaderActions[key] = focus(entry.name)
    leaderActions['shift+' .. key] = swap(entry.name)
    resizeActions[key] = resize(entry.dw, entry.dh)
  end
end
for workspace = 1, workspaces.COUNT do
  leaderActions[tostring(workspace)] = function() workspaces.switch(workspace) end
  leaderActions['shift+' .. workspace] = function() workspaces.move(workspace) end
end

local function isLeaderChord(event, key)
  if key ~= 'f13' and key ~= 'f14' then return false end
  local flags = event:getFlags()
  return flags.cmd and flags.ctrl and flags.alt and flags.shift
end

local function onKeyDown(event)
  if event:getProperty(hs.eventtap.event.properties.eventSourceUserData) == SYNTHETIC then
    return false
  end

  local code = event:getKeyCode()
  local key = hs.keycodes.map[code]
  local chord = isLeaderChord(event, key)

  if mode == nil then
    if not chord then return false end
    swallowedUp[code] = true
    setMode('leader')
    return true
  end

  -- Ctrl+B: in a terminal a third jk sends the herdr / tmux prefix through.
  if event:getFlags().ctrl and key == 'b' then
    setMode(nil)
    return false
  end

  -- leader / resize: every key is ours, whether or not it has an action.
  swallowedUp[code] = true
  local name = event:getFlags().shift and ('shift+' .. key) or key

  if mode == 'resize' then
    local action = resizeActions[key]
    if action then
      action()
    elseif key == 'escape' or key == 'return' or chord then
      setMode(nil)
    end
    return true
  end

  if name == 'shift+r' then
    setMode('resize')
    return true
  end

  setMode(nil)
  local action = leaderActions[name]
  if action and not chord then action() end
  return true
end

-- Held references: Hammerspoon stops a tap whose Lua object is collected.
local keyDownTap = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, onKeyDown)
local keyUpTap = hs.eventtap.new({ hs.eventtap.event.types.keyUp }, function(event)
  local code = event:getKeyCode()
  if swallowedUp[code] then
    swallowedUp[code] = nil
    return true
  end
  return false
end)
local watchdog

function M.start()
  workspaces.start()
  ui.start()
  keyDownTap:start()
  keyUpTap:start()
  -- macOS disables a tap that stalls; bring it back.
  watchdog = hs.timer.doEvery(5, function()
    if not keyDownTap:isEnabled() then keyDownTap:start() end
    if not keyUpTap:isEnabled() then keyUpTap:start() end
  end)
end

return M
