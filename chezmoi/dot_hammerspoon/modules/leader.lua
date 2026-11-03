-- jk leader for windows, the macOS twin of linux/hypr/leader.lua.
--
-- Karabiner turns the jk chord into Hyper+F13 (chezmoi/dot_config/karabiner).
-- The next key runs one action and the leader closes; any key without an action
-- just closes it. Tiling and Spaces are mimi (chezmoi/dot_config/mimi): focus,
-- swap and layout go through `mimi tiling cmd`, Spaces through `mimi action`.
--
-- In a terminal the first jk is the herdr / tmux prefix instead (it sends
-- Ctrl+B); jk jk within a second cancels that prefix and opens this leader.
--
--   h j k l / arrows   focus window         shift+h/j/k/l   swap with the tile that way
--   t or return        new terminal         d / shift+d     new terminal split right / down
--   z                  maximize (zoom)      f               toggle floating
--   s                  toggle split         space           launcher
--   1..9, 0            Space                shift+1..9      move window there
--   q / e, [ / ]       previous / next Space   tab          last Space
--   shift+r            resize mode (hjkl, esc or return to leave)
--   jk jk jk           (leader open) send Ctrl+B to the app
local appLauncher = require('modules.app_launcher')
local mimiCli = require('modules.mimi')
local spacesBar = require('modules.spaces_bar')

local M = {}

local MUX_WINDOW = 1.0 -- seconds a second jk still counts as "window leader" inside a terminal
local RATIO_STEP = 0.05
local SYNTHETIC = 0x4A4B -- eventSourceUserData marking keys we post, so our tap ignores them

local TERMINALS = {
  ['com.mitchellh.ghostty'] = true,
  ['com.googlecode.iterm2'] = true,
  ['com.apple.Terminal'] = true,
  ['dev.warp.Warp-Stable'] = true,
  ['net.kovidgoyal.kitty'] = true,
  ['org.alacritty'] = true,
  ['io.alacritty'] = true,
  ['com.github.wez.wezterm'] = true,
  ['com.cmuxterm.app'] = true,
  ['com.kk2.rootshell'] = true,
}

local PILL = {
  leader = { text = 'LEADER', color = { red = 0.54, green = 0.67, blue = 0.97, alpha = 1 } },
  resize = { text = 'RESIZE', color = { red = 0.90, green = 0.40, blue = 0.40, alpha = 1 } },
}

-- nil | 'leader' | 'resize' | 'mux' (first jk went to the terminal as its prefix)
local state = nil
local muxTimer = nil
local swallowedUp = {}

---------------------------------------------------------------- indicator --

local pill = hs.canvas.new({ x = 0, y = 0, w = 120, h = 30 })
pill:level(hs.canvas.windowLevels.overlay)
pill:behavior(hs.canvas.windowBehaviors.canJoinAllSpaces + hs.canvas.windowBehaviors.stationary)
pill[1] = { type = 'rectangle', action = 'fill', roundedRectRadii = { xRadius = 15, yRadius = 15 } }
pill[2] = {
  type = 'text',
  textAlignment = 'center',
  textColor = { red = 0.07, green = 0.08, blue = 0.1, alpha = 1 },
  textSize = 14,
  textFont = 'Menlo-Bold',
  frame = { x = 0, y = 4, w = 120, h = 24 },
}

-- Only the window leader gets a pill: the terminal's own prefix is not ours.
local function render()
  local look = PILL[state]
  if not look then
    pill:hide()
    return
  end

  local screen = hs.screen.mainScreen():frame()
  pill:frame({ x = screen.x + 12, y = screen.y + 8, w = 120, h = 30 })
  pill[1].fillColor = look.color
  pill[2].text = look.text
  pill:show()
end

local function setState(next)
  state = next
  if state ~= 'mux' and muxTimer then
    muxTimer:stop()
    muxTimer = nil
  end
  render()
end

------------------------------------------------------------------ helpers --

local function post(mods, key)
  for _, down in ipairs({ true, false }) do
    hs.eventtap.event.newKeyEvent(mods, key, down)
      :setProperty(hs.eventtap.event.properties.eventSourceUserData, SYNTHETIC)
      :post()
  end
end

local function mimi(...)
  mimiCli.run({ ... })
end

local function tiling(...)
  local args = { 'tiling', 'cmd', ... }
  return function() mimi(table.unpack(args)) end
end

local function action(...)
  local args = { 'action', ... }
  return function() mimi(table.unpack(args)) end
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

-- The layout opens the next window on that side of the focused tile, like
-- Hyprland's preselect.
local function splitTerminal(side)
  return function()
    mimi('tiling', 'cmd', 'preselect', side)
    newTerminal()
  end
