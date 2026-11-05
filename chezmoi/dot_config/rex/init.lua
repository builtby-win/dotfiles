-- Local macOS workflow. Rex owns splits; these do not send tmux prefixes.
-- After editing: rex config check && rex config reload
-- App-level shortcuts override this file; inspect Change Shortcut… if needed.

rex.bind("cmd+d", "pane.split", { direction = "right" })
rex.bind("cmd+shift+d", "pane.split", { direction = "down" })
rex.bind("cmd+shift+enter", "pane.zoom")
rex.bind("cmd+ctrl+=", "pane.balance")

for key, direction in pairs({
  left = "left", right = "right", up = "up", down = "down",
  h = "left", l = "right", k = "up", j = "down",
}) do
  rex.bind("cmd+alt+" .. key, "pane.focus", { direction = direction })
end

rex.bind("cmd+t", "client.tab.new")
rex.bind("cmd+n", "client.window.new")
rex.bind("ctrl+tab", "client.tab.next")
rex.bind("ctrl+shift+tab", "client.tab.previous")
rex.bind("cmd+shift+[", "client.tab.previous")
rex.bind("cmd+shift+]", "client.tab.next")
-- Cmd+1..9 jumps to a session, matching Herdr's switch_workspace.
-- Tabs are Leader+1..9 (see below).
for index = 1, 9 do
  rex.bind("cmd+" .. index, "session_goto", { index = index })
end

rex.bind("cmd+shift+p", "client.palette.toggle")
rex.bind("cmd+f", "client.find.open")
rex.bind("cmd+,", "client.settings")

-- Readline/zsh editing; applications such as Vim may interpret these differently.
rex.bind("cmd+backspace", "pane.send_key", { key = "ctrl+u" })
rex.bind("alt+backspace", "pane.send_key", { key = "ctrl+w" })
rex.bind("alt+left", "pane.send_key", { key = "alt+b" })
rex.bind("alt+right", "pane.send_key", { key = "alt+f" })
rex.bind("cmd+left", "pane.send_key", { key = "ctrl+a" })
rex.bind("cmd+right", "pane.send_key", { key = "ctrl+e" })
-- AI CLI clipboard-image input (the CLI must support Ctrl+V).
rex.bind("cmd+shift+v", "pane.send_key", { key = "ctrl+v" })

-- ---------------------------------------------------------------------------
-- Leader keys mirror chezmoi/dot_config/herdr/config.toml one-for-one.
-- Herdr workspace = Rex session, tab = tab, pane = pane.
-- ---------------------------------------------------------------------------

local HOME = os.getenv("HOME")
local BIN = HOME .. "/.local/bin/"
local SHELL_FLAVOR = "com.superlogical.terminal.shell"
local TERMINAL = "com.superlogical.terminal"
local STATE_DIR = HOME .. "/.local/state/rex"
local RECENT = STATE_DIR .. "/recent-sessions.json"

local function check(result, err)
  if err ~= nil then error(err, 0) end
  return result
end

-- Floating terminal over the current tab. It closes when its program exits.
local function float(label, command, opts)
  opts = opts or {}
  return check(rex.session.new_layer{
    bounds = opts.bounds or { 0.08, 0.08, 0.84, 0.84 },
    focus = true,
    layout = { block = {
      flavor = SHELL_FLAVOR,
      label = label,
      options = { command = command, cwd = opts.cwd },
    } },
  })
end

local function focused_cwd(ctx)
  if not ctx.block_id then return nil end
  local proc = rex.block.call(TERMINAL, "process", { block_id = ctx.block_id }) or {}
  return (proc.foreground or proc.child or {}).cwd
end

-- Most recently used sessions, newest first. Rex has no "last session"
-- action, so the leader key records the session it was pressed in.
local function recent_sessions()
  local f = io.open(RECENT, "r")
  if not f then return {} end
  local list = rex.json.decode(f:read("*a"))
  f:close()
  return type(list) == "table" and list or {}
end

