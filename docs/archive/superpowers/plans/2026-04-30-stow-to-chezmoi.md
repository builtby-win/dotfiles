# Stow To Chezmoi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove GNU Stow as an installer/runtime path and make `chezmoi/` the single source of truth for managed dotfiles.

**Architecture:** Migrate legacy source files from `stow-packages/` into chezmoi source naming, then replace all stow execution paths with `chezmoi apply`. Existing `bb setup <module>` commands remain as compatibility aliases, but they no longer shell out to stow. Add a safe migration helper that only unlinks legacy symlinks pointing into `stow-packages`, never follows them recursively.

**Tech Stack:** TypeScript setup scripts, zsh shell helpers, PowerShell Windows installer, chezmoi source tree, Vitest tests.

---

## File Structure

- `chezmoi/`: only live dotfile source tree after migration.
- `scripts/apply-chezmoi.sh`: canonical apply command for Unix-like systems.
- `setup.ts`: interactive app/setup orchestration, no stow installs, no direct symlink fallback.
- `shell/functions.sh`: `bb apply`, `bb update`, and compatibility `bb setup <module>` aliases backed by chezmoi.
- `bootstrap.sh`, `bootstrap-linux.sh`: install/apply chezmoi only, no `--legacy-stow` path.
- `windows/install.ps1`: copy/apply from chezmoi paths, no `stow-packages` reads.
- `tests/*`: assert chezmoi paths and stow removal.
- `docs/modules/*`, `README.md`: document chezmoi-first behavior only.

## Task 1: Migrate Source Tree Into Chezmoi

**Files:**
- Create/modify: `chezmoi/dot_config/tmux/**`
- Create/modify: `chezmoi/dot_config/nvim/**`
- Create/modify: `chezmoi/dot_hammerspoon/**`
- Create/modify: `chezmoi/dot_config/karabiner/**`
- Create/modify: `chezmoi/dot_config/ghostty/config`
- Create/modify: `chezmoi/dot_config/starship.toml`
- Create/modify: `chezmoi/dot_config/kanata/kanata.kbd`
- Delete later: `stow-packages/`

- [ ] Copy each legacy package into matching chezmoi source naming. Preserve executable helper scripts by using chezmoi executable naming where needed, for example `executable_sesh-picker.sh` if executable bits matter.
- [ ] Keep Kanata’s chezmoi copy as source of truth and remove the duplicate stow copy during final cleanup.
- [ ] Verify source files exist with tests before deleting `stow-packages/`.

## Task 2: Replace Setup Runtime

**Files:**
- Modify: `setup.ts`
- Test: `tests/linux_bootstrap.test.ts`
- Test: `tests/tmux_config.test.ts`
- Test: `tests/nvim_module.test.ts`

- [ ] Remove `ensureStowInstalled`, `STOW_CONFIGS`, `STOW_TARGETS`, `setupStowConfigs`, `setupConfigWithoutStow`, and `stow -D` revert behavior.
- [ ] Add `applyChezmoi()` that runs `bash scripts/apply-chezmoi.sh` from `DOTFILES_DIR`.
- [ ] Add `migrateLegacyStowSymlinks()` that checks known target directories with `lstatSync`, verifies symlink targets include `${DOTFILES_DIR}/stow-packages`, then calls `unlinkSync` on the symlink itself.
- [ ] Ensure real user-owned files/directories are backed up before chezmoi apply, but symlinks into this repo are unlinked without following targets.

## Task 3: Replace Shell Helpers

**Files:**
- Modify: `shell/functions.sh`
- Test: `tests/shell_functions.test.ts`

- [ ] Make `bb setup`, `bb setup tmux`, `bb setup nvim`, `bb setup hammerspoon`, `bb setup karabiner`, `bb setup ghostty`, and `bb setup kanata` compatibility aliases for `bb apply` or a path-filtered chezmoi apply.
- [ ] Remove every `stow -d` shell command.
- [ ] Keep user-facing help clear: “setup applies chezmoi-managed dotfiles.”

## Task 4: Remove Bootstrap Stow Paths

**Files:**
- Modify: `bootstrap.sh`
- Modify: `bootstrap-linux.sh`
- Test: `tests/bootstrap_chezmoi.test.ts`
- Test: `tests/linux_bootstrap.test.ts`
- Test: `tests/linux-install-flows.test.ts`

- [ ] Remove `--legacy-stow` handling and docs from bootstrap scripts.
- [ ] Remove stow package install from macOS and Linux dependency lists.
- [ ] Preserve existing supported setup flags only if they map to chezmoi behavior.

## Task 5: Update Windows Installer

**Files:**
- Modify: `windows/install.ps1`
- Test: `tests/windows_config.test.ts`

- [ ] Replace `stow-packages` source paths with `chezmoi` source paths.
- [ ] Keep Windows-specific destinations intact.
- [ ] Ensure tests assert no `stow-packages` path remains in Windows install logic.

## Task 6: Update Docs And Tests

**Files:**
- Modify: `README.md`
- Modify: `docs/modules/chezmoi.md`
- Modify: `docs/modules/shell.md`
- Modify: `docs/modules/tmux.md`
- Modify: `docs/modules/nvim.md`
- Modify: `docs/modules/hammerspoon.md`
- Modify: `docs/modules/karabiner.md`
- Modify: `docs/modules/ghostty.md`
- Modify: `docs/modules/kanata.md`
- Modify/delete: `tests/module_docs_legacy.test.ts`

- [ ] Replace legacy stow language with chezmoi apply commands.
- [ ] Remove docs that teach manual `stow` commands.
- [ ] Keep historical plan docs unchanged unless they are surfaced as current instructions.

## Task 7: Delete Legacy Tree And Verify No Live References

**Files:**
- Delete: `stow-packages/`
- Modify tests as needed after source-path migration.

- [ ] Delete `stow-packages/` only after all code/tests/docs use `chezmoi/`.
- [ ] Run: `pnpm test`
- [ ] Run: `pnpm exec tsc --noEmit`
- [ ] Run an isolated chezmoi dry-run/apply against a temp home.
- [ ] Run grep checks for live stow references: `stow -d`, `command -v stow`, `install stow`, `--legacy-stow`, `stow-packages` in runtime code/docs/tests.

## Self-Review

- Spec coverage: source migration, runtime removal, compatibility aliases, symlink safety, docs/tests, Windows, verification are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Risk: this is a large migration. Execute in staged passes and verify after each pass.
