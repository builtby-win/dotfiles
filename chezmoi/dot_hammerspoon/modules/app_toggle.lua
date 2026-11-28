local M = {}

-- Hide the app if it is frontmost, otherwise bring it forward (launching if needed).
function M.toggle(bundleID)
  local front = hs.application.frontmostApplication()
  if front and front:bundleID() == bundleID then
    front:hide()
  else
    -- No accessibility queries (mainWindow/allWindows): they block the main
    -- thread for seconds on apps with a slow AX tree (Rex hits a 3s timeout).
    local app = hs.application.get(bundleID)
    if app then
      app:unhide()
      app:activate()
    else
      hs.application.launchOrFocusByBundleID(bundleID)
    end
  end
end

-- Binds `hyper + key` for each { key, bundle } pair.
function M.bind(mods, apps)
  for _, app in ipairs(apps) do
    hs.hotkey.bind(mods, app.key, function() M.toggle(app.bundle) end)
  end
end

return M
