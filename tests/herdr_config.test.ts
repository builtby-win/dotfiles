import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const configPath = path.resolve(__dirname, "../chezmoi/dot_config/herdr/config.toml");
const balanceScriptPath = path.resolve(
  __dirname,
  "../chezmoi/dot_local/bin/executable_herdr-balance-panes",
);
const confirmScriptPath = path.resolve(
  __dirname,
  "../chezmoi/dot_local/bin/executable_herdr-confirm-close-pane",
);

describe("Herdr workspace lifecycle", () => {
  it("focuses new worktrees and exposes cleanup actions", () => {
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain('new_worktree = "prefix+n"');
    expect(content).toContain('new_workspace = "prefix+shift+n"');
    expect(content).toContain('close_workspace = "prefix+shift+w"');
    expect(content).toContain('split_vertical = "prefix+d"');
    expect(content).toContain('split_horizontal = "prefix+shift+d"');
    expect(content).toContain('last_pane = "prefix+tab"');
    expect(content).toContain('switch_workspace = "cmd+1..9"');
    expect(content).toContain('close_pane = []');
    expect(content).not.toContain('"alt+w"');
    expect(content).toContain('previous_workspace = ["prefix+[", "prefix+up"]');
    expect(content).toContain('next_workspace = ["prefix+]", "prefix+down"]');
    expect(content).toContain('key = "prefix+b"');
    expect(content).toContain('command = "herdr-balance-panes"');
    expect(fs.statSync(balanceScriptPath).mode & 0o111).not.toBe(0);
    expect(content).toContain('command = "herdr-confirm-close-pane"');
    expect(fs.statSync(confirmScriptPath).mode & 0o111).not.toBe(0);
  });


  it("stays compatible with distro fzf (no bare transform: action)", () => {
    const switchPath = path.resolve(__dirname, "../chezmoi/dot_local/bin/executable_herdr-switch");
    const switchSh = fs.readFileSync(switchPath, "utf-8");
    // fzf 0.44 (Ubuntu noble) rejects `transform:` in --bind; it exits 2,
    // which shows as a flash/flicker in the herdr popup and kills the picker.
    expect(switchSh).not.toMatch(/:(transform|transform-query|transform-prompt|transform-header):/);
    expect(switchSh).toContain("--bind 'esc:abort'");
  });

  it("binds prefix+up/down to workspace switching", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain('prefix+up');
    expect(content).toContain('prefix+down');
    expect(content).not.toContain("herdr-plus");
    expect(content).toContain("previous_workspace");
    expect(content).toContain("next_workspace");
  });

  it("moves with arrows inside leader+g navigate mode", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toMatch(/navigate_workspace_down\s*=\s*\["j",\s*"down"\]/);
    expect(content).toMatch(/navigate_workspace_up\s*=\s*\["k",\s*"up"\]/);
  });
});

describe("herdr-nvim sidebar", () => {
  it("boots the sidebar in stock nvim so it loads the builtby config", () => {
    const nvimConfigPath = path.resolve(__dirname, "../chezmoi/dot_config/herdr-nvim/config.toml");
    const content = fs.readFileSync(nvimConfigPath, "utf-8");

    // No nvim_env override: vanilla nvim reads ~/.config/nvim, the thin
    // wrapper sourcing this repo. An appname would boot a different config.
    expect(content).not.toContain("nvim_env");
    expect(content).toContain('nvim_bin = "nvim"');
    expect(content).toContain('position = "right"');
  });
});
