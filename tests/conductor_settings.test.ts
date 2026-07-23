import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const settingsPath = path.resolve(__dirname, "../.conductor/settings.toml");
const scriptPath = path.resolve(__dirname, "../scripts/conductor-herdr-workspace.sh");

describe("Conductor Herdr lifecycle", () => {
  it("wires setup and archive scripts", () => {
    const settings = fs.readFileSync(settingsPath, "utf-8");
    const script = fs.readFileSync(scriptPath, "utf-8");

    expect(settings).toContain('setup = "./scripts/conductor-herdr-workspace.sh setup"');
    expect(settings).toContain('archive = "./scripts/conductor-herdr-workspace.sh archive"');
    expect(script).toContain("herdr workspace create");
    expect(script).toContain("herdr workspace focus");
    expect(script).toContain("open -a Ghostty");
    expect(script).toContain('herdr workspace close "$workspace_id"');
  });
});
