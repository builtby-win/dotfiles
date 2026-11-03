-- Thin wrapper over the mimi CLI (https://github.com/y3owk1n/mimi).
local M = {}

local CANDIDATES = {
  '/opt/homebrew/bin/mimi',
  '/usr/local/bin/mimi',
  '/Applications/Mimi.app/Contents/MacOS/mimi',
}

local path
local running = {} -- keep hs.task objects alive until they finish

local function resolve()
  if path then return path end
  for _, candidate in ipairs(CANDIDATES) do
    if hs.fs.attributes(candidate) then
      path = candidate
      return path
    end
  end
  hs.alert.show('mimi not found: brew install --cask y3owk1n/tap/mimi')
end

-- Run `mimi <args...>` without blocking. callback(exitCode, stdout) is optional.
function M.run(args, callback)
  local bin = resolve()
  if not bin then return end

  local task
  task = hs.task.new(bin, function(code, stdout)
    running[task] = nil
    if callback then callback(code, stdout) end
  end, args)
  running[task] = true
  task:start()
end

return M
