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
    // omp terminal images need Herdr's Kitty renderer (Ghostty speaks Kitty,
    // never Sixel) paired with PI_FORCE_IMAGE_PROTOCOL=kitty in shell/init.sh.
    expect(content).toMatch(/\[terminal\]/);
    expect(content).toMatch(/kitty_graphics\s*=\s*true/);
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

  it("keeps the switcher readable on narrow popups with stable cursor identity", () => {
    const switchPath = path.resolve(__dirname, "../chezmoi/dot_local/bin/executable_herdr-switch");
    const switchSh = fs.readFileSync(switchPath, "utf-8");
    // Identity stays on the workspace id across reloads.
    expect(switchSh).toContain("--id-nth=3");
    expect(switchSh).toContain("--track");
  });

  it("opens the herdr-switch popup on prefix+g instead of the built-in picker", () => {
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toMatch(/workspace_picker\s*=\s*""/);
    expect(content).toContain('key = "prefix+g"');
    expect(content).toContain('command = "herdr-switch"');
  });

  it("sorts herdr-switch sessions with current pane first then waiting, ready, working, idle", () => {
    const switchPath = path.resolve(__dirname, "../chezmoi/dot_local/bin/executable_herdr-switch");
    const switchSh = fs.readFileSync(switchPath, "utf-8");

    expect(switchSh).toContain("def order_sessions(workspace_id, workspace_panes):");
    expect(switchSh).toMatch(/"waiting":\s*0/);
    expect(switchSh).toMatch(/"ready":\s*1/);
    expect(switchSh).toMatch(/"working":\s*2/);
    expect(switchSh).toMatch(/"idle":\s*3/);
    expect(switchSh).toContain('rail = "".join(');
    expect(switchSh).toContain("title = f\"{selected_glyph} {raw_title}\"");

    const { execSync } = require("child_process");
    const pyScript = [
      'import json',
      'panes = [',
      '    {"pane_id": "p_cur", "agent_status": "idle"},',
      '    {"pane_id": "p_work", "agent_status": "working"},',
      '    {"pane_id": "p_wait", "agent_status": "waiting"},',
      '    {"pane_id": "p_ready", "agent_status": "ready"},',
      '    {"pane_id": "p_idle", "agent_status": "idle"},',
      '    {"pane_id": "p_block", "agent_status": "blocked"},',
      '    {"pane_id": "p_done", "agent_status": "done"},',
      ']',
      'current_pane_id = "p_cur"',
      'current_workspace_id = "w1"',
      'workspace_by_id = {"w1": {"workspace_id": "w1", "active_tab_id": "t1"}}',
      'focused_in_tab = {"t1": "p_cur"}',
      'focus_ts = {"pane:p_cur": 100}',
      'pane_activity = {}',
      'def clean(v): return " ".join(str(v or "").split())',
      'def sessions_of(workspace_panes, active_pane_id=None):',
      '    agents = [pane for pane in workspace_panes if pane.get("agent_status") not in (None, "unknown")]',
      '    if not agents: return list(workspace_panes)',
      '    if active_pane_id:',
      '        active_pane = next((pane for pane in workspace_panes if pane.get("pane_id") == active_pane_id), None)',
      '        if active_pane and active_pane not in agents: return [active_pane] + agents',
      '    return agents',
      'status_order = {"waiting": 0, "blocked": 0, "ready": 1, "done": 1, "working": 2, "idle": 3}',
      'def get_status_order(status): return status_order.get(clean(status).lower(), 4)',
      'def order_sessions(workspace_id, workspace_panes):',
      '    workspace = workspace_by_id.get(workspace_id, {})',
      '    focused_pane_id = focused_in_tab.get(workspace.get("active_tab_id"))',
      '    active_pane_id = current_pane_id if workspace_id == current_workspace_id else focused_pane_id',
      '    group = sessions_of(workspace_panes, active_pane_id)',
      '    if not group: return []',
      '    current_pane = (',
      '        next((pane for pane in group if pane.get("pane_id") == current_pane_id), None)',
      '        or next((pane for pane in group if pane.get("pane_id") == focused_pane_id), None)',
      '        or max(group, key=lambda pane: (focus_ts.get(f"pane:{pane.get(\'pane_id\')}", 0), pane_activity.get(pane.get(\'pane_id\'), 0)))',
      '    )',
      '    others = [pane for pane in group if pane.get("pane_id") != current_pane.get("pane_id")]',
      '    others.sort(key=lambda pane: (get_status_order(pane.get("agent_status")), -focus_ts.get(f"pane:{pane.get(\'pane_id\')}", 0), -pane_activity.get(pane.get(\'pane_id\'), 0), pane.get("pane_id", "")))',
      '    return [current_pane] + others',
      'ordered = order_sessions("w1", panes)',
      'print(json.dumps([p["pane_id"] for p in ordered]))',
    ].join("\n");
    const output = JSON.parse(execSync("python3", { input: pyScript }).toString().trim());
    expect(output[0]).toBe("p_cur");
    expect(output.slice(1, 3)).toEqual(expect.arrayContaining(["p_wait", "p_block"]));
    expect(output.slice(3, 5)).toEqual(expect.arrayContaining(["p_ready", "p_done"]));
    expect(output[5]).toBe("p_work");
    expect(output[6]).toBe("p_idle");
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
