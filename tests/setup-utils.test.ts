import { describe, expect, it } from "vitest";
import {
  findConflictingSections,
  findNewSections,
  generateDiff,
  parseShellFile,
} from "../lib/shell-merge";
import {
  generateTmuxEntrypoint,
  normalizeTmuxEntrypoint,
  upsertTmuxMergeBlock,
} from "../lib/tmux-config";

describe("shell merge utilities", () => {
  it("classifies aliases and functions when parsing shell content", () => {
    const sections = parseShellFile("alias gs='git status'\n\nmkcd() {\n  mkdir -p \"$1\"\n}\n");

    expect(sections.map(({ name, type }) => ({ name, type }))).toEqual([
      { name: "gs", type: "alias" },
      { name: "mkcd", type: "function" },
    ]);
  });

  it("separates new sections from conflicting sections", () => {
    const current = parseShellFile("alias gs='git status'\n");
    const proposed = parseShellFile("alias gs='git status --short'\nalias ll='ls -la'\n");

    expect(findNewSections(current, proposed).map(({ name }) => name)).toEqual(["ll"]);
    expect(findConflictingSections(current, proposed).map(({ dotfiles }) => dotfiles.name)).toEqual(["gs"]);
  });

  it("renders additions and removals in a terminal diff", () => {
    expect(generateDiff("old", "new")).toContain("- old");
    expect(generateDiff("old", "new")).toContain("+ new");
  });
});

describe("tmux config utilities", () => {
  it("generates the basic bootstrap entrypoint", () => {
    expect(generateTmuxEntrypoint()).toContain('source-file "$HOME/.config/tmux/builtby/bootstrap.basic.conf"');
  });

  it("normalizes legacy direct sources into one bootstrap source", () => {
    const current = [
      'source-file "$HOME/.config/tmux/builtby/core.conf"',
      'source-file "$HOME/.config/tmux/builtby/basic.conf"',
      "",
    ].join("\n");

    expect(normalizeTmuxEntrypoint(current).trim()).toBe(
      'source-file "$HOME/.config/tmux/builtby/bootstrap.basic.conf"',
    );
  });

  it("replaces an existing managed pro merge block", () => {
    const current = [
      "set -g mouse on",
      "# === Added from builtby.win/dotfiles (tmux) ===",
      "source-file old.conf",
      "# === End builtby.win/dotfiles (tmux) ===",
      "",
    ].join("\n");

    const merged = upsertTmuxMergeBlock(current);

    expect(merged).toContain("set -g mouse on");
    expect(merged).not.toContain("source-file old.conf");
    expect(merged.match(/Added from builtby\.win\/dotfiles \(tmux\)/gu)).toHaveLength(1);
  });
});
