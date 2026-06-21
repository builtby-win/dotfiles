import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("shell aliases", () => {
  const aliasesSh = readFileSync(join(process.cwd(), "shell", "aliases.sh"), "utf-8");

  it("runs AI CLIs in yolo mode by default", () => {
    expect(aliasesSh).toContain("claude() {");
    expect(aliasesSh).toContain('command claude --dangerously-skip-permissions "$@"');
    expect(aliasesSh).toContain("c() {");
    expect(aliasesSh).toContain('claude "$@"');
    expect(aliasesSh).toContain("gemini() {");
    expect(aliasesSh).toContain('command gemini --yolo "$@"');
    expect(aliasesSh).toContain("g() {");
    expect(aliasesSh).toContain('gemini "$@"');
    expect(aliasesSh).toContain("codex() {");
    expect(aliasesSh).toContain('B2V_BYPASS_AGENT_WIZARD=1 command codex --dangerously-bypass-approvals-and-sandbox "$@"');
  });

  it("restarts Kanata app-context agents with the daemons", () => {
    expect(aliasesSh).toContain("kr() {");
    expect(aliasesSh).toContain("sudo launchctl kickstart -k system/com.builtbywin.kanata");
    expect(aliasesSh).toContain('launchctl kickstart -k "gui/$(id -u)/local.kanata-vk-agent"');
    expect(aliasesSh).toContain('launchctl kickstart -k "gui/$(id -u)/local.kanata-vk-agent-sculpt"');
  });
});
