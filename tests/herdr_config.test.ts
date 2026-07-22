import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const configPath = path.resolve(__dirname, "../chezmoi/dot_config/herdr/config.toml");

describe("Herdr workspace lifecycle", () => {
  it("focuses new worktrees and exposes cleanup actions", () => {
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain('new_worktree = "prefix+n"');
    expect(content).toContain('remove_worktree = "prefix+shift+n"');
    expect(content).toContain('close_workspace = "prefix+shift+w"');
    expect(content).toContain('split_vertical = "prefix+shift+d"');
    expect(content).toContain('last_pane = "prefix+tab"');
  });
});
