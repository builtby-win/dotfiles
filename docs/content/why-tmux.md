# Why Every AI Developer Needs Tmux

**The missing piece in your AI-powered workflow**

---

## The problem

You kick off an AI agent. It needs a few minutes. So you switch to something else -- check a PR, read some docs, start a second agent in another tab.

The first agent finishes. Now what?

You're hunting through terminal tabs. Scanning window titles. Trying to remember which tab had the agent that was refactoring your auth module versus the one running tests.

Every time you context-switch to find a finished agent, you pay a tax. Not just the seconds it takes to locate the right window. The real cost is the mental break -- you were focused on something, and now you're playing air traffic controller.

With one agent, it's tolerable. With three agents across two projects? You've become a human scheduler, and that's the opposite of what AI tools are supposed to do for you.

---

## Tmux solves the container problem

Tmux is a terminal multiplexer. In plain English: it gives every task a permanent address.

Sessions for projects. Windows for contexts within a project. Panes for parallel work within a context. Your agents aren't floating in anonymous tabs -- they each have a fixed place in a hierarchy you control.

If your terminal crashes, tmux keeps running on the server side. Reconnect and everything is exactly where you left it. Your three agents are still in their panes, output intact.

This is what tabs should have been. A stable, persistent structure that doesn't depend on a single window staying open.

---

## Back2vibing solves the attention problem

Persistent panes are great. But you still have to remember that the auth refactor agent is in session "backend," window 2, pane 3. Scale that across projects and your brain becomes the router.

Back2vibing tracks which tmux pane each agent runs in. When an agent finishes, b2v restores focus to that exact pane -- the right session, the right window, the right pane.

Not a notification you have to act on. Not a badge you might miss. Your terminal is now showing you the finished result, in the pane where the work happened.

The loop becomes: start agent, do other work, agent finishes, you're looking at the result. Zero hunting. Zero tab-scanning. Zero mental overhead.

---

## The compound effect

One agent finishing is a ping. You can handle a ping.

Three agents finishing across different sessions over the span of ten minutes is chaos -- unless your tools handle the routing for you.

With tmux and back2vibing, running multiple agents feels like having multiple monitors for your attention. Each agent gets a dedicated space, and when it's ready, it pulls you in. You review, act on the result, and go back to what you were doing.

This isn't about being faster at terminal navigation. It's about removing the navigation entirely. You stop thinking about where things are and start thinking only about the work itself.

That's the compound effect: every agent you add makes the old tab-switching workflow exponentially worse, but adds near-zero overhead to the tmux + b2v workflow.

---

## Get started

Our recommended setup takes five minutes. We've published our dotfiles with a tmux config built specifically for this workflow -- session management, pane persistence, and all the keybindings tuned for agent-heavy development.

[Set up tmux for back2vibing in 5 minutes](https://back2vibing.com/blog/tmux-quickstart) -- from zero to running in one guide.

[See it in action](https://back2vibing.com/youtube/tmux-b2v) -- a walkthrough of the full workflow on YouTube.

Focus is the scarcest resource you have as a developer. Every tool in your stack should protect it. This setup does.
