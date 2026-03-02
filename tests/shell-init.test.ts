import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("shell/init.sh cleanup", () => {
  const initPath = join(process.cwd(), "shell", "init.sh");
  const content = readFileSync(initPath, "utf-8");

  it("should not contain beads sourcing logic", () => {
    expect(content).not.toContain("features.beads == true");
    expect(content).not.toContain("beads.sh");
  });

  it("should not source experimental beads script", () => {
    expect(content).not.toContain("experimental/beads.sh");
  });

  it("should source machine-local shell overrides first", () => {
    expect(content).toContain('DOTFILES_LOCAL_SHELL="$HOME/.config/dotfiles/local.sh"');
    expect(content).toContain('source "$DOTFILES_LOCAL_SHELL"');
    expect(content).toContain('source "$DOTFILES_SHELL_DIR/local.sh"');
  });
});
