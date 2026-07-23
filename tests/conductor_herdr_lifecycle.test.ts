import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const helperPath = path.resolve(__dirname, "../scripts/herdr-lifecycle.sh");
const workflowPath = path.resolve(__dirname, "../conductor/workflow.md");

describe("Conductor Herdr lifecycle", () => {
  it("creates, focuses, opens Ghostty, and archives Herdr workspaces", () => {
    const helper = fs.readFileSync(helperPath, "utf-8");
    const workflow = fs.readFileSync(workflowPath, "utf-8");

    expect(helper).toContain("herdr workspace create --cwd");
    expect(helper).toContain("herdr workspace focus");
    expect(helper).toContain("open -a Ghostty");
    expect(helper).toContain('herdr workspace close "$1"');
    expect(workflow).toContain("./scripts/herdr-lifecycle.sh start <repo> <label>");
    expect(workflow).toContain("./scripts/herdr-lifecycle.sh archive <workspace-id>");
  });
});
