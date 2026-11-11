-- Workspaces on a single macOS Space, by hiding apps.
--
-- macOS cannot park a window fully off-screen (AeroSpace, Rift and Paneru all
-- leave a sliver), but it can hide an app. So a workspace is a set of apps:
-- switching hides every app assigned elsewhere and unhides the target's apps.
-- Granularity is per app, not per window.
--
-- Activation policy: an app activated from outside the leader (Cmd+Tab, Dock,
-- a notification) switches to the workspace that owns it, as AeroSpace does. An
-- app seen for the first time joins the current workspace.
local M = {}

local STORE = 'builtby.workspaces'
local COUNT = 9

-- Apps that float above every workspace: never hidden, never assigned.
local EXEMPT = {
  ['org.hammerspoon.Hammerspoon'] = true,
  ['com.apple.finder'] = true,
  ['com.apple.systempreferences'] = true,
  ['com.apple.Spotlight'] = true,
  ['com.raycast.macos'] = true,
  ['com.back2vibing.native'] = true,
}

local saved = hs.settings.get(STORE) or {}
local state = {
  current = saved.current or 1,
  previous = saved.previous,
  assign = saved.assign or {}, -- bundle id -> workspace number
  last = saved.last or {}, -- tostring(workspace) -> bundle id focused last
}

local switching = false
local watcher

-- Set by the UI: called after the current workspace or its apps change.
M.onChange = function() end

M.COUNT = COUNT

local function save()
  hs.settings.set(STORE, state)
end

local function managed(app)
  local id = app and app:bundleID()
  return id ~= nil and app:kind() == 1 and not EXEMPT[id]
end

local function runningManaged()
  local apps = {}
  for _, app in ipairs(hs.application.runningApplications()) do
    if managed(app) then table.insert(apps, app) end
  end
  return apps
end

local function claimUnassigned(workspace)
  for _, app in ipairs(runningManaged()) do
    local id = app:bundleID()
    if not state.assign[id] then state.assign[id] = workspace end
  end
end

local function appsIn(workspace)
  local apps = {}
  for _, app in ipairs(runningManaged()) do
    if state.assign[app:bundleID()] == workspace then table.insert(apps, app) end
  end
  return apps
end

-- Hide everything assigned elsewhere, unhide the current workspace, and focus
-- the app that was frontmost there last.
local function apply(activate)
  switching = true
  for _, app in ipairs(runningManaged()) do
    local workspace = state.assign[app:bundleID()]
    if workspace == state.current then
      app:unhide()
    elseif workspace then
      app:hide()
    end
  end

  if activate then
    local id = state.last[tostring(state.current)]
    local target = id and state.assign[id] == state.current and hs.application.get(id)
    target = target or appsIn(state.current)[1]
    if target then target:activate() end
  end
  hs.timer.doAfter(0.5, function() switching = false end)
end

function M.current()
  return state.current
end

function M.switch(workspace)
  if workspace < 1 or workspace > COUNT then return end
  if workspace ~= state.current then
    claimUnassigned(state.current)
    state.previous = state.current
    state.current = workspace
  end
  apply(true)
  save()
  M.onChange()
end

function M.last()
  if state.previous then M.switch(state.previous) end
end

-- Steps through the workspaces that hold apps (plus the current one).
function M.step(delta)
  local visited = {}
  for workspace = 1, COUNT do
    if workspace == state.current or #appsIn(workspace) > 0 then
      table.insert(visited, workspace)
    end
  end
  for index, workspace in ipairs(visited) do
    if workspace == state.current then
      M.switch(visited[(index - 1 + delta) % #visited + 1])
      return
    end
  end
end

-- Assign the frontmost app to a workspace; it leaves view if that is not the
-- current one.
function M.move(workspace)
  local app = hs.application.frontmostApplication()
  if not managed(app) or workspace < 1 or workspace > COUNT then return end
  state.assign[app:bundleID()] = workspace
  apply(true)
  save()
  M.onChange()
end

function M.showAll()
  for _, app in ipairs(runningManaged()) do
    app:unhide()
  end
end

-- { current = n, items = { [n] = { 'App', ... } } }
function M.snapshot()
  local items = {}
  for workspace = 1, COUNT do
    items[workspace] = {}
    for _, app in ipairs(appsIn(workspace)) do
      table.insert(items[workspace], app:name())
    end
  end
  return { current = state.current, items = items }
end

local function onApplication(_, event, app)
  if event ~= hs.application.watcher.activated or switching or not managed(app) then return end

  local id = app:bundleID()
  local workspace = state.assign[id] or state.current
  state.assign[id] = workspace
  state.last[tostring(workspace)] = id
  if workspace ~= state.current then
    M.switch(workspace)
  else
    save()
  end
end

function M.start()
  claimUnassigned(state.current)
  apply(false)
  save()
  watcher = hs.application.watcher.new(onApplication)
  watcher:start()
  -- Never leave apps hidden when Hammerspoon quits or reloads.
  hs.shutdownCallback = M.showAll
end

return M
