# Tmux + B2V Content Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Write three content pieces (quickstart doc, YouTube video script, shortform "why tmux" post) as markdown files ready to copy into Notion.

**Architecture:** Three independent markdown files in `docs/content/`. Each follows the design in `docs/plans/2026-02-20-tmux-b2v-content-design.md`. Content references actual keybindings and commands from the dotfiles tmux config.

**Tech Stack:** Markdown, targeting Notion blog (builtby.win)

---

### Task 1: Create docs/content directory

**Files:**
- Create: `docs/content/.gitkeep`

**Step 1: Create the directory**

```bash
mkdir -p docs/content
```

**Step 2: Commit**

```bash
git add docs/content
git commit -m "chore: add docs/content directory for blog content"
```

---

### Task 2: Write the 5-Minute Quickstart Doc

**Files:**
- Create: `docs/content/tmux-quickstart.md`

**Reference files (read for accuracy):**
- `stow-packages/tmux/.tmux.conf` - keybindings, plugin list
- `stow-packages/tmux/.config/tmux/sesh-picker.sh` - sesh picker details

**Step 1: Write `docs/content/tmux-quickstart.md`**

The doc must include these sections in order:

1. **Title + subtitle** - "Set Up Tmux for Back2Vibing in 5 Minutes" / "Get persistent terminal sessions and automatic agent focus restoration"

2. **What you'll get** (2-3 sentences max)
   - Tmux keeps terminal sessions alive even if your terminal closes
   - Back2vibing uses tmux to snap focus back to the exact pane when an agent finishes
   - Placeholder note: `[GIF: agent finishes → focus snaps to pane]`

3. **Prerequisites** - bullet list:
   - macOS or Linux
   - Homebrew (macOS) or equivalent package manager
   - A terminal emulator (Ghostty recommended, iTerm2/Alacritty also work)

4. **Step 1: Install tmux and sesh** - code block:
   ```
   brew install tmux sesh
   ```

5. **Step 2: Clone and install the dotfiles** - code blocks:
   ```
   git clone https://github.com/builtby-win/dotfiles.git ~/dotfiles
   cd ~/dotfiles
   stow -d stow-packages -t ~ tmux
   ```
   Brief explanation: GNU Stow symlinks the config files to your home directory.

6. **Step 3: Install tmux plugins** - steps:
   - Install TPM: `git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm`
   - Open tmux: `tmux`
   - Press `Ctrl+b` then `I` (capital i) to install all plugins
   - Wait for "Done" message

7. **Step 4: Install back2vibing** - steps:
   - Install b2v CLI (link to b2v install docs)
   - Add shell hook to `.zshrc`: `eval "$(b2v shell-hook --shell zsh)"`
   - Restart shell or `source ~/.zshrc`

8. **5 Keybindings You Need** - table with 3 columns (Shortcut, What it does, When to use it):
   | Shortcut | What it does | When to use it |
   |---|---|---|
   | `Ctrl+b Space` | Open session picker | Switch between projects |
   | `Ctrl+b /` | Command palette | Forgot a keybinding? Search here |
   | `Ctrl+b d` | Split pane vertically | Run an agent side-by-side |
   | `Ctrl+b g` | Floating terminal | Quick command without leaving your pane |
   | `Ctrl+b T` | Jump to last session | Bounce between two projects |

9. **Verify it works** - numbered steps:
   1. Open tmux: `tmux`
   2. Split a pane: `Ctrl+b d`
   3. Start a b2v agent in one pane
   4. Switch to the other pane and work
   5. When the agent finishes, your focus should snap back to the agent's pane

10. **Next steps** - links:
    - "Why Every AI Developer Needs Tmux" (motivation)
    - "How I Use Tmux + Back2Vibing" YouTube video (see it in action)
    - Full keybinding reference: press `Ctrl+b /` inside tmux

**Step 2: Review the doc for accuracy**

