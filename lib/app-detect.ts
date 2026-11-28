import { checkbox } from "@inquirer/prompts";
import { execSync } from "child_process";
import { existsSync, readFileSync, lstatSync, readlinkSync } from "fs";
import { join } from "path";
import * as manifest from "./manifest";
import { getCurrentPlatform, APPS, MANAGED_CONFIGS, type App } from "./catalog";
import { colors, HOME, ZSHRC_MARKER_START } from "./context";
import { CHEZMOI_TARGETS } from "./managed-targets";
import { runCommand, getCommandOutput, linuxPM, getLinuxPackageName } from "./system";

export interface DetectedSetup {
  apps: string[];
  configs: string[];
  features: Record<string, boolean>;
}

/**
 * Detect what apps/configs/features the user already has installed.
 * Used for first-run migration when no setup manifest exists.
 */
export function autoDetectExistingSetup(): DetectedSetup {
  const detected: DetectedSetup = {
    apps: [],
    configs: [],
    features: {},
  };

  // Detect installed apps using existing getAppInstallState
  for (const app of APPS) {
    const state = getAppInstallState(app);
    if (state === "installed" || state === "partial") {
      detected.apps.push(app.value);
    }
  }

  // Detect installed managed configs using existing isManagedConfigApplied
  for (const config of MANAGED_CONFIGS) {
    if (isManagedConfigApplied(config.value)) {
      detected.configs.push(config.value);
    }
  }

  return detected;
}

/**
 * Check if setup manifest already exists.
 */
export function manifestExists(): boolean {
  const manifestPath = manifest.getManifestPath();
  return existsSync(manifestPath);
}

// Cache for installed package manager data (populated once, used many times)
let installedFormulasCache: Set<string> | null = null;

let installedCasksCache: Set<string> | null = null;

export function getInstalledFormulas(): Set<string> {
  if (installedFormulasCache) return installedFormulasCache;

  if (getCurrentPlatform() !== "macos") {
    installedFormulasCache = new Set();
    return installedFormulasCache;
  }

  try {
    const output = execSync("brew list --formula 2>/dev/null", { encoding: "utf-8" });
    installedFormulasCache = new Set(output.trim().split("\n").filter(Boolean));
  } catch {
    installedFormulasCache = new Set();
  }
  return installedFormulasCache;
}

export function getInstalledCasks(): Set<string> {
  if (installedCasksCache) return installedCasksCache;

  if (getCurrentPlatform() !== "macos") {
    installedCasksCache = new Set();
    return installedCasksCache;
  }

  try {
    const output = execSync("brew list --cask 2>/dev/null", { encoding: "utf-8" });
    installedCasksCache = new Set(output.trim().split("\n").filter(Boolean));
  } catch {
    installedCasksCache = new Set();
  }
  return installedCasksCache;
}

export function getInstalledLinuxPackages(): Set<string> {
  if (getCurrentPlatform() !== "linux") return new Set();
  return linuxPM.getInstalledPackages();
}

export type AppInstallState = "installed" | "partial" | "not_installed";

export function getAppInstallState(app: App): AppInstallState {
  const currentPlatform = getCurrentPlatform();

  // Check the main app first
  let mainAppInstalled = false;

  // Priority 1: Custom path check (fastest - no shell execution)
  if (app.detectPath) {
    mainAppInstalled = existsSync(app.detectPath);
  }
  // Priority 2: Custom command check
  else if (app.detectCmd) {
    mainAppInstalled = runCommand(app.detectCmd, true);
  }
  // Priority 3: Package manager / command checks
  else if (app.brewName) {
    if (currentPlatform === "linux") {
      const linuxPackage = getLinuxPackageName(app.brewName);
      const linuxPackages = getInstalledLinuxPackages();
      mainAppInstalled = (linuxPackage ? linuxPackages.has(linuxPackage) : false)
        || runCommand(`command -v ${app.value}`, true)
        || (linuxPackage ? runCommand(`command -v ${linuxPackage}`, true) : false);
    } else {
      mainAppInstalled = app.cask
        ? getInstalledCasks().has(app.brewName)
        : getInstalledFormulas().has(app.brewName);
    }
  }

  if (!mainAppInstalled) return "not_installed";

  // Check dependencies are also installed
  if (app.dependencies) {
    if (currentPlatform === "linux") {
      const linuxPackages = getInstalledLinuxPackages();
      for (const dep of app.dependencies) {
        const linuxDep = getLinuxPackageName(dep);
        if (!linuxDep) {
          return "partial";
        }
        const depInstalled = linuxPackages.has(linuxDep) || runCommand(`command -v ${linuxDep}`, true);
        if (!depInstalled) {
          return "partial";
        }
      }
    } else {
      const formulas = getInstalledFormulas();
      for (const dep of app.dependencies) {
        if (!formulas.has(dep)) {
          return "partial"; // Main app installed, but missing dependencies
        }
      }
    }
  }

  return "installed";
}

export function formatAppChoiceName(app: App, state: AppInstallState): string {
  const descPart = app.desc ? ` ${colors.dim}- ${app.desc}${colors.reset}` : "";
  if (state === "installed") {
    return `${app.name}${descPart} ${colors.green}(installed)${colors.reset}`;
  }
  if (state === "partial") {
    return `${app.name}${descPart} ${colors.yellow}(missing extras)${colors.reset}`;
  }
  return `${app.name}${descPart}`;
}

export async function selectFocusedWorkflowApps(
  selectableApps: App[],
  appStates: Map<string, AppInstallState>,
  installItemLabel: string,
): Promise<string[]> {
  console.log(`  ${colors.dim}Focused setup starts with the recommended AI/dev workflow selected, including OpenCode. Codex and Ghostty stay optional.${colors.reset}`);
  console.log("");

  return checkbox({
    message: `Select ${installItemLabel} for the full AI/dev workflow:`,
    choices: selectableApps.map((app) => {
      const state = appStates.get(app.value) ?? "not_installed";
      return {
        name: formatAppChoiceName(app, state),
        value: app.value,
        checked: state !== "not_installed" || (app.checked ?? false),
        disabled: false,
      };
    }),
    pageSize: 20,
    loop: false,
  });
}

export function isAppInstalled(app: App): boolean {
  return getAppInstallState(app) === "installed";
}

export function isManagedConfigApplied(config: string): boolean {
  if (config === "iterm2") {
    if (getCurrentPlatform() !== "macos") return false;
    const globalKeyMap = getCommandOutput('defaults read com.googlecode.iterm2 GlobalKeyMap 2>/dev/null') ?? "";
    return globalKeyMap.includes('0x7f-0x100000-0x33') && globalKeyMap.includes('0x7f-0x80000-0x33');
  }

  const targets = CHEZMOI_TARGETS[config];
  if (!targets) return false;

  if (config === "zsh") {
    const zshrcPath = join(HOME, ".zshrc");
    if (!existsSync(zshrcPath)) return false;

    try {
      const stats = lstatSync(zshrcPath);
      if (stats.isSymbolicLink()) {
        return false;
      }

      const zshrcContent = readFileSync(zshrcPath, "utf-8");
      if (!zshrcContent.includes(ZSHRC_MARKER_START)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return targets.every((target) => {
    const targetPath = join(HOME, target);
    if (!existsSync(targetPath)) return false;

    try {
      const stats = lstatSync(targetPath);
      if (stats.isSymbolicLink()) {
        // Read the symlink path itself, not the file content
        const linkPath = readlinkSync(targetPath);
        return linkPath.includes("builtby.win/dotfiles") || linkPath.includes("chezmoi");
      }
    } catch {
      return false;
    }

    return true;
  });
}
