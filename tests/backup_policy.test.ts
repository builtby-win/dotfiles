import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { backupExistingPath, getBuiltbyBackupDir } from "../lib/backup-policy";

describe("backup policy", () => {
  it("stores setup backups under ~/.builtby.win/temp/backups", () => {
    const home = mkdtempSync(join(tmpdir(), "builtby-home-"));

    expect(getBuiltbyBackupDir(home)).toBe(join(home, ".builtby.win", "temp", "backups"));
  });

  it("backs up an existing file before replacement without prompting", () => {
    const home = mkdtempSync(join(tmpdir(), "builtby-home-"));
    const existingPath = join(home, ".config", "nvim", "init.lua");
    mkdirSync(join(home, ".config", "nvim"), { recursive: true });
    writeFileSync(existingPath, "user config");

    const backupPath = backupExistingPath(existingPath, home, 1234567890);

    expect(backupPath).toBe(
      join(home, ".builtby.win", "temp", "backups", ".config__nvim__init.lua.dotfiles-backup.1234567890"),
    );
    expect(existsSync(backupPath)).toBe(true);
    expect(readFileSync(backupPath, "utf-8")).toBe("user config");
  });
});
