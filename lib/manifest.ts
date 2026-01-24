import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

/**
 * Setup Manifest - tracks what the user has installed/selected
 * Allows features to be conditionally loaded based on user selections
 */

export interface BackupEntry {
  original: string;
  backup: string;
  type: "file" | "stow";
  stowPackage?: string;
  timestamp: number;
}

export interface SetupManifest {
  version: 1;
  timestamp: number;
  apps: string[]; // ["ghostty", "vscode", ...]
  configs: string[]; // ["zsh", "tmux", ...]
  features: {
    beads?: boolean;
    ai_configs?: boolean;
    [key: string]: boolean | undefined;
  };
  backups: BackupEntry[];
}

const MANIFEST_DIR = join(homedir(), ".config", "dotfiles");
const MANIFEST_PATH = join(MANIFEST_DIR, "setup-manifest.json");

/**
 * Load the setup manifest, or return empty template if doesn't exist
 */
export function loadManifest(): SetupManifest {
  if (existsSync(MANIFEST_PATH)) {
    try {
      const content = readFileSync(MANIFEST_PATH, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.warn(`Failed to parse manifest at ${MANIFEST_PATH}, using empty`);
      return getEmptyManifest();
    }
  }
  return getEmptyManifest();
}

/**
 * Save manifest to disk
 */
export function saveManifest(manifest: SetupManifest): void {
  // Ensure directory exists
  if (!existsSync(MANIFEST_DIR)) {
    mkdirSync(MANIFEST_DIR, { recursive: true });
  }

  manifest.timestamp = Date.now();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/**
 * Get empty/template manifest
 */
export function getEmptyManifest(): SetupManifest {
  return {
    version: 1,
    timestamp: 0,
    apps: [],
    configs: [],
    features: {},
    backups: [],
  };
}

/**
 * Add backup entry to manifest
 */
export function addBackup(
  manifest: SetupManifest,
  original: string,
  backup: string,
  type: "file" | "stow",
  stowPackage?: string
): void {
  manifest.backups.push({
    original,
    backup,
    type,
    stowPackage,
    timestamp: Date.now(),
  });
}

/**
 * Update app list in manifest
 */
export function setInstalledApps(manifest: SetupManifest, apps: string[]): void {
  manifest.apps = apps;
}

/**
 * Update config list in manifest
 */
export function setInstalledConfigs(manifest: SetupManifest, configs: string[]): void {
  manifest.configs = configs;
}

/**
 * Update feature flag
 */
export function setFeature(manifest: SetupManifest, feature: string, enabled: boolean): void {
  manifest.features[feature] = enabled;
}

/**
 * Update multiple features
 */
export function setFeatures(manifest: SetupManifest, features: Record<string, boolean>): void {
  manifest.features = { ...manifest.features, ...features };
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(manifest: SetupManifest, feature: string): boolean {
  return manifest.features[feature] === true;
}

/**
 * Get path to manifest file (for shell scripts)
 */
export function getManifestPath(): string {
  return MANIFEST_PATH;
}
