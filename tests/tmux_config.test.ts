import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("tmux profile split", () => {
  const tmuxDir = join(process.cwd(), "stow-packages", "tmux", ".config", "tmux", "builtby");
  const coreConf = readFileSync(join(tmuxDir, "core.conf"), "utf-8");
  const basicConf = readFileSync(join(tmuxDir, "basic.conf"), "utf-8");
  const proConf = readFileSync(join(tmuxDir, "pro.conf"), "utf-8");
  const bootstrapBasicConf = readFileSync(join(tmuxDir, "bootstrap.basic.conf"), "utf-8");

  it("keeps beginner remaps in basic profile", () => {
    expect(basicConf).toContain("bind d split-window -h -c \"#{pane_current_path}\"");
    expect(basicConf).toContain("bind D split-window -v -c \"#{pane_current_path}\"");
    expect(basicConf).toContain("bind w if-shell");
  });

  it("keeps pro profile non-invasive for keybinds", () => {
    expect(proConf).not.toMatch(/^\s*bind(?:-key)?\b/m);
    expect(proConf).not.toMatch(/^\s*unbind(?:-key)?\b/m);
  });

  it("loads core + basic + user overrides in bootstrap", () => {
    expect(bootstrapBasicConf).toContain("source-file \"$HOME/.config/tmux/builtby/core.conf\"");
    expect(bootstrapBasicConf).toContain("source-file \"$HOME/.config/tmux/builtby/basic.conf\"");
    expect(bootstrapBasicConf).toContain("source-file \"$HOME/.tmux.local.conf\"");
  });

  it("keeps command palette delimiter in basic profile", () => {
    expect(basicConf).toContain(" ::: ");
    expect(basicConf).toContain('--delimiter " ::: "');
    expect(basicConf).toContain('--with-nth "1..3"');
  });

  it("puts shared defaults in core and prefix in basic", () => {
    expect(coreConf).toContain("set -g mouse on");
    expect(basicConf).toMatch(/set -g prefix 'C-b'/);
    expect(basicConf).toMatch(/bind 'C-b' send-prefix/);
  });
});

describe("tmux setup safety", () => {
  const setupTs = readFileSync(join(process.cwd(), "setup.ts"), "utf-8");

  it("offers keep-my-keybinds path for existing tmux users", () => {
    expect(setupTs).toContain("Keep my existing keybinds (recommended)");
    expect(setupTs).toContain("Replace with builtby basic profile (backup mine first)");
  });
});
