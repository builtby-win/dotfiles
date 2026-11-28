import { checkbox, confirm } from "@inquirer/prompts";
import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { backupExistingPath, getSafeBackupName } from "./backup-policy";
import { log, HOME, MANIFEST_PATH, DOTFILES_BACKUP_DIR } from "./context";

// Backup manifest to track all backups
export interface BackupEntry {
  original: string;
  backup: string;
  type: "file" | "chezmoi";
  timestamp: number;
}

export interface BackupManifest {
  version: 1;
  entries: BackupEntry[];
}

export function loadManifest(): BackupManifest {
  if (existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    } catch {
      return { version: 1, entries: [] };
    }
  }
  return { version: 1, entries: [] };
}

export function saveManifest(manifest: BackupManifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

export function addToManifest(entry: Omit<BackupEntry, "timestamp">): void {
  const manifest = loadManifest();
  manifest.entries.push({ ...entry, timestamp: Date.now() });
  saveManifest(manifest);
}

export function pruneBackupFiles(prefix: string, keep = 1): void {
  if (!existsSync(DOTFILES_BACKUP_DIR)) {
    return;
  }

  const backups = readdirSync(DOTFILES_BACKUP_DIR)
    .filter((name) => name.startsWith(prefix))
    .sort((a, b) => b.localeCompare(a));

  if (backups.length <= keep) {
    return;
  }

  const staleBackups = new Set(backups.slice(keep));
  const manifest = loadManifest();

  for (const backupName of staleBackups) {
    rmSync(join(DOTFILES_BACKUP_DIR, backupName), { force: true });
  }

  manifest.entries = manifest.entries.filter((entry) => !staleBackups.has(entry.backup.split("/").pop() ?? ""));
  saveManifest(manifest);
}

export async function handleFileConflict(targetPath: string): Promise<"backup" | "skip" | "overwrite"> {
  if (!existsSync(targetPath)) return "overwrite";

  log.warning(`${targetPath} already exists; backing it up before replacing`);
  return "backup";
}

export function backupFile(filePath: string): string {
  const safeName = getSafeBackupName(filePath, HOME);
  const backupPath = backupExistingPath(filePath, HOME);
  pruneBackupFiles(`${safeName}.dotfiles-backup.`);
  log.info(`Backed up to ${backupPath}`);
  return backupPath;
}

export async function revertBackups(): Promise<void> {
  const manifest = loadManifest();

  if (manifest.entries.length === 0) {
    log.warning("No backups found to revert");
    return;
  }

  console.log("");
  log.step("Available backups to revert:");
  console.log("");

  // Group by original file
  const grouped = new Map<string, BackupEntry[]>();
  for (const entry of manifest.entries) {
    const existing = grouped.get(entry.original) || [];
    existing.push(entry);
    grouped.set(entry.original, existing);
  }

  // Show each original file with its backups
  const choices: { name: string; value: BackupEntry }[] = [];
  for (const [original, backups] of grouped) {
    // Sort by timestamp descending (most recent first)
    backups.sort((a, b) => b.timestamp - a.timestamp);
    const mostRecent = backups[0];
    const date = new Date(mostRecent.timestamp).toLocaleString();
    choices.push({
      name: `${original} (backup from ${date})`,
      value: mostRecent,
    });
  }

  const toRevert = await checkbox({
    message: "Select backups to restore:",
    choices,
  });

  if (toRevert.length === 0) {
    log.info("No backups selected");
    return;
  }

  const confirmed = await confirm({
    message: `Restore ${toRevert.length} backup(s)? This will overwrite current files.`,
    default: false,
  });

  if (!confirmed) {
    log.info("Cancelled");
    return;
  }

  console.log("");
  log.step("Reverting...");

  for (const entry of toRevert) {
    try {
      // Check if backup still exists
      if (!existsSync(entry.backup)) {
        log.error(`Backup file not found: ${entry.backup}`);
        continue;
      }

      // Restore the backup. Use rmSync because chezmoi-managed backups can be
      // directories such as ~/.config/tmux or ~/.config/nvim.
      if (existsSync(entry.original)) {
        rmSync(entry.original, { recursive: true, force: true });
      }
      renameSync(entry.backup, entry.original);
      log.success(`Restored ${entry.original}`);

      // Remove from manifest
      manifest.entries = manifest.entries.filter(
        (e) => !(e.original === entry.original && e.backup === entry.backup)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Failed to restore ${entry.original}: ${message}`);
    }
  }

  saveManifest(manifest);
  console.log("");
  log.success("Revert complete!");
}
