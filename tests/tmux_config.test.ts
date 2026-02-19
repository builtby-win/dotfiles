import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("stow-packages/tmux/.tmux.conf verification", () => {
  const tmuxPath = join(process.cwd(), "stow-packages", "tmux", ".tmux.conf");
  const content = readFileSync(tmuxPath, "utf-8");

  it("should use a robust delimiter and clean format in command palette", () => {
    // New format: CATEGORY ::: ACTION ::: SHORTCUT ::: COMMAND
    expect(content).toContain(" ::: ");
    expect(content).toContain("fzf");
    expect(content).toContain('--delimiter " ::: "');
    expect(content).toContain('--with-nth "1..3"');
  });

  it("should not contain tmux-specific color codes in the command palette section", () => {
    const sections = content.split("# Help & Command Palette");
    if (sections.length > 1) {
      const paletteSection = sections[1];
      // Check only up to the next big header or EOF
      const paletteBlock = paletteSection.split("EOF")[1]; // Get content inside EOF markers
      if (paletteBlock) {
         expect(paletteBlock).not.toContain("#[fg=");
      }
    }
  });

  it("should include new commands in the command palette", () => {
    expect(content).toContain("Swap Pane Right");
    expect(content).toContain("Swap Pane Left");
    expect(content).toContain("Break Pane to Window");
  });

  it("should use Ctrl+b as the prefix", () => {
    expect(content).toMatch(/set -g prefix 'C-b'/);
    expect(content).toMatch(/bind 'C-b' send-prefix/);
  });
});
