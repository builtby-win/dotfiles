import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const settingsPath = path.resolve(__dirname, "../.conductor/settings.toml");
const scriptPath = path.resolve(__dirname, "../scripts/conductor-herdr-workspace.sh");
const summaryPath = path.resolve(
  __dirname,
  "../chezmoi/dot_local/bin/executable_conductor-workspace-summary",
);
const launchAgentPath = path.resolve(
  __dirname,
  "../chezmoi/Library/LaunchAgents/com.builtbywin.conductor-workspace-summary.plist.tmpl",
);

describe("Conductor Herdr lifecycle", () => {
  it("wires setup and archive scripts", () => {
    const settings = fs.readFileSync(settingsPath, "utf-8");
    const script = fs.readFileSync(scriptPath, "utf-8");

    expect(settings).toContain('setup = "./scripts/conductor-herdr-workspace.sh setup"');
    expect(settings).toContain('archive = "./scripts/conductor-herdr-workspace.sh archive"');
    expect(script).toContain("herdr workspace create");
    expect(script).toContain("herdr workspace focus");
    expect(script).toContain("open -a Ghostty");
    expect(script.lastIndexOf('herdr workspace focus "$workspace_id"')).toBeLessThan(script.lastIndexOf("open -a Ghostty"));
    expect(script).toContain('herdr workspace close "$workspace_id"');
    expect(script).toContain("find_workspace_by_path");
    expect(script).toContain("Keep labels managed by conductor-workspace-summary intact.");
    expect(script).toContain("${XDG_STATE_HOME:-$HOME/.local/state}/conductor-herdr-workspaces");
    expect(script).toContain("legacy_state_file");
  });
  it("installs a daily updater that preserves descriptive labels", () => {
    const summary = fs.readFileSync(summaryPath, "utf-8");
    const launchAgent = fs.readFileSync(launchAgentPath, "utf-8");

    expect(summary).toContain("Only labels that still look like generated worktree names are changed.");
    expect(summary).toContain('herdr, "workspace", "rename"');
    expect(launchAgent).toContain("<integer>86400</integer>");
    expect(launchAgent).toContain("<string>--apply</string>");
  });
});
