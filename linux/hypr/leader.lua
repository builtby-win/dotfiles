-- jk leader for Hyprland windows, modeled on the herdr / tmux prefix.
-- Installed to ~/.config/hypr/leader.lua by scripts/setup-linux-desktop.sh and
-- loaded from bindings.lua with: require("hypr.leader")
--
-- keyd turns the jk chord into Hyper+F13 (linux/keyd/default.conf). Hyprland
-- enters the "leader" submap on it; the next key runs one action and the submap
-- closes. Any key without an action just closes it. Keys mirror herdr's prefix
-- binds (chezmoi/dot_config/herdr/config.toml), with workspaces as tabs.
--
-- In a window running herdr or tmux the first jk is their prefix instead (it
-- sends Ctrl+B); jk jk then cancels that prefix and opens this leader.
--
--   h j k l / arrows   focus window         shift+h/j/k/l   swap window
--   d / shift+d        new terminal right / below
--   t or return        new terminal         x or w          close window
--   z                  maximize (zoom)      f               toggle floating
--   s                  toggle split         space           launcher
--   1..9, 0            workspace            shift+1..9      move window there
--   q / e, [ / ]       previous / next workspace   tab      former workspace
--   shift+r            resize mode (hjkl, esc to leave)
--   jk jk jk           (in herdr / tmux, or any window) send Ctrl+B to the app
--
-- Stuck in a submap: hyprctl dispatch 'hl.dsp.submap("reset")'

-- KEY_F13 (keycode 191). xkb maps it to XF86Tools, so a keysym bind on F13 never matches.
local LEADER = "SUPER + CTRL + ALT + SHIFT + code:191"
local RESIZE_STEP = 40
local MUX_WINDOW = 1000 -- ms a second jk still counts as "window leader" inside herdr / tmux

-- Down/up split with a timer: same workaround macos.lua uses, Hyprland
-- send_shortcut sometimes leaves synthetic key state stuck.
local function tap(mods, key)
  hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "down" }))
  hl.timer(function()
    hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "up" }))
  end, { timeout = 50, type = "oneshot" })
end

local function send_ctrl_b()
  tap("CTRL", "B")
end

-- True when the focused window's process tree holds a herdr or tmux client.
-- Each foot window is its own process, so the window pid roots the tree. Only
-- runs on a jk press. Remote herdr / tmux over ssh is invisible here: that
-- window gets the window leader on jk, and jk jk sends Ctrl+B through.
local function in_multiplexer()
  local window = hl.get_active_window()
  if not window or not window.pid then
    return false
  end

  local pipe = io.popen("ps -eo pid=,ppid=,comm=")
  if not pipe then
    return false
  end

  local children, comm = {}, {}
  for line in pipe:lines() do
    local pid, ppid, name = line:match("^%s*(%d+)%s+(%d+)%s+(.-)%s*$")
    if pid then
      pid, ppid = tonumber(pid), tonumber(ppid)
      comm[pid] = name
      children[ppid] = children[ppid] or {}
      table.insert(children[ppid], pid)
    end
  end
  pipe:close()

  local stack = { window.pid }
  while #stack > 0 do
    local pid = table.remove(stack)
    local name = comm[pid]
    if name == "herdr" or name == "tmux: client" or name == "tmux" then
      return true
    end
    for _, child in ipairs(children[pid] or {}) do
      table.insert(stack, child)
    end
  end

  return false
end

-- Dwindle splits the focused window on the next open: preselect the side, then
-- open a terminal in the focused terminal's directory.
local function split(side)
  return function()
    hl.dispatch(hl.dsp.layout("preselect " .. side))
    hl.dispatch(hl.dsp.exec_cmd("omarchy-launch-terminal"))
  end
end

local DIRECTIONS = {
  { key = "h", direction = "l" },
  { key = "j", direction = "d" },
  { key = "k", direction = "u" },
  { key = "l", direction = "r" },
  { key = "left", direction = "l" },
  { key = "down", direction = "d" },
  { key = "up", direction = "u" },
  { key = "right", direction = "r" },
}

