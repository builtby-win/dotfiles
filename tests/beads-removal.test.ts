import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("setup.ts beads removal", () => {
  const setupPath = join(process.cwd(), "setup.ts");
  const content = readFileSync(setupPath, "utf-8");

  it("should not contain beads in OPTIONAL_FEATURES", () => {
    // This is a bit of a heuristic check on the file content itself
    const optionalFeaturesMatch = content.match(/const OPTIONAL_FEATURES = \[([\s\S]*?)\];/);
    if (optionalFeaturesMatch) {
      const featuresBlock = optionalFeaturesMatch[1];
      expect(featuresBlock).not.toContain('"beads"');
      expect(featuresBlock).not.toContain("'beads'");
    }
  });

  it("should not contain isBeadsFeatureActive function", () => {
    expect(content).not.toContain("function isBeadsFeatureActive()");
  });

  it("should not contain beads detection in autoDetectExistingSetup", () => {
    expect(content).not.toContain("detected.features.beads = isBeadsFeatureActive();");
  });
});
