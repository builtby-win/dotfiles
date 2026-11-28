import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("shell aliases", () => {
  const aliasesSh = readFileSync(join(process.cwd(), "shell", "aliases.sh"), "utf-8");

  it("runs AI CLIs in yolo mode by default", () => {
    expect(aliasesSh).toContain('claude() { _yolo --dangerously-skip-permissions claude "$@"; }');
    expect(aliasesSh).toContain("c() {");
    expect(aliasesSh).toContain('claude "$@"');
    expect(aliasesSh).toContain('gemini() { _yolo --yolo gemini "$@"; }');
    expect(aliasesSh).toContain("AGENT_YOLO");
    expect(aliasesSh).toContain("g() {");
    expect(aliasesSh).toContain('gemini "$@"');
    expect(aliasesSh).toContain("codex() {");
    expect(aliasesSh).toContain('B2V_BYPASS_AGENT_WIZARD=1 _yolo --dangerously-bypass-approvals-and-sandbox codex "$@"');
  });

});
