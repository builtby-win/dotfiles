# Dotfiles UX Design System

This repo is a terminal product. The interface is the install command, shell output, prompts, recovery text, helper commands, and docs.

The target user is a real person setting up a machine. They may be a power user, or they may not know what Node, pnpm, chezmoi, zsh, Kanata, or a shell profile means. The experience should be easy, calm, and delightful without talking down to them.

## Product promise

One command installs the base dotfiles, launches guided setup, shows exactly what will change, applies only what the user chose, and leaves the user with a working shell plus a clear recovery path.

If the install succeeds, the user should know:

1. What changed.
2. What did not change.
3. What to run first.
4. How to change choices later.
5. How to recover if something feels wrong.

If the install fails, the user should know:

1. Which phase failed.
2. Whether their files were changed.
3. The exact command to resume or undo.

## UX principles

### 1. Make the next step obvious

Every screen should answer, "What do I do now?" The answer should be visible without reading a paragraph.

Good:

```text
Next: refresh your shell so bb and pnpm are available.
Run: exec "$SHELL" -l
```

Bad:

```text
Setup complete.
```

### 2. Show consequences before changes

Before optional installs or file writes, show the selected apps, configs, features, files that may change, and backup behavior.

The user should never need to know how chezmoi works to understand what setup will touch.

### 3. Apply only what the user chose

Selection must drive file application. If the user does not select Kanata, setup must not install, sync, or apply Kanata-managed files.

This applies to every optional module:

- Kanata
- Karabiner
- Hammerspoon
- Ghostty
- tmux
- Neovim
- AI tool configs
- app-specific templates

Base shell safety files may apply during bootstrap, but optional app/config state must be gated by the setup manifest or the current setup selection.

### 4. Recovery is part of the product

Error states are user experience. Every failure message should include a recovery command when possible.

Good:

```text
[error] Dependency install failed during phase 2.
Your dotfiles were cloned, but optional setup did not run.
Resume: cd ~/dotfiles && ./bootstrap.sh
```

Bad:

```text
pnpm install failed
```

### 5. Delight is confidence, not decoration

The installer should feel polished because it is predictable, respectful, and safe. Avoid emoji overload, vague hype, or cute language when a user is making file-system decisions.

Use warmth in moments that need reassurance:

```text
You are ready. Open a fresh shell, then run bb help.
```

## Shared vocabulary

Use these terms consistently across README, bootstrap scripts, setup wizard, `bb help`, and Windows docs.

| Term | Meaning | Use when |
|------|---------|----------|
| Install | First-time bootstrap flow that clones/updates repo and prepares required tools | README curl command, bootstrap scripts |
| Setup | Guided choices for apps, configs, optional features, and backups | `setup.ts`, `bb setup` |
| Apply | Apply the base chezmoi-managed state | `bb apply`, bootstrap phase 3 |
| Restore | Recover files from backups | setup menu, `bb restore` |
| Refresh shell | Reload PATH and shell config after setup | final handoff, shell prompt |
| Config | A dotfile or app config managed by this repo | setup wizard |
| Feature | Optional behavior loaded through manifest flags | setup wizard, shell init |

Avoid using "dashboard" unless there is a durable UI surface. For terminal prompts, prefer "guided setup" or "setup wizard."

## Journey map

```text
README
  |
  v
Install command
  |
  v
Preflight plan
  - repo location
  - required tools
  - base apply
  - setup will ask before optional changes
  |
  v
Required tools
  - Git
  - Homebrew or Linux package manager
  - chezmoi
  - fnm, Node.js, pnpm
  |
  v
Base apply
  - safe shell foundation only
  - no optional app/config state unless selected
  |
  v
Guided setup
  - choose path
  - choose apps
  - choose configs
  - choose features
  |
  v
Review screen
  - selected tools
  - selected configs
  - files that may change
  - backup location
  |
  v
Apply selections
  - install selected apps
  - apply selected configs
  - write setup manifest
  |
  v
Final handoff
  - what changed
  - what was skipped
  - refresh shell
  - first command: bb help
  - recovery command: bb setup or restore path
```

## Setup paths

Setup paths should be action-first. Friendly names may appear as secondary labels.

| Current idea | Preferred label | Secondary text |
|--------------|-----------------|----------------|
| Focused Setup | Install the full AI/dev workflow | Focused setup |
| Standard Setup | Install the recommended shell and dev tools | Standard setup |
| Minimal Setup | Set up only shell basics | Minimal setup |
| Custom Setup | Choose every app and config yourself | Custom setup |
| Use Detected Setup | Keep what is already on this machine | Detected setup |

