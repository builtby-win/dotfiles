import { cpSync, mkdirSync } from "fs";
import { relative, join } from "path";

export function getBuiltbyBackupDir(home: string): string {
  return join(home, ".builtby.win", "temp", "backups");
}

export function getSafeBackupName(filePath: string, home: string): string {
  const homeRelativePath = relative(home, filePath);
  const pathForName = homeRelativePath.startsWith("..") ? filePath.replace(/^\//, "") : homeRelativePath;
  return pathForName.replace(/[\\/:]/g, "__");
}

export function backupExistingPath(filePath: string, home: string, timestamp = Date.now()): string {
  const backupDir = getBuiltbyBackupDir(home);
  mkdirSync(backupDir, { recursive: true });

  const safeName = getSafeBackupName(filePath, home);
  const backupPath = join(backupDir, `${safeName}.dotfiles-backup.${timestamp}`);
  cpSync(filePath, backupPath, { recursive: true, verbatimSymlinks: true });

  return backupPath;
}
