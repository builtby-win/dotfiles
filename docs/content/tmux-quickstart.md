# Set Up Tmux for Back2Vibing in 5 Minutes

**Get persistent terminal sessions and automatic agent focus restoration.**

---

## What you'll get

Tmux keeps your terminal sessions alive even if your terminal window closes or your SSH connection drops. Back2vibing uses tmux to snap focus back to the exact pane where an agent was running the moment it finishes -- so you never miss output or waste time hunting for the right window.

`[GIF: agent finishes -> focus snaps to pane]`

---

## Prerequisites

- macOS or Linux
- Homebrew (macOS) or equivalent package manager
- A terminal emulator (Ghostty recommended, iTerm2/Alacritty also work)

---

## Step 1: Install tmux and sesh

```bash
brew install tmux sesh
```

`sesh` is a session manager that makes switching between tmux sessions fast and frictionless.

---

## Step 2: Clone and install the dotfiles

```bash
git clone https://github.com/builtby-win/dotfiles.git ~/dotfiles
cd ~/dotfiles
stow -d stow-packages -t ~ tmux
```

This uses [GNU Stow](https://www.gnu.org/software/stow/) to symlink the tmux config files into your home directory. Your existing files won't be overwritten -- Stow will warn you if there's a conflict.

---

## Step 3: Install tmux plugins

1. Install TPM (Tmux Plugin Manager):

   ```bash
   git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
   ```

2. Start tmux:

   ```bash
   tmux
   ```

3. Press `Ctrl+b` then `I` (capital I) to install all plugins.

4. Wait for the "Done" message at the bottom of the screen.

---

## Step 4: Install back2vibing

1. Install the b2v CLI: [b2v install docs](https://back2vibing.com/docs/install)

2. Add the shell hook to your `.zshrc`:

   ```bash
   eval "$(b2v shell-hook --shell zsh)"
   ```

3. Restart your shell or reload the config:

   ```bash
   source ~/.zshrc
   ```

---

## 5 Keybindings You Need

| Shortcut | What it does | When to use it |
|---|---|---|
| `Ctrl+b Space` | Open session picker | Switch between projects |
| `Ctrl+b /` | Command palette | Forgot a keybinding? Search here |
| `Ctrl+b d` | Split pane vertically | Run an agent side-by-side |
| `Ctrl+b g` | Floating terminal | Quick command without leaving your pane |
| `Ctrl+b T` | Jump to last session | Bounce between two projects |

---

## Verify it works

1. Open tmux: `tmux`
2. Split a pane: `Ctrl+b d`
3. Start a b2v agent in one pane
4. Switch to the other pane and work
5. When the agent finishes, your focus should snap back to the agent's pane

If focus snaps back, you're all set.

---

## Next steps

- [Why Every AI Developer Needs Tmux](https://back2vibing.com/blog/why-tmux) -- the motivation behind this setup
- [How I Use Tmux + Back2Vibing](https://back2vibing.com/youtube/tmux-b2v) -- see it in action (YouTube)
- Full keybinding reference: press `Ctrl+b /` inside tmux to search all available commands
