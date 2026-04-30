local M = {}

local function send(mods, key)
  hs.eventtap.keyStroke(mods, key, 0)
end

local function runSequence(steps, delay)
  local stepIndex = 1
  local interval = delay or 0.1
  local timer

  timer = hs.timer.doEvery(interval, function()
    local step = steps[stepIndex]

    if step == nil then
      timer:stop()
      return
    end

    send(step.mods, step.key)
    stepIndex = stepIndex + 1
  end)
end

function M.fourPane()
  hs.application.launchOrFocus('Ghostty')

  hs.timer.doAfter(0.35, function()
    runSequence({
      { mods = { 'cmd' }, key = 'd' },
      { mods = { 'cmd', 'shift' }, key = 'd' },
      { mods = { 'cmd', 'alt' }, key = 'left' },
      { mods = { 'cmd', 'shift' }, key = 'd' },
    }, 0.09)
  end)
end

return M