The label should tell the user what will happen. The secondary text can carry personality.

## Selection-aware apply

The setup manifest is the source of truth for what the user chose:

- `apps`: selected apps and command-line tools
- `configs`: selected managed configs
- `features`: optional behavior flags

The apply layer must respect those choices.

### Required behavior

1. Bootstrap may apply a minimal base state needed for the shell and setup to function.
2. Optional modules must apply only when selected.
3. A config must be skipped when it is not selected, even if its source exists in `chezmoi/`.
4. App-specific AI configs must apply only when their parent app was selected or detected.
5. Re-running setup must update the manifest and reconcile selections intentionally.
6. A skipped config should not be silently removed unless the user chooses a restore/remove flow.

### Optional module example

If the user does not choose Hammerspoon:

- Do not install Hammerspoon.
- Do not apply `~/.hammerspoon`.
- Do not add Hammerspoon as an active first-run affordance.

If the user chooses Hammerspoon:

- Show that automation requires Accessibility permission.
- Show which files will be written.
- Show how to disable or restore later.

### Recap copy

The review screen must distinguish selected, skipped, and already present items.

```text
Selected configs:
  shell, tmux, nvim

Skipped configs:
  karabiner, hammerspoon

Will modify or create:
  ~/.zshrc
  ~/.config/tmux
  ~/.config/nvim

Will not touch:
  ~/.hammerspoon/init.lua
```

## Recovery matrix

| Phase | Loading copy | Success copy | Failure copy | Resume command |
|-------|--------------|--------------|--------------|----------------|
| Read install command | Not applicable | Command copied into terminal | Invalid shell or no terminal | Use the documented macOS, Linux, or Windows command |
| Confirm plan | "Before anything changes, here is the plan" | "Install confirmed" | "Aborted before making changes" | Re-run the curl command |
| Prepare tools | "Preparing required installer tools" | "Required tools ready" | "Tool install failed during phase 1" | `cd ~/dotfiles && ./bootstrap.sh` or platform equivalent |
| Clone/update repo | "Preparing dotfiles repository" | "Dotfiles ready at <path>" | "Could not clone or update repo" | Check network, then rerun install command |
| Install dependencies | "Installing Node project dependencies" | "Dependencies installed" | "Dependency install failed" | `cd ~/dotfiles && ./bootstrap.sh` |
| Apply base state | "Applying base dotfiles" | "Base dotfiles applied" | "Base apply failed" | `cd ~/dotfiles && bash scripts/apply-chezmoi.sh` |
| Launch setup | "Opening guided setup" | "Guided setup complete" | "Guided setup did not launch" | `cd ~/dotfiles && npm exec --yes tsx -- setup.ts ~/dotfiles` |
| Review selections | "Review your selections" | "Selections confirmed" | "Aborted before optional changes" | `bb setup` after shell refresh |
| Apply selections | "Installing selected apps and configs" | "Selected setup applied" | "Selected setup failed" | `cd ~/dotfiles && pnpm exec tsx setup.ts ~/dotfiles` |
| Refresh shell | "Refresh your shell now?" | "Shell refreshed" | "Could not refresh automatically" | `exec "$SHELL" -l` or open a new terminal |

Every failure copy should include:

1. The phase number or name.
2. Whether files were changed.
3. A copy-paste command.
4. A short explanation in plain English.

## Final handoff screen

Every successful interactive setup should end with one final handoff.

Required content:

```text
You are ready.

What changed:
  - Applied base shell files
  - Installed selected apps/configs
  - Saved your choices to ~/.config/dotfiles/setup-manifest.json

Skipped:
  - Kanata was not selected, so keyboard remapping files were not touched

Next:
  1. Refresh your shell: exec "$SHELL" -l
  2. See available commands: bb help
  3. Change choices later: bb setup

Recovery:
  - Restore backups: bb setup, then choose Restore
  - Reapply base files: bb apply
```

The exact skipped list should reflect the user's selections.

## Terminal style

### Status labels

Use status words that survive plain logs and screen readers.

Preferred:

```text
[info] Preparing required tools
[ok] Dependencies installed
[warn] Open a new terminal to refresh your PATH
[error] Dependency install failed during phase 2
```

Symbols like `✓` and `⚠` are allowed only when paired with text. Do not rely on color alone.

### Prompt style

Prompts should make the action and default clear.

Good:

```text
Continue with this install? [Y/n]
Run exec "$SHELL" -l now? [y/N]
```

Bad:

```text
Proceed?
```

### Checkbox instructions

Every checkbox screen should explain controls in the prompt.

