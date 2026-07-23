import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const configPath = path.resolve(__dirname, "../chezmoi/dot_config/herdr/config.toml");
const balanceScriptPath = path.resolve(
  __dirname,
  "../chezmoi/dot_local/bin/executable_herdr-balance-panes",
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
    expect(content).toContain('switch_workspace = "prefix+1..9"');
    expect(content).toContain('key = "prefix+b"');
    expect(content).toContain('command = "herdr-balance-panes"');
    expect(fs.statSync(balanceScriptPath).mode & 0o111).not.toBe(0);
  });
});
