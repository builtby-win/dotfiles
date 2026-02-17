import { describe, it, expect } from "vitest";
import { getEmptyManifest, setFeature, isFeatureEnabled } from "../lib/manifest";

describe("manifest", () => {
  it("should not have beads in the default empty manifest", () => {
    const manifest = getEmptyManifest();
    // @ts-expect-error - beads should be removed from types
    expect(manifest.features.beads).toBeUndefined();
  });

  it("should be able to set and check features", () => {
    const manifest = getEmptyManifest();
    setFeature(manifest, "ai_configs", true);
    expect(isFeatureEnabled(manifest, "ai_configs")).toBe(true);
    expect(isFeatureEnabled(manifest, "non_existent")).toBe(false);
  });

  it("should not allow setting beads feature once removed from types", () => {
    const manifest = getEmptyManifest();
    // This test is mostly for type checking, but we can verify it doesn't exist by default
    expect(isFeatureEnabled(manifest, "beads")).toBe(false);
  });
});
