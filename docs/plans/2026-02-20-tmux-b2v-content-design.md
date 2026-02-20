# Tmux + Back2Vibing Content Design

## Overview

Three pieces of content for the builtby.win marketing site that explain how to use tmux with back2vibing, targeting tmux beginners.

## Piece 1: "5-Minute Setup" Quickstart (Docs)

**Title:** "Set Up Tmux for Back2Vibing in 5 Minutes"
**Format:** Docs page / blog post in Notion
**Tone:** Direct, minimal, "just get me running"

### Sections

1. **What you'll get** - 2-3 sentences: tmux keeps terminal sessions alive, b2v uses it to snap focus back to the exact agent pane when work finishes. Before/after visual placeholder.
2. **Prerequisites** - macOS/Linux, Homebrew (or equivalent), Ghostty/iTerm2/any terminal
3. **Install tmux + sesh** - `brew install tmux sesh`
4. **Clone & stow the dotfiles** - `git clone`, `stow -d stow-packages -t ~ tmux zsh`
5. **Install tmux plugins** - Open tmux, hit `Leader + I` for TPM
6. **Install back2vibing** - `b2v` CLI install, shell hook setup
7. **5 keybindings you need to know** - Table:
   - `Ctrl+b Space` - Session picker
   - `Ctrl+b /` - Command palette (cheat sheet)
   - `Ctrl+b d` - Split vertical
   - `Ctrl+b g` - Floating terminal
   - `Ctrl+b T` - Jump to last session
8. **Verify it works** - Start an agent, switch panes, confirm focus restoration
9. **Next steps** - Link to "Why Tmux" post and "Day in the Life" video

## Piece 2: "Day in the Life" YouTube Video Script

**Title:** "How I Use Tmux + Back2Vibing for AI-Powered Development"
**Format:** ~8-10 minute screencast with voiceover
**Tone:** Casual, "showing you my actual workflow", not a tutorial

### Script Outline

1. **[0:00] Hook** (30s) - "I run 3 AI agents at once and never lose track of any of them. Here's my setup."
2. **[0:30] Morning setup** (1min) - Open Ghostty, `tmux` auto-attaches. Sesh restores yesterday's sessions via tmux-resurrect/continuum.
3. **[1:30] Project switching with sesh** (2min) - `Leader + Space` to open picker. Switch between projects. Zoxide integration (`Ctrl+X`). Git-aware window names updating.
4. **[3:30] Kicking off agents** (2min) - Split panes, start b2v agents in different panes across sessions. Floating terminal (`Leader + g`) for quick commands.
5. **[5:30] The magic moment** (2min) - Working in one session, agent finishes in another -> b2v snaps focus to exact pane. Show 2-3 times.
6. **[7:30] Power tips** (1.5min) - Command palette (`Leader + /`), tmux-fingers (`Leader + f`), URL picker (`Leader + u`).
7. **[9:00] Outro** (30s) - "Link to dotfiles in description, 5-minute setup guide on our blog."

## Piece 3: "Why Tmux" (Doc / Shortform)

**Title:** "Why Every AI Developer Needs Tmux"
**Format:** Short-form blog post (~600 words), doubles as Twitter/LinkedIn thread or short video script
**Tone:** Persuasive, punchy, short paragraphs

### Sections

1. **The problem** - You kick off an AI agent, switch tasks, agent finishes, now you're hunting through tabs and notifications. Context switch tax.
2. **Tmux solves the container problem** - Sessions persist, panes are addressable, agents get stable homes, survives terminal crashes.
3. **B2V solves the attention problem** - Agent finishes -> b2v knows exact tmux pane -> snaps focus there. No hunting, no notification fatigue.
4. **The compound effect** - One agent is manageable. Three agents across two projects without tmux + b2v = human scheduler. With them = automatic.
5. **Get started** - Link to 5-minute setup guide.

## Cross-linking

All three pieces link to each other:
- Quickstart links to "Why Tmux" (for motivation) and "Day in the Life" video (to see it in action)
- Video description links to quickstart (to set up) and "Why Tmux" (to share)
- "Why Tmux" links to quickstart (CTA)

## Deliverables

Since the blog is Notion-driven, deliverables are markdown files in the repo that get copied to Notion:
- `docs/content/tmux-quickstart.md` - Piece 1
- `docs/content/tmux-b2v-video-script.md` - Piece 2
- `docs/content/why-tmux.md` - Piece 3

## Key B2V Feature to Highlight

Back2vibing's tmux integration: when an agent finishes, b2v restores focus to the exact tmux pane where that agent was running. Session restoration to the exact agent.

## Dotfiles Positioning

The dotfiles repo is positioned as the recommended starter config. Users clone it, stow the tmux package, and get a fully configured tmux setup optimized for b2v.