-- Inside herdr / tmux the first jk is their prefix (Ctrl+B goes to the app) and
-- the "leader-mux" submap waits for a second jk to hand over to the window
-- leader instead. Any other key passes through to the app and closes the wait.
-- No catchall here: keyd sends the second jk as Ctrl/Alt/Shift/Super presses
-- before F13, and a catchall would treat those as "another key" and close the
-- wait before the leader bind could match. Real keys are listed instead.
hl.define_submap("leader-mux", function()
  hl.bind(LEADER, function()
    -- Cancel the prefix the app is now waiting on, then open the window leader.
    tap("", "Escape")
    hl.dispatch(hl.dsp.submap("leader"))
  end)
  local keys = {
    "return", "escape", "space", "tab", "backspace", "left", "down", "up", "right",
    "comma", "period", "slash", "semicolon", "apostrophe", "bracketleft", "bracketright",
    "minus", "equal", "grave", "backslash",
  }
  for c = ("a"):byte(), ("z"):byte() do
    table.insert(keys, string.char(c))
  end
  for digit = 0, 9 do
    table.insert(keys, tostring(digit))
  end
  for _, key in ipairs(keys) do
    hl.bind(key, hl.dsp.submap("reset"), { non_consuming = true, ignore_mods = true })
  end
end)

local mux_wait = 0

hl.bind(LEADER, function()
  if in_multiplexer() then
    tap("CTRL", "B")
    hl.dispatch(hl.dsp.submap("leader-mux"))
    -- Prefix chords are quick; a stale wait must not swallow a later jk.
    mux_wait = mux_wait + 1
    local mine = mux_wait
    hl.timer(function()
      if mine == mux_wait and hl.get_current_submap() == "leader-mux" then
        hl.dispatch(hl.dsp.submap("reset"))
      end
    end, { timeout = MUX_WINDOW, type = "oneshot" })
  else
    hl.dispatch(hl.dsp.submap("leader"))
  end
end, { description = "Window leader (jk)" })

-- One-shot: every action leaves the submap before running (the resize entry
-- switches to its own submap instead).
hl.define_submap("leader", function()
  local function bind(key, action)
    hl.bind(key, function()
      hl.dispatch(hl.dsp.submap("reset"))
      if type(action) == "function" then
        action()
      else
        hl.dispatch(action)
      end
    end)
  end

  for _, entry in ipairs(DIRECTIONS) do
    bind(entry.key, hl.dsp.focus({ direction = entry.direction }))
    bind("SHIFT + " .. entry.key, hl.dsp.window.swap({ direction = entry.direction }))
  end

  bind("d", split("r"))
  bind("SHIFT + d", split("d"))
  bind("t", hl.dsp.exec_cmd("omarchy-launch-terminal"))
  bind("return", hl.dsp.exec_cmd("omarchy-launch-terminal"))
  bind("x", hl.dsp.window.close())
  bind("w", hl.dsp.window.close())
  bind("z", hl.dsp.window.fullscreen({ mode = "maximized" }))
  bind("f", hl.dsp.window.float({ action = "toggle" }))
  bind("s", hl.dsp.layout("togglesplit"))
  bind("space", hl.dsp.exec_cmd("vicinae toggle"))

  for workspace = 1, 10 do
    local key = "code:" .. tostring(workspace + 9)
    bind(key, hl.dsp.focus({ workspace = tostring(workspace) }))
    bind("SHIFT + " .. key, hl.dsp.window.move({ workspace = tostring(workspace) }))
  end

  -- "r" steps through every workspace on the monitor, empty ones included;
  -- "e" only visits workspaces that already hold windows, so it never moved.
  for _, key in ipairs({ "q", "bracketleft" }) do
    bind(key, hl.dsp.focus({ workspace = "r-1" }))
  end
  for _, key in ipairs({ "e", "bracketright" }) do
    bind(key, hl.dsp.focus({ workspace = "r+1" }))
  end
  bind("tab", hl.dsp.focus({ workspace = "previous" }))

  hl.bind("SHIFT + r", hl.dsp.submap("leader-resize"))
  bind(LEADER, send_ctrl_b)
  hl.bind("catchall", hl.dsp.submap("reset"))
end)

-- Sticky: stays open until escape / return / the leader.
hl.define_submap("leader-resize", function()
  for _, entry in ipairs(DIRECTIONS) do
    local dx = (entry.direction == "l" and -RESIZE_STEP) or (entry.direction == "r" and RESIZE_STEP) or 0
    local dy = (entry.direction == "u" and -RESIZE_STEP) or (entry.direction == "d" and RESIZE_STEP) or 0
    hl.bind(entry.key, hl.dsp.window.resize({ x = dx, y = dy, relative = true }), { repeating = true })
  end

  hl.bind("escape", hl.dsp.submap("reset"))
  hl.bind("return", hl.dsp.submap("reset"))
  hl.bind(LEADER, hl.dsp.submap("reset"))
  hl.bind("catchall", hl.dsp.no_op())
end)
