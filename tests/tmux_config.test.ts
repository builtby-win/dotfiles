import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("tmux profile split", () => {
  const tmuxDir = join(process.cwd(), "stow-packages", "tmux", ".config", "tmux", "builtby");
  const coreConf = readFileSync(join(tmuxDir, "core.conf"), "utf-8");
  const basicConf = readFileSync(join(tmuxDir, "basic.conf"), "utf-8");
  const proConf = readFileSync(join(tmuxDir, "pro.conf"), "utf-8");
  const sessionBootstrapSh = readFileSync(
    join(process.cwd(), "stow-packages", "tmux", ".config", "tmux", "session-bootstrap.sh"),
    "utf-8",
  );
  const bootstrapBasicConf = readFileSync(join(tmuxDir, "bootstrap.basic.conf"), "utf-8");
  const workmuxConfigTemplate = readFileSync(
    join(process.cwd(), "templates", "workmux", "config.yaml"),
    "utf-8",
  );

  it("keeps beginner remaps in basic profile", () => {
    expect(basicConf).toContain("bind d split-window -h -c \"#{pane_current_path}\"");
    expect(basicConf).toContain("bind D split-window -v -c \"#{pane_current_path}\"");
    expect(basicConf).toContain("bind w if-shell");
  });

  it("adds workmux dashboard and quick-add bindings", () => {
    expect(basicConf).toContain("unbind n");
    expect(basicConf).toContain("unbind s");
    expect(basicConf).toContain('bind-key n command-prompt -p "worktree name"');
    expect(basicConf).toContain('bind-key -n M-n command-prompt -p "worktree name"');
    expect(basicConf).toContain("workmux add --open-if-exists %%%");
    expect(basicConf).toContain('bind-key s display-popup -E -w 92% -h 85% -d "#{pane_current_path}" "workmux dashboard"');
  });

  it("uses a single 50/50 workmux layout with opencode on the right", () => {
    expect(workmuxConfigTemplate).toContain("nerdfont: true");
    expect(workmuxConfigTemplate).toContain("merge_strategy: rebase");
    expect(workmuxConfigTemplate).toContain("window_prefix: wm-");
    expect(workmuxConfigTemplate).toContain("agent: opencode");
    expect(workmuxConfigTemplate).toContain("mode: session");
    expect(workmuxConfigTemplate).toContain("command: opencode run");
    expect(workmuxConfigTemplate).toContain("- name: work");
    expect(workmuxConfigTemplate).toContain("- command: opencode");
    expect(workmuxConfigTemplate).toContain("split: horizontal");
    expect(workmuxConfigTemplate).toContain("percentage: 50");
    expect(workmuxConfigTemplate).toContain("focus: true");
  });

  it("keeps pro profile non-invasive for keybinds", () => {
    expect(proConf).not.toMatch(/^\s*bind(?:-key)?\b/m);
    expect(proConf).not.toMatch(/^\s*unbind(?:-key)?\b/m);
  });

  it("loads core + basic + user overrides in bootstrap", () => {
    expect(bootstrapBasicConf).toContain("source-file -q \"$HOME/.config/tmux/builtby/core.conf\"");
    expect(bootstrapBasicConf).toContain("source-file -q \"$HOME/.config/tmux/builtby/basic.conf\"");
    expect(bootstrapBasicConf).toContain("source-file -q \"$HOME/.tmux.local.conf\"");
  });

  it("keeps command palette delimiter in basic profile", () => {
    expect(basicConf).toContain(" ::: ");
    expect(basicConf).toContain('--delimiter " ::: "');
    expect(basicConf).toContain('--with-nth "1..3"');
  });

  it("adds a rebalance binding and command palette entry", () => {
    expect(basicConf).toContain("bind b select-layout -E");
    expect(basicConf).toContain("[Panes] ::: Rebalance Panes ::: Leader + b ::: tmux select-layout -E");
  });

  it("reloads the modular tmux profile instead of only ~/.tmux.conf", () => {
    expect(basicConf).toContain('bind r source-file ~/.config/tmux/builtby/core.conf \\; source-file ~/.config/tmux/builtby/basic.conf');
    expect(basicConf).toContain('[Other] ::: Reload Config ::: Leader + r ::: tmux source-file ~/.config/tmux/builtby/core.conf && tmux source-file ~/.config/tmux/builtby/basic.conf');
  });

  it("puts shared defaults in core and prefix in basic", () => {
    expect(coreConf).toContain("set -g mouse on");
    expect(basicConf).toMatch(/set -g prefix 'C-b'/);
    expect(basicConf).toMatch(/bind 'C-b' send-prefix/);
  });

  it("updates session environment from the attached terminal", () => {
    expect(coreConf).toContain('set -ga update-environment "*"');
  });

  it("bootstraps new sessions with cwd-aware windows and splits", () => {
    expect(coreConf).toContain("session-bootstrap.sh");
    expect(sessionBootstrapSh).toContain('tmux rename-window -t "$session_name:1" "work"');
    expect(sessionBootstrapSh).toContain('tmux split-window -h -t "$session_name:1" -c "$session_path"');
    expect(sessionBootstrapSh).toContain('tmux new-window -t "$session_name:" -n "tools" -c "$session_path"');
  });
});