local function remember(session_id)
  if not session_id then return end
  local list = { session_id }
  for _, id in ipairs(recent_sessions()) do
    if id ~= session_id and #list < 50 then list[#list + 1] = id end
  end
  local f = io.open(RECENT, "w")
  if not f then
    rex.exec({ "mkdir", "-p", STATE_DIR })
    f = io.open(RECENT, "w")
  end
  if f then
    f:write(rex.json.encode(list))
    f:close()
  end
end

local function go_to_session(ctx, session_id)
  remember(ctx.session_id)
  remember(session_id)
  rex.client.queue("session.select", { session_id = session_id })
end

rex.action{
  name = "leader_key",
  title = "Leader Key",
  run = function(ctx)
    pcall(remember, ctx.session_id)
    rex.client.queue("client.mode.enter", { name = "leader", once = true })
  end,
}

rex.action{
  name = "session_last",
  title = "Go to Last Session",
  run = function(ctx)
    local live = {}
    for _, s in ipairs(check(rex.call("session.list")).sessions or {}) do
      live[s.session_id] = true
    end
    for _, id in ipairs(recent_sessions()) do
      if id ~= ctx.session_id and live[id] then return go_to_session(ctx, id) end
    end
  end,
}

rex.action{
  name = "session_goto",
  title = "Go to Session by Number",
  args = { index = "integer" },
  run = function(ctx, args)
    local session = (check(rex.call("session.list")).sessions or {})[args.index]
    if session then go_to_session(ctx, session.session_id) end
  end,
}

-- Herdr's close-pane modal: close at once unless an agent is working or
-- blocked, then ask first. Closing the last pane closes the tab.
rex.action{
  name = "pane_close_confirm",
  title = "Close Pane (Confirm if Busy)",
  run = function(ctx)
    if not ctx.block_id then error("no focused pane", 0) end
    local status = rex.block.call(TERMINAL, "program_status", { block_id = ctx.block_id }) or {}
    for _, record in ipairs(status.records or {}) do
      if record.state == "working" or record.state == "blocked" then
        float("close pane?", { BIN .. "rex-confirm-close", ctx.session_id, ctx.block_id }, {
          bounds = { 0.3, 0.38, 0.4, 0.24 },
        })
        return
      end
    end
    check(rex.call("block.close", { session_id = ctx.session_id, block_id = ctx.block_id }))
  end,
}

rex.action{
  name = "tab_close",
  title = "Close Tab",
  run = function()
    check(rex.session.close_window{})
  end,
}