Verify all keybindings match `.tmux.conf`. Specifically check:
- `Ctrl+b Space` → line 59 of `.tmux.conf` (sesh-picker.sh)
- `Ctrl+b /` → line 213 (command palette)
- `Ctrl+b d` → line 93 (split-window -h)
- `Ctrl+b g` → line 289 (@floax-bind 'g')
- `Ctrl+b T` → line 62 (sesh last)

**Step 3: Commit**

```bash
git add docs/content/tmux-quickstart.md
git commit -m "docs: add tmux quickstart guide for back2vibing"
```

---

### Task 3: Write the YouTube Video Script

**Files:**
- Create: `docs/content/tmux-b2v-video-script.md`

**Reference files (read for accuracy):**
- `stow-packages/tmux/.tmux.conf` - all keybindings shown on screen
- `stow-packages/tmux/.config/tmux/sesh-picker.sh` - sesh picker UI

**Step 1: Write `docs/content/tmux-b2v-video-script.md`**

Format: Each section has `[TIMESTAMP]`, `NARRATION:` (what to say), `SCREEN:` (what to show/do), and optional `NOTE:` (recording tips).

Structure:

**Title card:** "How I Use Tmux + Back2Vibing for AI-Powered Development"

**[0:00 - 0:30] Hook**
- NARRATION: "I run multiple AI agents at once across different projects, and I never lose track of any of them. When one finishes, my terminal snaps right to it. Here's my entire setup."
- SCREEN: Quick montage - multiple tmux panes with agents running, then focus snapping to a finished agent
- NOTE: Record the montage last, after the rest of the video

**[0:30 - 1:30] Morning startup**
- NARRATION: Explain opening Ghostty, typing `tmux`, seeing sessions restored from yesterday (tmux-resurrect + continuum). "I pick up exactly where I left off."
- SCREEN: Open terminal → `tmux` → sessions appear → show multiple windows/panes already there
- Show: window names are git-aware (branch names, project names)

**[1:30 - 3:30] Project switching with sesh**
- NARRATION: "The killer feature is the session picker." Explain `Ctrl+b Space` opens it. Walk through the UI: j/k to navigate, `/` to search, `Ctrl+X` for zoxide dirs, `x` to kill sessions.
- SCREEN: Open sesh picker → browse sessions → switch to different project → show window names update → open picker again → use zoxide to jump to a directory → new session created
- NOTE: Have 3-4 sessions pre-created with real projects

**[3:30 - 5:30] Kicking off agents**
- NARRATION: "Now let's put agents to work." Split panes (`Ctrl+b d`), start agents in different panes. Show floating terminal (`Ctrl+b g`) for a quick check without disrupting layout.
- SCREEN: Split pane → start agent → switch session → split pane → start another agent → pop open floax for a quick `git status` → close floax
- NOTE: Use real b2v agents, not fake ones

**[5:30 - 7:30] The magic moment - focus restoration**
- NARRATION: "This is why tmux + back2vibing changes everything." Working in one session, agent finishes in another, focus snaps to that pane. Show this 2-3 times. "No notifications to check, no tabs to hunt through. Done means you're looking at the result."
- SCREEN: Working in session A → agent in session B finishes → focus snaps to session B, exact pane → review result → switch back to session A → another agent finishes → snap again
- NOTE: This is the money shot. Record multiple takes.

**[7:30 - 9:00] Power tips**
- NARRATION: "A few more things that make this setup great."
- Show command palette (`Ctrl+b /`): "This is your cheat sheet. Forgot a keybinding? Search here."
- Show tmux-fingers (`Ctrl+b f`): "See a hash, URL, or path? Press Leader+f and type the hint to copy it."
- Show URL picker (`Ctrl+b u`): "All URLs in the pane, pick one to open."
- SCREEN: Demo each feature in ~30s

**[9:00 - 9:30] Outro**
- NARRATION: "Link to the dotfiles in the description. There's a 5-minute setup guide on our blog that gets you from zero to this exact setup. If you want to understand why tmux matters for AI development, that post is linked too."
- SCREEN: Show the blog URL, dotfiles repo URL

