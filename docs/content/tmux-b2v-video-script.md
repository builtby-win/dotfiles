# How I Use Tmux + Back2Vibing for AI-Powered Development

**Format:** YouTube screencast, ~8-10 minutes
**Tone:** Casual, "showing you my actual workflow" -- not a tutorial
**Recording:** Ghostty terminal, 1920x1080, font size large enough to read on mobile

---

## [0:00 - 0:30] Hook

**NARRATION:**
"I run multiple AI agents at once across different projects, and I never lose track of any of them. When one finishes, my terminal snaps right to it -- the exact pane, the exact session. No notifications, no hunting through tabs. Here's my entire setup."

**SCREEN:**
Quick montage (3-4 seconds each):
- Wide shot of tmux with 3 sessions visible in the status bar, agents running in split panes
- An agent finishes in a background session -- focus snaps to that session and pane automatically
- Cut to the result sitting right there, ready to review

**NOTE:** Record this montage last, after you've captured the rest of the video. Pull the best "focus snap" moments from the Section 5 recordings.

---

## [0:30 - 1:30] Morning Startup

**NARRATION:**
"So here's how my day starts. I open Ghostty, type `tmux`, and... everything's already here. All my sessions from yesterday, windows, panes, the whole layout. I didn't save anything manually -- tmux-resurrect and tmux-continuum handle that in the background. I pick up exactly where I left off."

(pause, point at window names)

"See how the window names aren't just `zsh` or `bash`? They show the project folder, or the git branch if I'm on a feature branch. So I can tell at a glance what's running where."

**SCREEN:**
1. Open Ghostty (clean, no tmux yet)
2. Type `tmux` and press Enter
3. Sessions restore -- multiple windows appear in the status bar
4. Slowly move between a few windows to show the names in the tab bar (e.g., `dotfiles`, `feat/auth`, `api-server`)
5. Hover or point out the status bar: `[session-name]:window:pane` on the left, window tabs in the center

**NOTE:** Before recording, make sure you have 3-4 sessions with real projects open, then kill the tmux server and restart so continuum restores them. The restore animation is the whole point of this section.

---

## [1:30 - 3:30] Project Switching with Sesh

**NARRATION:**
"The killer feature for managing all of this is the session picker. `Ctrl+b Space`."

(picker opens)

"This is sesh with fzf. I can press `j` and `k` to move through sessions, and each one shows a preview on the right -- what windows are open, what's running. If I have a lot of sessions, I press `/` to switch into search mode and just type what I'm looking for."

(demo search, select a session)

"But it gets better. Press `Ctrl+X` and now I'm browsing my zoxide directories -- that's every project I've visited recently, ranked by how often I go there. I pick one, sesh creates a brand new session for it, and I'm dropped right in."

(demo zoxide flow)

"And if a session is done and cluttering things up, I just press `x` to kill it. No confirmation dialogs, it's just gone."

(demo killing a session)

"Oh, and `Ctrl+b T` -- that's a quick toggle back to whatever session I was just in. Like Alt+Tab but for tmux sessions."

**SCREEN:**
1. Press `Ctrl+b Space` -- sesh picker popup appears (80% width, 70% height)
2. Navigate with `j`/`k` through 3-4 sessions, show the preview pane on the right
3. Press `/` to enable search, type a partial project name, select with Enter
4. Session switches -- point out window names updating in the status bar
5. Open picker again with `Ctrl+b Space`
6. Press `Ctrl+X` to switch to zoxide mode (prompt changes to folder icon)
7. Pick a directory that doesn't have an existing session
8. New session is created and attached automatically
9. Open picker one more time, press `x` on a throwaway session to kill it
10. Close picker, press `Ctrl+b T` to jump back to previous session

**NOTE:** Pre-create 3-4 sessions with real projects. Have at least one zoxide directory that doesn't already have a session so the "new session from directory" flow is visible. The header text in the picker shows all the keybindings -- let it be readable for a beat.

