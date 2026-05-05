import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("tmux profile split", () => {
  const tmuxDir = join(process.cwd(), "chezmoi", "dot_config", "tmux", "builtby");
  const coreConf = readFileSync(join(tmuxDir, "core.conf"), "utf-8");
  const basicConf = readFileSync(join(tmuxDir, "basic.conf"), "utf-8");
  const proConf = readFileSync(join(tmuxDir, "pro.conf"), "utf-8");
  const sessionBootstrapSh = readFileSync(
    join(process.cwd(), "chezmoi", "dot_config", "tmux", "executable_session-bootstrap.sh"),
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

  it("binds Leader+Space directly to the sesh picker script", () => {
    expect(basicConf).toContain('bind-key "Space" display-popup -E -w 80% -h 70% "$HOME/.config/tmux/sesh-picker.sh"');
    expect(basicConf).toContain('[Sessions] ::: Session Picker ::: Leader + Space ::: tmux display-popup -E -w 80% -h 70% "$HOME/.config/tmux/sesh-picker.sh"');
  });

  it("reloads through the single tmux bootstrap entrypoint", () => {
    expect(basicConf).toContain('bind r source-file ~/.tmux.conf \\; display-message "Config reloaded!"');
    expect(basicConf).toContain('[Other] ::: Reload Config ::: Leader + r ::: tmux source-file ~/.tmux.conf && tmux display-message "Config reloaded!"');
    expect(basicConf).not.toContain('source-file ~/.config/tmux/builtby/core.conf \\; source-file ~/.config/tmux/builtby/basic.conf');
  });

  it("uses the local sesh shim and lets TPM load tmux-fingers", () => {
    expect(basicConf).toContain("No previous sesh session yet");
    expect(basicConf).toContain('run-shell "$HOME/.local/bin/sesh last >/dev/null 2>&1 || tmux display-message');
    expect(basicConf).toContain("$HOME/.local/bin/sesh list --icons");
    expect(basicConf).toContain("run '~/.tmux/plugins/tpm/tpm'");
    expect(basicConf).toContain("set -g @plugin 'Morantron/tmux-fingers'");
    expect(basicConf).not.toContain('tmux-fingers load-config');
    expect(basicConf).not.toContain("bind-key f run-shell 'tmux-fingers'");
  });

  it("uses copy-command-based clipboard bindings that are safe to reload", () => {
    expect(basicConf).toContain("set -s copy-command 'pbcopy'");
    expect(basicConf).toContain("set -s copy-command 'xclip -in -selection clipboard'");
    expect(basicConf).toContain('bind -n M-c copy-mode');
    expect(basicConf).toContain('bind -T copy-mode-vi y send-keys -X copy-pipe-and-cancel');
    expect(basicConf).toContain('bind-key -T copy-mode-vi MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel');
    expect(basicConf).not.toContain("bind -n M-c copy-mode \\; send-keys -X copy-pipe-and-cancel");
    expect(basicConf).not.toContain("MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel 'pbcopy'");
  });

  it("puts shared defaults in core and prefix in basic", () => {
    expect(coreConf).toContain("set -g mouse on");
    expect(basicConf).toMatch(/set -g prefix 'C-b'/);
    expect(basicConf).toMatch(/bind 'C-b' send-prefix/);
  });

  it("updates session environment from the attached terminal", () => {
    expect(coreConf).toContain('set -g update-environment "*"');
  });

  it("hardens terminal reports that can leak into panes", () => {
    expect(coreConf).toContain("set -g allow-passthrough off");
    expect(coreConf).toContain("set -g terminal-features 'xterm*:clipboard:cstyle:title:extkeys");
    expect(coreConf).not.toMatch(/^set\s+-g\s+terminal-features\s+.*:focus(?::|')/m);
    expect(coreConf).toContain('set -g terminal-overrides "*256col*:Tc,xterm-256color:Usync"');
    expect(coreConf).not.toMatch(/^set\s+-ga\s+terminal-features/m);
    expect(coreConf).not.toMatch(/^set\s+-ga\s+terminal-overrides/m);
    expect(coreConf).not.toMatch(/^set\s+-g\s+terminal-features\s+.*ccolour/m);
    expect(coreConf).toContain("switch-client -T root");
  });

  it("keeps terminal focus reports disabled by default", () => {
    expect(coreConf).toContain("set -g focus-events off");
    expect(coreConf).not.toContain("set -g focus-events on");
    expect(coreConf).toContain("Terminal focus-in reports end with `I`");
  });

  it("does not source mutable app-generated tmux snippets", () => {
    expect(coreConf).not.toContain("back2vibing-tmux.conf");
    expect(coreConf).toContain("set-option -gu pane-focus-in");
    expect(coreConf).toContain("set-hook -gu after-select-pane");
  });

  it("keeps the bottom status tabs and leader indicator enabled", () => {
    expect(coreConf).toContain("set -g status on");
    expect(coreConf).toContain("set -g status-position bottom");
    expect(coreConf).toContain("set -g window-status-style 'fg=brightblack,bg=default'");
    expect(coreConf).toContain("set -g window-status-current-style 'fg=blue,bg=default,bold'");
    expect(coreConf).toContain("set -g window-status-format '#I:#W'");
    expect(coreConf).toContain("set -g window-status-current-format '[#I:#W]'");
    expect(coreConf).toContain("set -g window-status-separator ' '");
    expect(coreConf).toContain("#{?client_prefix,#[fg=yellow bold] LEADER ,}");
  });

  it("uses active pane borders instead of pane-border labels for focus", () => {
    expect(coreConf).toContain("set -g pane-border-style 'fg=brightblack'");
    expect(coreConf).toContain("set -g pane-active-border-style 'fg=blue'");
    expect(basicConf).toContain("set -g pane-border-status off");
    expect(basicConf).toContain('set -g pane-border-format ""');
    expect(basicConf).not.toContain("set -g pane-border-status bottom");
  });

  it("keeps automatic session layouts opt-in", () => {
    expect(coreConf).toContain("set -g @builtby_bootstrap_layout off");
    expect(coreConf).toContain("session-bootstrap.sh");
    expect(sessionBootstrapSh).toContain("tmux show-options -gqv @builtby_bootstrap_layout");
    expect(sessionBootstrapSh).toContain('tmux rename-window -t "$session_name:1" "work"');
    expect(sessionBootstrapSh).toContain('tmux split-window -h -t "$session_name:1" -c "$session_path"');
    expect(sessionBootstrapSh).toContain('tmux new-window -t "$session_name:" -n "tools" -c "$session_path"');
  });
});

describe("tmux setup safety", () => {
  const setupTs = readFileSync(join(process.cwd(), "setup.ts"), "utf-8");
  const functionsSh = readFileSync(join(process.cwd(), "shell", "functions.sh"), "utf-8");
  const tmuxDocs = readFileSync(join(process.cwd(), "docs", "modules", "tmux.md"), "utf-8");

  it("offers keep-my-keybinds path for existing tmux users", () => {
    expect(setupTs).toContain("Keep my existing keybinds (recommended)");
    expect(setupTs).toContain("Replace with builtby basic profile (backup mine first)");
  });

  it("generates a single bootstrap-based ~/.tmux.conf entrypoint", () => {
    expect(setupTs).toContain('source-file "$HOME/.config/tmux/builtby/bootstrap.basic.conf"');
    expect(setupTs).not.toContain('source-file "$HOME/.config/tmux/builtby/basic.conf"`,');
  });

  it("normalizes duplicate managed tmux source lines", () => {
    expect(setupTs).toContain("function normalizeTmuxEntrypoint(content: string): string");
    expect(setupTs).toContain("function isManagedTmuxDirectSource(trimmed: string): boolean");
    expect(setupTs).toContain('trimmed === \'source-file "$HOME/.config/tmux/builtby/core.conf"\'');
    expect(setupTs).toContain('trimmed === \'source-file -q "$HOME/.config/tmux/builtby/core.conf"\'');
    expect(setupTs).toContain('trimmed === \'source-file "$HOME/.config/tmux/builtby/basic.conf"\'');
    expect(setupTs).toContain('trimmed === \'source-file -q "$HOME/.config/tmux/builtby/basic.conf"\'');
    expect(setupTs).toContain("removedManagedDirectSource && !hasBuiltbyTmuxBootstrap");
    expect(setupTs).toContain('trimmed.startsWith("source-file ") && trimmed.includes("back2vibing-tmux.conf")');
    expect(setupTs).toContain("Normalized ~/.tmux.conf to source the builtby tmux profile once");
  });

  it("checks the tmux managed config at the directory symlink boundary", () => {
    expect(setupTs).toContain('".config/tmux"');
    expect(setupTs).toContain('".local/bin/tmux-smart"');
    expect(setupTs).toContain('nvim: [".config/nvim"]');
    expect(setupTs).not.toContain('".config/tmux/builtby/basic.conf"');
    expect(setupTs).not.toContain('".config/tmux/builtby/pro.conf"');
  });

  it("updates local workmux config from templates during setup", () => {
    expect(setupTs).toContain('const DOTFILES_BACKUP_DIR = getBuiltbyBackupDir(HOME)');
    expect(setupTs).toContain('const WORKMUX_CONFIG_PATH = join(WORKMUX_CONFIG_DIR, "config.yaml")');
    expect(setupTs).toContain('const WORKMUX_CONFIG_TEMPLATE_SOURCE = join(DOTFILES_DIR, "templates", "workmux", "config.yaml")');
    expect(setupTs).toContain("function ensureLocalWorkmuxConfig(): void");
    expect(setupTs).toContain('const safeName = getSafeBackupName(filePath, HOME)');
    expect(setupTs).toContain("function pruneBackupFiles(prefix: string, keep = 1): void");
    expect(setupTs).toContain('pruneBackupFiles(`${safeName}.dotfiles-backup.`)');
    expect(setupTs).toContain('const backupPath = backupExistingPath(filePath, HOME)');
    expect(setupTs).toContain('copyFileSync(WORKMUX_CONFIG_TEMPLATE_SOURCE, WORKMUX_CONFIG_PATH)');
    expect(setupTs).toContain('backupFile(WORKMUX_CONFIG_PATH)');
    expect(setupTs).toContain('addToManifest({ original: WORKMUX_CONFIG_PATH, backup: backupPath, type: "file" })');
    expect(setupTs).toContain('Updated local workmux config at ${WORKMUX_CONFIG_PATH}');
    expect(setupTs).toContain('Created local workmux config at ${WORKMUX_CONFIG_PATH}');
  });

  it("restores directory backups with recursive removal", () => {
    expect(setupTs).toContain('rmSync(entry.original, { recursive: true, force: true })');
    expect(setupTs).not.toContain('unlinkSync(entry.original);');
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
    expect(functionsSh).toContain('command tmux source-file "$HOME/.tmux.conf"');
  });

  it("documents tmux package version guidance for the custom sesh workflow", () => {
    expect(tmuxDocs).toContain('fzf >= 0.34');
    expect(tmuxDocs).toContain('sesh >= 2.25');
    expect(tmuxDocs).toContain('tmux-fingers >= 2.6');
    expect(tmuxDocs).toContain('xcode-select --install');
  });
});
