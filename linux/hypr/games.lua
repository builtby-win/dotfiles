-- Game windows live on the gaming workspace, tiled; MapleStory goes fullscreen.
-- Installed to ~/.config/hypr/games.lua by scripts/setup-linux-desktop.sh and
-- loaded from bindings.lua with: require("hypr.games")
--
-- MapleStory and the Nexon launcher are Proton windows with the shared class
-- steam_app_default. Omarchy's Steam rule floats everything matching "steam", and a
-- floating MapleStory misplaces the cursor, so this tiles them instead. The title is
-- empty when the window maps, so the match has to be on the class.
--
-- Opening MapleStory switches to GAMING_WORKSPACE, where the Nexon launcher is.
--
-- The game window itself is made fullscreen as soon as its title appears. A tiled
-- window in the carousel sits at a shifting offset (and off-screen X coordinates while
-- it is not focused), which put MapleStory's cursor in the wrong place; a fullscreen
-- window is always at 0,0 and monitor-sized, so Wine's idea of the pointer matches.
-- The launcher keeps its normal tiled size. Leave fullscreen with Cmd+Ctrl+F.
--
-- Focus: the fullscreen game covers the whole monitor, so after alt-tabbing to another
-- window on its workspace the pointer is still over MapleStory, and follow_mouse hands
-- focus straight back on the first mouse move. Wine games also send activation requests
-- (focus_on_activate) whenever they like. Neither may pull focus; the game still gets
-- focus from a click, Cmd+Tab, or a workspace switch.
--
-- Pointer: confine_pointer keeps the cursor inside the focused game window, so a
-- sweep past the edge cannot reach the bar or dock; Cmd+Tab or switching workspace
-- releases it. XWayland/Wine games do not ask for a confinement themselves.

local GAMING_WORKSPACE = "2"

o.window({ class = "^steam_app_default$" }, {
  float = false,
  workspace = GAMING_WORKSPACE,
  no_follow_mouse = true,
  focus_on_activate = false,
  confine_pointer = true,
})

-- "default" handling (layout_aware = false) makes it a real fullscreen window instead
-- of the scrolling layout's own full-width column.
local function fullscreen_game(window)
  if window.class ~= "steam_app_default" or window.title ~= "MapleStory" then
    return
  end
  if window.fullscreen ~= 0 then
    return
  end
  hl.dispatch(hl.dsp.window.fullscreen({
    window = window,
    mode = "fullscreen",
    action = "set",
    layout_aware = false,
  }))
end

hl.on("window.open", fullscreen_game)
hl.on("window.title", fullscreen_game)
