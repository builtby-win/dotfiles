---
name: setup
description: Install, configure, customize, or recover builtby.win dotfiles interactively. Use when a user asks to set up or change their shell, terminals, apps, AI tools, keybindings, or dotfiles backups.
---

# Dotfiles Setup

Replace the raw curl-first experience with a conversational setup. Ask what the user wants, explain the consequence of each choice, then run the existing `bb` flow instead of recreating installer logic.

## Prerequisites

This skill is installed with the selected Claude Code or OpenCode configuration. If neither CLI is installed, use the bootstrap flow first; do not pretend this skill can run before an agent is available.

## Safety and discovery

1. Detect the platform, shell, current directory, and whether `bb` is available.
2. If the user has not cloned the repository and wants a first install, ask before making changes. Prefer cloning `https://github.com/builtby-win/dotfiles.git` to `~/dotfiles`, then run the checked-out bootstrap locally:
   - macOS: `bash ~/dotfiles/bootstrap.sh`
   - Linux: `bash ~/dotfiles/bootstrap-linux.sh`
   - Windows: `& "$HOME\\dotfiles\\bootstrap.ps1"`
3. If `bb` is available, use `bb setup` for changes. Do not duplicate the TypeScript or PowerShell setup logic in the skill.
4. Never expose or request passwords, API keys, or other secrets. Explain that package managers and `sudo` may prompt in the user's terminal.
5. Before applying a non-trivial change, summarize the selected apps/configs/features and the backup/revert path: `bb setup revert`.

## AskUserQuestions checklist

Use `AskUserQuestion` for the choices below. Ask only questions relevant to the platform and request; do not force users through every question. If the user already answered a question, skip it.

1. **Intent** — What should happen?
   - First-time install
   - Change installed apps/configs (`bb setup`)
   - Apply one module (`bb setup <module>`)
   - Restore a previous backup (`bb setup revert`)
2. **Setup path** — Which starting profile should `bb setup` use?
   - Focus: recommended AI/dev workflow
   - Standard: common tools and configs
   - Minimal: shell essentials only
   - Customize: choose everything manually
   - AI agent: AI-focused tools and configs
3. **Apps** — Which optional tools should be installed or kept?
   - CLI: tmux, btop, fzf, ripgrep, gh, bat, eza, zoxide, sesh, herdr, starship
   - Terminals/editors: iTerm2, Ghostty, Visual Studio Code, Cursor, Zed
   - AI: Claude Code, OpenCode, Codex CLI, Oh My Pi, Gemini CLI
   - macOS productivity/input: Raycast, back2vibing, TypeWhisper, Cotypist, Neru, AltTab, Ice, BetterTouchTool, Hammerspoon, Karabiner Elements, LinearMouse
   - Other macOS apps: Bitwarden, Chrome, Arc, Orion, Docker, Figma, Discord
4. **Managed configs** — Which dotfiles should be applied?
   - Shell (`zsh`)
   - Tmux
   - Neovim
   - Hammerspoon
   - Karabiner Elements
   - iTerm2 defaults
   - Ghostty
5. **Features and recovery** — Which optional behavior is wanted?
   - Shell Tips (Daily)
   - Back up existing files before replacement (recommended)
   - Restore/reveal existing backups instead
   - Skip optional changes for now
6. **Shell handoff** — After setup, should the shell be refreshed now?
   - Refresh automatically (`exec "$SHELL" -l`)
   - I will open a new terminal
   - Do not refresh yet

On Windows, use the equivalent questions from `setup-windows.ts`: run `windows/install.ps1`, choose terminals, editors, AI CLIs, and additional tools, then choose whether to configure Kanata autostart. Keep macOS/Linux-only choices out of the Windows prompt.

## Command mapping

- First install: clone/update the repository, then run the platform bootstrap listed above.
- Full guided change: `bb setup` or `bb setup --setup-path <focus|standard|minimal|customize|ai_agent>`.
- One module: `bb setup shell`, `bb setup tmux`, `bb setup nvim`, `bb setup hammerspoon`, `bb setup karabiner`, `bb setup iterm2`, or `bb setup ghostty`.
- Restore: `bb setup revert`.
- Status/help: `bb status` and `bb help`.

After a command completes, report what actually succeeded, any skipped/manual-download items, and the exact next command if the shell needs refreshing. If a command fails, preserve its output and give the smallest safe retry; do not claim setup completed.
