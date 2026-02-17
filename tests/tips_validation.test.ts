import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("shell/tips.txt validation", () => {
  const tipsPath = join(process.cwd(), "shell", "tips.txt");
  const content = readFileSync(tipsPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim() !== "" && !line.startsWith("#"));

  it("should follow the [Category] Task: Description + Shortcut format", () => {
    // Expected format: [CATEGORY] Task: Description + Shortcut
    // Example: [TMUX] Split Vertically: Create a side-by-side pane + Leader + d
    const tipsRegex = /^\[[A-Z]+\] .+: .+ \+ .+/;
    
    lines.forEach(line => {
      expect(line, `Line "${line}" does not match the expected format "[CATEGORY] Task: Description + Shortcut"`).toMatch(tipsRegex);
    });
  });
});
