import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("shell aliases", () => {
  const aliasesSh = readFileSync(join(process.cwd(), "shell", "aliases.sh"), "utf-8");

  it("keeps the short claude shortcut opt-in without overriding the claude command", () => {
    expect(aliasesSh).toContain('alias c="claude --dangerously-skip-permissions"');
    expect(aliasesSh).not.toContain('alias claude="claude --dangerously-skip-permissions"');
  });
});