**YouTube description template** (include at bottom of doc):
- Video title
- Links: dotfiles repo, quickstart guide, "why tmux" post
- Timestamps matching the script
- Brief description (2-3 sentences)

**Step 2: Commit**

```bash
git add docs/content/tmux-b2v-video-script.md
git commit -m "docs: add tmux + b2v YouTube video script"
```

---

### Task 4: Write the "Why Tmux" Shortform Post

**Files:**
- Create: `docs/content/why-tmux.md`

**Step 1: Write `docs/content/why-tmux.md`**

~600 words. Short paragraphs. Punchy. No code blocks (this is persuasive, not instructional).

Structure:

**Title:** "Why Every AI Developer Needs Tmux"
**Subtitle:** "The missing piece in your AI-powered workflow"

**Section 1: The problem** (~120 words)
- You kick off an AI agent. It takes a few minutes. You switch to something else.
- Agent finishes. Now what?
- You're hunting through terminal tabs. Checking notifications. Scrolling through windows.
- Every time you context-switch to find a finished agent, you pay a tax. Not just the seconds it takes - the mental cost of breaking focus.
- With one agent, it's tolerable. With three agents across two projects? You've become a human scheduler.

**Section 2: Tmux solves the container problem** (~120 words)
- Tmux is a terminal multiplexer. In plain English: it gives every task a permanent address.
- Sessions for projects. Windows for contexts. Panes for parallel work.
- If your terminal crashes, tmux keeps running. Reconnect and everything is still there.
- Your agents don't live in tabs that can be closed. They live in tmux panes that persist.

**Section 3: Back2vibing solves the attention problem** (~120 words)
- Persistent panes are great, but you still have to remember where each agent is.
- Back2vibing tracks which tmux pane each agent runs in. When an agent finishes, b2v restores focus to that exact pane.
- Not a notification. Not a badge. Your terminal is now showing you the result, in the pane where the work happened.
- The loop becomes: start agent → do other work → agent finishes → you're looking at the result. Zero hunting.

**Section 4: The compound effect** (~120 words)
- One agent finishing is a ping. Three agents finishing across different sessions is chaos - unless your tools handle the routing for you.
- With tmux + back2vibing, running multiple agents feels like having multiple monitors for your attention. Each agent gets a dedicated space, and when it's ready, it pulls you in.
- This isn't about being faster at terminal navigation. It's about removing the navigation entirely.

**Section 5: Get started** (~100 words)
- Our recommended setup takes 5 minutes. We've published our dotfiles with a tmux config built for this workflow.
- Link to quickstart guide
- Link to video demo
- Closing line: something about focus being the scarcest resource for developers, and this setup protects it.

**Step 2: Commit**

```bash
git add docs/content/why-tmux.md
git commit -m "docs: add 'why every AI developer needs tmux' post"
```

---

### Task 5: Add cross-links between all three docs

**Files:**
- Modify: `docs/content/tmux-quickstart.md`
- Modify: `docs/content/tmux-b2v-video-script.md`
- Modify: `docs/content/why-tmux.md`

**Step 1: Verify cross-links exist**

Check that:
- Quickstart links to "Why Tmux" and the video
- Video script's YouTube description links to quickstart and "Why Tmux"
- "Why Tmux" links to quickstart and video

If any are missing, add them.

**Step 2: Commit (if changes were needed)**

```bash
git add docs/content/
git commit -m "docs: add cross-links between tmux content pieces"
```

---

### Task 6: Final review and push

**Step 1: Review all three files**

Read each file end-to-end. Check for:
- Keybinding accuracy (cross-reference with `.tmux.conf`)
- Consistent terminology (Leader vs Ctrl+b - use `Ctrl+b` for beginners)
- Tone matches design: quickstart=direct, video=casual, why-tmux=persuasive
- No broken placeholder links
- Cross-links are consistent

**Step 2: Commit any fixes**

```bash
git add docs/content/
git commit -m "docs: polish tmux content pieces"
```

**Step 3: Push**

```bash
git push
```