---

## [3:30 - 5:30] Kicking Off Agents

**NARRATION:**
"Alright, let's put some agents to work. I'll split this pane -- `Ctrl+b d` gives me a vertical split, side by side."

(split pane)

"I'll start an agent here on the right. Now I'll switch to a different session..."

(switch sessions)

"...split another pane, and kick off a second agent on a totally different project. Two agents, two projects, running in parallel. I can see both if I want, or just forget about them and keep working."

(start second agent)

"One more thing -- if I need to run a quick command without messing up my pane layout, `Ctrl+b g` pops open a floating terminal. It's an 80% overlay, I can do a `git status` or check something, then close it and everything underneath is untouched."

(demo floax)

**SCREEN:**
1. Start in a project session with a single pane
2. Press `Ctrl+b d` -- pane splits vertically (side by side)
3. In the new pane, start a b2v agent (e.g., `b2v run "refactor the auth middleware"`)
4. Press `Ctrl+b Space` or `Ctrl+b T` to switch to a different project session
5. Press `Ctrl+b d` again to split
6. Start another agent in this session
7. Switch back to the first session briefly to show both agents are running
8. Press `Ctrl+b g` -- floating terminal appears (magenta border, 80% size)
9. Run `git status` or `ls` in the floating terminal
10. Press `Ctrl+b g` again (or `exit`) to close the float -- underlying panes are unchanged

**NOTE:** Use real b2v agents if possible, or at least realistic-looking commands. The agents should be doing actual work that takes a few minutes so they're still running when we get to Section 5.

---

## [5:30 - 7:30] The Magic Moment -- Focus Restoration

**NARRATION:**
"Okay, this is why tmux plus back2vibing changes everything. I'm working over here in session A -- writing code, whatever. Meanwhile, the agent I started in session B just finished."

(focus snaps)

"See that? I didn't do anything. The moment the agent finished, back2vibing switched me to session B, to the exact pane where the agent was running. The output is right here. I can review it, accept the changes, whatever I need to do."

(review briefly, then switch back)

"Let me go back to what I was doing. And... there goes the other agent."

(focus snaps again)

"Same thing. Done means I'm looking at the result. No notification badge to notice, no 'which tab was that in' moment. It just works."

(one more snap if timing allows)

"This is the thing that sold me on the whole setup. You can run three, four, five agents at once, and you'll never miss one finishing. It's like having a team that taps you on the shoulder exactly when they need your attention."

**SCREEN:**
1. Be working in Session A -- typing in an editor or running a command, something that looks like real work
2. Agent in Session B finishes -- tmux automatically switches to Session B, exact pane
3. Pause for a beat so the viewer can see the switch happened. The status bar session name changes, the pane content shows the agent's output
4. Briefly review the output (scroll up a line or two)
5. Press `Ctrl+b T` to go back to Session A
6. Continue working for a few seconds
7. Agent in Session C (or another pane in B) finishes -- focus snaps again
8. Show the output, react naturally ("nice, that looks good")
9. Optionally: one more snap to drive the point home

**NOTE:** This is the money shot. Record multiple takes. The timing needs to feel natural -- you should look like you're genuinely working when the snap happens, not just staring at the screen waiting. If you can get three snaps in a row without it feeling staged, that's ideal. Consider starting the agents with staggered delays before recording this section so they finish at good intervals.

---

## [7:30 - 9:00] Power Tips

**NARRATION:**
"A few more things that make this setup great for daily use."

### Command Palette (~30s)

**NARRATION:**
"First -- I know I just rattled off a bunch of keybindings, but you don't need to memorize any of them. `Ctrl+b /` opens a command palette. It's a searchable list of every keybinding in the config. Just type what you want -- 'split', 'session', 'copy' -- and it shows you the shortcut and lets you run it directly."

