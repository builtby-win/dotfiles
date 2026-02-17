import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("stow-packages/tmux/.tmux.conf verification", () => {
  const tmuxPath = join(process.cwd(), "stow-packages", "tmux", ".tmux.conf");
  const content = readFileSync(tmuxPath, "utf-8");

  it("should not bind M-c to new-window", () => {
    // Current binding: bind -n M-c new-window -c "#{pane_current_path}"
    // We want this removed or changed.
    const binding = 'bind -n M-c new-window';
    expect(content).not.toContain(binding);
  });

  it("should bind M-c to copy-pipe and cancel (pbcopy)", () => {
    // Expected: bind -n M-c copy-mode \; send-keys -X copy-pipe-and-cancel "pbcopy"
    // Or similar mapping to yank text
    expect(content).toContain('bind -n M-c');
    expect(content).toContain('copy-pipe');
    expect(content).toContain('pbcopy');
  });

  it("should bind Leader + / to command palette", () => {
    // Expected: bind / display-popup ... (instead of bind p)
    expect(content).toMatch(/bind \/ display-popup/);
  });

  it("should bind > and < to swap-pane", () => {
    expect(content).toContain('bind -r > swap-pane -D');
    expect(content).toContain('bind -r < swap-pane -U');
  });
});
