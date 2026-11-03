-- Menu bar item listing the Spaces mimi switches between: "1 [2] 4" means Spaces
-- 1, 2 and 4 hold windows and 2 is active. The active Space is always listed.
local mimi = require('modules.mimi')

local M = {}

local MAX_SPACES = 10
local item = hs.menubar.new()
local pending = false

local function render(json)
  local ok, data = pcall(hs.json.decode, json)
  if not ok or type(data) ~= 'table' or type(data.spaces) ~= 'table' then return end

  local parts = {}
  for _, space in ipairs(data.spaces) do
    if space.index <= MAX_SPACES then
      if space.visible then
        parts[#parts + 1] = '[' .. space.index .. ']'
      elseif #space.windows > 0 then
        parts[#parts + 1] = tostring(space.index)
      end
    end
  end
  item:setTitle(table.concat(parts, ' '))
end

-- Coalesce bursts of events (a window opening raises several) into one query.
function M.refresh()
  if pending then return end
  pending = true
  hs.timer.doAfter(0.15, function()
    pending = false
    mimi.run({ 'query', 'spaces' }, function(code, stdout)
      if code == 0 then render(stdout) end
    end)
  end)
end

function M.start()
  local events = hs.window.filter
  events.default:subscribe({
    events.windowCreated,
    events.windowDestroyed,
    events.windowFocused,
  }, M.refresh)
  M.watcher = hs.spaces.watcher.new(M.refresh):start()
  M.refresh()
end

return M