**SCREEN:**
1. Press `Ctrl+b /` -- command palette popup appears
2. Type "split" -- filtered results show split-related commands with their keybindings
3. Select one to run it (e.g., split vertical)
4. Briefly show the result (new pane appeared)

### Tmux Fingers (~30s)

**NARRATION:**
"Next, tmux-fingers. See a git hash? A file path? A URL? Press `Ctrl+b f` and every copyable piece of text gets a little hint label. Type the hint and it's on your clipboard. Way faster than selecting text with your mouse."

**SCREEN:**
1. Make sure the terminal has some text with a git hash, a file path, and maybe a URL visible (run `git log --oneline -5` beforehand)
2. Press `Ctrl+b f` -- hint labels appear on copyable text
3. Type a hint to copy a git hash
4. Paste it somewhere to prove it worked

### URL Picker (~30s)

**NARRATION:**
"And last one -- `Ctrl+b u` opens the URL picker. It finds every URL in the current pane and lets you pick one to open in your browser. Really handy when an agent drops a PR link or a docs URL in its output."

**SCREEN:**
1. Make sure there's a URL visible in the pane (agent output with a GitHub link, or just `echo "https://github.com/builtby-win/dotfiles"`)
2. Press `Ctrl+b u` -- fzf popup lists all URLs found in the pane
3. Select one -- browser opens to that URL

**NOTE:** Keep each tip punchy. Don't explain every detail, just show the "wow that's useful" moment and move on. The command palette demo should be first since it's the safety net for everything else.

---

## [9:00 - 9:30] Outro

**NARRATION:**
"That's it. Tmux for persistent sessions and layout, sesh for fast project switching, and back2vibing for automatic focus when agents finish. Link to the dotfiles and a 5-minute setup guide are in the description. If you want to understand the 'why' behind all of this -- why tmux specifically, why it matters for AI development -- there's a blog post linked down there too. Thanks for watching."

**SCREEN:**
1. Show the terminal one more time with a few sessions open -- the "daily driver" look
2. Overlay or type out the URLs:
   - `github.com/builtby-win/dotfiles`
   - `back2vibing.com/blog/tmux-quickstart`
   - `back2vibing.com/blog/why-tmux`
3. End on the tmux status bar with a couple of sessions visible

**NOTE:** Keep it brief. Don't ask for likes/subscribes in the narration -- that can go in a pinned comment or end card instead.

---

## YouTube Description Template

```
How I Use Tmux + Back2Vibing for AI-Powered Development

I run multiple AI agents across different projects simultaneously and never lose track of any of them. This video walks through my actual daily workflow: session management with sesh, parallel agents in split panes, and automatic focus restoration when agents finish.

Dotfiles: https://github.com/builtby-win/dotfiles
5-Minute Setup Guide: https://back2vibing.com/blog/tmux-quickstart
Why Every AI Developer Needs Tmux: https://back2vibing.com/blog/why-tmux
Back2Vibing: https://back2vibing.com

Timestamps:
0:00 - Hook
0:30 - Morning startup (session restore)
1:30 - Project switching with sesh
3:30 - Kicking off agents
5:30 - Focus restoration (the magic moment)
7:30 - Power tips: command palette, tmux-fingers, URL picker
9:00 - Outro & links

Tools used: tmux, sesh, back2vibing, Ghostty, fzf
```

---

## Pre-Recording Checklist

- [ ] 3-4 real project sessions open in tmux (different repos, ideally with feature branches so window names are interesting)
- [ ] zoxide database has entries for at least one directory that doesn't have a tmux session yet
- [ ] b2v agents ready to run (pick tasks that take 2-5 minutes so timing is controllable)
- [ ] Terminal font size large enough to read at 1080p on a phone screen
- [ ] A URL visible somewhere in a pane for the URL picker demo
- [ ] Some git log output visible for the tmux-fingers demo
- [ ] Close any notifications / Do Not Disturb mode on
- [ ] Screen recording set to capture the full Ghostty window (no desktop clutter)