end

--------------------------------------------------------------------- keys --

-- Each entry runs after the leader has closed. 'shift+' prefixes shifted keys.
local leaderActions = {
  ['x'] = action('close_window'),
  ['z'] = tiling('togglemax'),
  ['f'] = tiling('togglefloat'),
  ['s'] = tiling('togglesplit'),
  ['t'] = newTerminal,
  ['return'] = newTerminal,
  ['d'] = splitTerminal('right'),
  ['shift+d'] = splitTerminal('down'),
  ['tab'] = function()
    local previous = spacesBar.previous()
    if previous then mimi('action', 'space', tostring(previous)) end
  end,
  ['space'] = appLauncher.show,
  ['q'] = action('space', 'prev'),
  ['['] = action('space', 'prev'),
  ['e'] = action('space', 'next'),
  [']'] = action('space', 'next'),
}
leaderActions['w'] = leaderActions['x']

-- ratio grows or shrinks the focused tile's share of its split, so l/j grow
-- and h/k shrink, as Hyprland's resizeactive does.
local directions = {
  { keys = { 'h', 'left' }, name = 'left', ratio = -RATIO_STEP },
  { keys = { 'j', 'down' }, name = 'down', ratio = RATIO_STEP },
  { keys = { 'k', 'up' }, name = 'up', ratio = -RATIO_STEP },
  { keys = { 'l', 'right' }, name = 'right', ratio = RATIO_STEP },
}
local resizeActions = {}
for _, entry in ipairs(directions) do
  for _, key in ipairs(entry.keys) do
    leaderActions[key] = tiling('focus', entry.name)
    leaderActions['shift+' .. key] = tiling('swap', entry.name)
    resizeActions[key] = tiling('ratio', string.format('%+.2f', entry.ratio))
  end
end

for n = 1, 10 do
  local key = tostring(n % 10)
  leaderActions[key] = action('space', tostring(n))
  leaderActions['shift+' .. key] = action('move_window_to_space', tostring(n))
end

------------------------------------------------------------------ the tap --

local function isLeaderChord(event, key)
  if key ~= 'f13' then return false end
  local flags = event:getFlags()
  return flags.cmd and flags.ctrl and flags.alt and flags.shift
end

local function startMuxWait()
  setState('mux')
  muxTimer = hs.timer.doAfter(MUX_WINDOW, function()
    muxTimer = nil
    if state == 'mux' then setState(nil) end
  end)
end

local function frontmostIsTerminal()
  local app = hs.application.frontmostApplication()
  return app ~= nil and TERMINALS[app:bundleID()] == true
end

local function onKeyDown(event)
  if event:getProperty(hs.eventtap.event.properties.eventSourceUserData) == SYNTHETIC then
    return false
  end

  local code = event:getKeyCode()
  local key = hs.keycodes.map[code]
  local chord = isLeaderChord(event, key)

  if state == nil then
    if not chord then return false end
    swallowedUp[code] = true
    if frontmostIsTerminal() then
      post({ 'ctrl' }, 'b')
      startMuxWait()
    else
      setState('leader')
    end
    return true
  end

  if state == 'mux' then
    if chord then
      -- Cancel the prefix the terminal app is waiting on, then open the leader.
      swallowedUp[code] = true
      post({}, 'escape')
      setState('leader')
      return true
    end
    -- Any other key belongs to the app; it also ends the wait.
    setState(nil)
    return false
  end

  -- leader / resize: every key is ours, whether or not it has an action.
  swallowedUp[code] = true
  local name = event:getFlags().shift and ('shift+' .. key) or key

  if state == 'resize' then
    local resizeAction = resizeActions[key]
    if resizeAction then
      resizeAction()
    elseif key == 'escape' or key == 'return' or chord then
      setState(nil)
    end
    return true
  end

  if name == 'shift+r' then
    setState('resize')
    return true
  end

  setState(nil)
  if chord then
    post({ 'ctrl' }, 'b')
  elseif leaderActions[name] then
    leaderActions[name]()
    -- Moving a window or switching Space changes what the menu bar lists.
    hs.timer.doAfter(0.4, spacesBar.refresh)
  end
  return true
end

local keyDownTap = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, onKeyDown)
local keyUpTap = hs.eventtap.new({ hs.eventtap.event.types.keyUp }, function(event)
  local code = event:getKeyCode()
  if swallowedUp[code] then
    swallowedUp[code] = nil
    return true
  end
  return false
end)

function M.start()
  keyDownTap:start()
  keyUpTap:start()
end

return M
