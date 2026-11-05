local M = {}

-- Hide the app if it is frontmost, otherwise bring it forward (launching if needed).
function M.toggle(bundleID)
  local front = hs.application.frontmostApplication()
  if front and front:bundleID() == bundleID then
    front:hide()
  else
    hs.application.launchOrFocusByBundleID(bundleID)
  end
end

-- Binds `hyper + key` for each { key, bundle } pair.
function M.bind(mods, apps)
  for _, app in ipairs(apps) do
    hs.hotkey.bind(mods, app.key, function() M.toggle(app.bundle) end)
  end
end

return M
