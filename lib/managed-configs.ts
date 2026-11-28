import { existsSync, unlinkSync, lstatSync, readlinkSync, rmSync } from "fs";
import { join } from "path";
import { addToManifest, backupFile } from "./backups";
import { getCurrentPlatform } from "./catalog";
import { log, DOTFILES_DIR, HOME } from "./context";
import { writeDotfilesPath, CHEZMOI_TARGETS, selectedChezmoiApplyTargets } from "./managed-targets";
import { setupTpm } from "./post-setup";
import { setupZshEntrypoint, setupTmuxEntrypoint } from "./shell-setup";
import { runCommand } from "./system";

export function isLegacyStowSymlink(targetPath: string): boolean {
  try {
    const stats = lstatSync(targetPath);
    if (!stats.isSymbolicLink()) return false;
    const linkPath = readlinkSync(targetPath);
    return linkPath.includes(`${DOTFILES_DIR}/stow-packages`) || linkPath.includes("stow-packages");
  } catch {
    return false;
  }
}

export function migrateLegacyStowSymlinks(configs: string[]): void {
  const targets = new Set<string>();
  for (const config of configs) {
    for (const target of CHEZMOI_TARGETS[config] ?? []) {
      targets.add(join(HOME, target));
    }
  }

  for (const targetPath of targets) {
    if (!isLegacyStowSymlink(targetPath)) continue;
    unlinkSync(targetPath);
    log.info(`Removed legacy stow symlink: ${targetPath}`);
  }
}

export function backupRealManagedTargets(configs: string[]): void {
  const targets = new Set<string>();
  for (const config of configs) {
    for (const target of CHEZMOI_TARGETS[config] ?? []) {
      targets.add(join(HOME, target));
    }
  }

  for (const targetPath of targets) {
    if (!existsSync(targetPath)) continue;

    const stats = lstatSync(targetPath);
    if (stats.isSymbolicLink()) continue;

    const backupPath = backupFile(targetPath);
    addToManifest({ original: targetPath, backup: backupPath, type: "chezmoi" });
    rmSync(targetPath, { recursive: true, force: true });
    log.info(`Backed up existing managed path before chezmoi apply: ${targetPath}`);
  }
}

export function applyChezmoi(configs: string[]): boolean {
  const applyScript = join(DOTFILES_DIR, "scripts", "apply-chezmoi.sh");
  if (!existsSync(applyScript)) {
    log.error(`chezmoi apply helper not found: ${applyScript}`);
    return false;
  }

  const targets = selectedChezmoiApplyTargets(configs);
  if (targets.length === 0) {
    log.info("No selected chezmoi targets to apply");
    return true;
  }

  const quotedTargets = targets.map((target) => `"${target.replace(/"/g, '\\"')}"`).join(" ");
  return runCommand(`bash "${applyScript}" ${quotedTargets}`);
}

export async function setupManagedConfigs(configs: string[]): Promise<void> {
  if (configs.length === 0) return;

  log.step("Applying selected configs...");
  writeDotfilesPath();

  const chezmoiConfigs = configs.filter((config) => config !== "iterm2");

  if (configs.includes("zsh")) {
    setupZshEntrypoint();
  }

  if (configs.includes("tmux")) {
    const shouldContinue = await setupTmuxEntrypoint();
    if (!shouldContinue) {
      log.info("Skipping tmux entrypoint changes");
    }
  }

  migrateLegacyStowSymlinks(chezmoiConfigs);
  backupRealManagedTargets(chezmoiConfigs);

  if (applyChezmoi(chezmoiConfigs)) {
    log.success("Selected chezmoi-managed configs applied");
    if (configs.includes("tmux")) {
      setupTpm();
    }
  } else {
    log.error("Failed to apply chezmoi-managed configs");
  }

  if (configs.includes("iterm2")) {
    applyITermDefaults();
  }
}

export function applyITermDefaults(): void {
  if (getCurrentPlatform() !== "macos") return;

  const scriptPath = join(DOTFILES_DIR, "scripts", "setup-iterm-defaults.sh");
  if (!existsSync(scriptPath)) {
    log.warning(`iTerm2 defaults helper not found: ${scriptPath}`);
    return;
  }

  if (runCommand(`bash "${scriptPath}"`)) {
    log.success("iTerm2 defaults applied");
  } else {
    log.warning("Failed to apply iTerm2 defaults");
  }
}