-- Swap the focused pane with the next or previous pane in layout order.
rex.action{
  name = "pane_swap",
  title = "Swap Pane",
  args = { step = "integer" },
  run = function(ctx, args)
    for _, window in ipairs(check(rex.session.view{}).windows or {}) do
      for _, layer in ipairs(window.layers or {}) do
        local blocks = layer.blocks or {}
        for i, block in ipairs(blocks) do
          if block.block_id == ctx.block_id then
            if #blocks < 2 then return end
            local other = blocks[(i - 1 + args.step) % #blocks + 1]
            check(rex.session.swap_blocks{ block_id = ctx.block_id, other_block_id = other.block_id })
            return
          end
        end
      end
    end
  end,
}

rex.action{
  name = "switcher",
  title = "Switch Session or Tab…",
  keywords = "session tab workspace picker fzf",
  run = function(ctx)
    float("switcher", { BIN .. "rex-switch", ctx.client_id })
  end,
}

rex.action{
  name = "worktree_new",
  title = "New Worktree Session…",
  keywords = "git worktree branch workspace",
  run = function(ctx)
    float("new worktree", { BIN .. "rex-new-worktree", focused_cwd(ctx) or HOME, ctx.client_id }, {
      bounds = { 0.2, 0.15, 0.6, 0.6 },
    })
  end,
}

rex.action{
  name = "scrollback_edit",
  title = "Edit Scrollback in $EDITOR",
  run = function(ctx)
    if not ctx.block_id then error("no focused pane", 0) end
    float("scrollback", {
      "sh", "-c",
      'f=$(mktemp -t rex-scrollback) && rex capture -s "$1" -b "$2" > "$f" && "${EDITOR:-nvim}" + "$f"; rm -f "$f"',
      "rex-scrollback", ctx.session_id, ctx.block_id,
    }, { bounds = { 0.02, 0.02, 0.96, 0.96 } })
  end,
}

rex.action{
  name = "lazygit",
  title = "Lazygit",
  run = function(ctx)
    float("lazygit", { "lazygit" }, { cwd = focused_cwd(ctx), bounds = { 0.02, 0.02, 0.96, 0.96 } })
  end,
}

rex.action{
  name = "keys_help",
  title = "Show Key Bindings",
  run = function()
    float("keys", { "sh", "-c", "rex keymap | less" })
  end,
}

-- Resize mode (Herdr prefix+shift+r): hjkl/arrows resize, shift for big steps.
rex.mode("resize", { exclusive = true })
for key, direction in pairs({
  h = "left", j = "down", k = "up", l = "right",
  left = "left", down = "down", up = "up", right = "right",
}) do
  rex.bind("resize/" .. key, "pane.resize", { direction = direction })
  rex.bind("resize/shift+" .. key, "pane.resize", { direction = direction, amount = 15 })
end
rex.bind("resize/=", "pane.balance")
rex.bind("resize/enter", "client.mode.exit")

-- Ctrl+B (or Karabiner j+k), then one command. Escape cancels.
rex.mode("leader", { exclusive = true })
rex.bind("ctrl+b", "leader_key")
rex.bind("leader/ctrl+b", "pane.send_key", { key = "ctrl+b" })

-- Tabs
rex.bind("leader/t", "client.tab.new")
rex.bind("leader/q", "client.tab.previous")
rex.bind("leader/e", "client.tab.next")
for index = 1, 9 do
  rex.bind("leader/" .. index, "client.tab.goto", { index = index })
end
rex.bind("leader/shift+x", "tab_close")

-- Sessions (Herdr workspaces)
rex.bind("leader/[", "session.previous")
rex.bind("leader/up", "session.previous")
rex.bind("leader/]", "session.next")
rex.bind("leader/down", "session.next")
rex.bind("leader/tab", "session_last")
rex.bind("leader/shift+n", "session.new")
rex.bind("leader/n", "worktree_new")
rex.bind("leader/shift+w", "session.close")
rex.bind("leader/space", "switcher")
rex.bind("leader/g", "switcher")
rex.bind("leader/f", "session.switch")

-- Panes
rex.bind("leader/d", "pane.split", { direction = "right" })
rex.bind("leader/shift+d", "pane.split", { direction = "down" })
for key, direction in pairs({
  h = "left", j = "down", k = "up", l = "right", left = "left", right = "right",
}) do
  rex.bind("leader/" .. key, "pane.focus", { direction = direction })
end
for key, direction in pairs({ h = "left", j = "down", k = "up", l = "right" }) do
  rex.bind("alt+" .. key, "pane.focus", { direction = direction })
end
rex.bind("leader/w", "pane_close_confirm")
rex.bind("leader/x", "pane_close_confirm")
rex.bind("leader/z", "pane.zoom")
rex.bind("leader/shift+.", "pane_swap", { step = 1 })
rex.bind("leader/shift+,", "pane_swap", { step = -1 })
rex.bind("leader/b", "pane.balance")
rex.bind("leader/shift+r", "client.mode.enter", { name = "resize" })

-- Tools
rex.bind("leader/shift+e", "scrollback_edit")
rex.bind("leader/alt+g", "lazygit")
rex.bind("leader/r", "client.config.reload")
rex.bind("leader/s", "client.settings")
rex.bind("leader/shift+b", "client.sidebar.toggle")
rex.bind("leader/p", "client.palette.toggle")
rex.bind("leader/shift+/", "keys_help")
