import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { log, DOTFILES_DIR } from "./context";

export type SetupPathChoice = "focus" | "standard" | "minimal" | "customize" | "ai_agent";

export function getBootstrapSetupPath(argv: string[]): SetupPathChoice | null {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] !== "--setup-path") continue;

    const value = argv[index + 1];
    if (value === "focus" || value === "standard" || value === "minimal" || value === "customize" || value === "ai_agent") {
      return value;
    }

    return null;
  }

  return null;
}

// ============================================
// Preset configs (JSON: general presets in presets/, or any individualized file)
// ============================================

export interface SetupPreset {
  name?: string;
  /** Full app selection; replaces the checked defaults when present. */
  apps?: string[];
  /** Added on top of the checked defaults (ignored when `apps` is present). */
  addApps?: string[];
  /** Removed from the selection (applied last). */
  removeApps?: string[];
  /** Managed config values; defaults to the checked defaults when absent. */
  configs?: string[];
  /** Optional feature values; defaults to the checked defaults when absent. */
  features?: string[];
}

export function getPresetRef(argv: string[]): string | null {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--preset" && argv[index + 1]) return argv[index + 1];
  }
  return process.env.DOTFILES_PRESET || null;
}

export function resolvePresetPath(ref: string): string {
  // A name ("basic") resolves inside the repo's presets/; anything path-like is used as-is.
  if (ref.endsWith(".json") || ref.includes("/") || ref.startsWith(".")) return ref;
  return join(DOTFILES_DIR, "presets", `${ref}.json`);
}

export function loadPreset(ref: string): SetupPreset {
  const presetPath = resolvePresetPath(ref);
  let raw: string;
  try {
    raw = readFileSync(presetPath, "utf-8");
  } catch {
    log.error(`Preset not found: ${presetPath}`);
    log.error(`Pass a name from ${join(DOTFILES_DIR, "presets")} or a path to a preset JSON file.`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw) as SetupPreset;
  } catch {
    log.error(`Preset is not valid JSON: ${presetPath}`);
    process.exit(1);
  }
}

export function validatePresetValues(kind: string, values: string[] | undefined, valid: Set<string>): void {
  if (!values) return;
  const unknown = values.filter((value) => !valid.has(value));
  if (unknown.length > 0) {
    log.error(`Preset has unknown ${kind}: ${unknown.join(", ")}`);
    log.error(`Valid ${kind}: ${[...valid].join(", ")}`);
    process.exit(1);
  }
}

/** General presets shipped in presets/, offered in the first-run CLI menu. */
export function listPresets(): Array<{ ref: string; label: string }> {
  const presetsDir = join(DOTFILES_DIR, "presets");
  if (!existsSync(presetsDir)) return [];
  return readdirSync(presetsDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const ref = file.replace(/\.json$/, "");
      try {
        const parsed = JSON.parse(readFileSync(join(presetsDir, file), "utf-8")) as SetupPreset;
        return { ref, label: parsed.name ?? ref };
      } catch {
        return { ref, label: ref };
      }
    });
}