```text
Select configs to install. Use Space to toggle, Enter to continue. You can go back after this step.
```

### Copy tone

Use direct, respectful language.

Good:

```text
Kanata was skipped, so keyboard remapping files were not touched.
```

Bad:

```text
Don't worry, we did magic for you!
```

## Accessibility rules

1. Do not rely on color alone.
2. Do not rely on symbols alone.
3. Include the keyboard action in every interactive prompt.
4. Keep body copy short and scannable.
5. Use copy-paste commands for recovery.
6. Make destructive actions opt-in with a default of no.
7. Avoid placeholder-only labels in any future graphical UI.
8. Keep terminal lines readable at narrow widths when possible.
9. Prefer plain ASCII status labels in Linux and Windows scripts unless symbols are also explained.

## Platform parity

macOS, Linux, and Windows can use different commands, but they should share the same mental model.

| Concept | macOS/Linux | Windows |
|---------|-------------|---------|
| Install | curl bootstrap | PowerShell bootstrap |
| Setup | `bb setup` or `pnpm exec tsx setup.ts` | `bb setup` or `pnpm run setup:windows` |
| Apply base | `bb apply` | `bb update` or documented apply equivalent |
| Restore | `bb setup` restore flow, `bb restore <target>` | documented Windows restore flow |
| Refresh shell | `exec "$SHELL" -l` or new terminal | open a new PowerShell window |

Windows docs should not feel like a separate product. They should use the same nouns and journey steps.

## `bb` command UX

`bb help` is a core post-install screen. It should match the install journey.

Preferred command descriptions:

```text
bb apply                Apply the base dotfiles state
bb setup                Open guided setup to change apps, configs, or restore backups
bb setup <module>       Apply one selected module intentionally
bb restore <target>     Restore or reveal saved app backups
bb status               Show what setup selected on this machine
bb help                 Show this help
```

Avoid describing `bb setup` as only "Apply chezmoi-managed dotfiles." That hides the guided setup and recovery role.

## Required test contracts

Tests should protect UX behavior, not only implementation details.

Add or keep tests for:

1. README uses shared install/setup/apply/restore/refresh vocabulary.
2. Bootstrap shows a preflight plan before changes.
3. Bootstrap dependency failure includes a resume command.
4. Setup launch failure includes a resume command.
5. Setup path labels are action-first.
6. Setup recap lists files that will change.
7. Setup recap lists skipped optional configs when relevant.
8. Kanata is not applied when not selected.
9. Manifest records selected apps, configs, and features.
10. `bb help` matches shared vocabulary.
11. Windows docs use the same journey vocabulary.
12. Shell refresh guidance appears after successful install.

## Implementation checklist

### Phase 1: Source of truth

- [ ] Add this `DESIGN.md`.
- [ ] Add UX vocabulary tests.
- [ ] Align README and Windows README terminology.

### Phase 2: Selection-aware apply

- [ ] Define the minimal base state bootstrap may apply.
- [ ] Gate optional chezmoi files by setup selection or manifest.
- [ ] Ensure Kanata files are skipped unless Kanata is selected.
- [ ] Show selected/skipped/touched paths in recap.
- [ ] Add tests for skipped optional modules.

### Phase 3: Setup wizard copy

- [ ] Rename setup paths to action-first labels.
- [ ] Add control instructions to checkbox prompts.
- [ ] Add final "You are ready" handoff screen.
- [ ] Show what changed, what was skipped, and next commands.

### Phase 4: Recovery copy

- [ ] Apply the recovery matrix to bootstrap scripts.
- [ ] Add phase-aware failure messages.
- [ ] Add copy-paste recovery commands.
- [ ] Add regression tests for failure messages.

### Phase 5: Helper command polish

- [ ] Update `bb help` descriptions.
- [ ] Make `bb status` show selected/skipped state clearly.
- [ ] Make restore wording consistent with setup.

## Non-goals

- Do not turn the terminal installer into a graphical app.
- Do not remove advanced commands for power users.
- Do not silently delete unselected configs unless the user chooses a remove/restore flow.
- Do not hide the fact that this modifies dotfiles.
- Do not use friendly copy to obscure risk.

## Definition of done

The UX work is complete when a fresh user can:

1. Run one install command.
2. Understand the plan before changes.
3. Choose a setup path by consequence, not vibes.
4. Review exact file impact before optional changes.
5. Trust that skipped modules are not touched.
6. Finish with a clear next command.
7. Recover from every phase with a copy-paste command.
8. Reopen setup later with `bb setup`.
9. See their machine state with `bb status`.