describe("tmux setup safety", () => {
  const setupTs = readFileSync(join(process.cwd(), "setup.ts"), "utf-8");
  const functionsSh = readFileSync(join(process.cwd(), "shell", "functions.sh"), "utf-8");

  it("offers keep-my-keybinds path for existing tmux users", () => {
    expect(setupTs).toContain("Keep my existing keybinds (recommended)");
    expect(setupTs).toContain("Replace with builtby basic profile (backup mine first)");
  });

  it("updates local workmux config from templates during setup", () => {
    expect(setupTs).toContain('const DOTFILES_BACKUP_DIR = join(HOME, ".local", "state", "dotfiles", "backups")');
    expect(setupTs).toContain('const WORKMUX_CONFIG_PATH = join(WORKMUX_CONFIG_DIR, "config.yaml")');
    expect(setupTs).toContain('const WORKMUX_CONFIG_TEMPLATE_SOURCE = join(DOTFILES_DIR, "templates", "workmux", "config.yaml")');
    expect(setupTs).toContain("function ensureLocalWorkmuxConfig(): void");
    expect(setupTs).toContain('mkdirSync(DOTFILES_BACKUP_DIR, { recursive: true })');
    expect(setupTs).toContain('const safeName = filePath.replace(/^\\//, "").replace(/[\\/:]/g, "__")');
    expect(setupTs).toContain("function pruneBackupFiles(prefix: string, keep = 1): void");
    expect(setupTs).toContain('pruneBackupFiles(`${safeName}.dotfiles-backup.`)');
    expect(setupTs).toContain('const backupPath = join(DOTFILES_BACKUP_DIR, `${safeName}.dotfiles-backup.${Date.now()}`)');
    expect(setupTs).toContain('copyFileSync(WORKMUX_CONFIG_TEMPLATE_SOURCE, WORKMUX_CONFIG_PATH)');
    expect(setupTs).toContain('backupFile(WORKMUX_CONFIG_PATH)');
    expect(setupTs).toContain('addToManifest({ original: WORKMUX_CONFIG_PATH, backup: backupPath, type: "file" })');
    expect(setupTs).toContain('Updated local workmux config at ${WORKMUX_CONFIG_PATH}');
    expect(setupTs).toContain('Created local workmux config at ${WORKMUX_CONFIG_PATH}');
  });

  it("syncs workmux config from bb setup tmux and bb update", () => {
    expect(functionsSh).toContain('_sync_workmux_config()');
    expect(functionsSh).toContain('templates/workmux/config.yaml');
    expect(functionsSh).toContain('_bb_prune_backups()');
    expect(functionsSh).toContain('local backup_dir="${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles/backups/workmux"');
    expect(functionsSh).toContain('mkdir -p "$backup_dir"');
    expect(functionsSh).toContain('local backup_path="$backup_dir/config.yaml.dotfiles-backup.$(date +%s)"');
    expect(functionsSh).toContain('_bb_prune_backups "$backup_dir" "config.yaml.dotfiles-backup." 1');
    expect(functionsSh).toContain('_sync_workmux_config "$dotfiles_dir"');
  });
});
