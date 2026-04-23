import { describe, it, expect } from "vitest";
import { getEmptyManifest, setFeature, isFeatureEnabled } from "../lib/manifest";

describe("manifest", () => {
  it("should not have beads in the default empty manifest", () => {
    const manifest = getEmptyManifest();
    expect(manifest.features.beads).toBeUndefined();
  });

  it("should be able to set and check features", () => {
    const manifest = getEmptyManifest();
    setFeature(manifest, "ai_configs", true);
    expect(isFeatureEnabled(manifest, "ai_configs")).toBe(true);
    expect(isFeatureEnabled(manifest, "non_existent")).toBe(false);
  });

  it("should treat removed features as disabled by default", () => {
    const manifest = getEmptyManifest();
    expect(isFeatureEnabled(manifest, "beads")).toBe(false);
  });
});
