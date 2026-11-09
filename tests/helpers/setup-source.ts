import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/** setup.ts plus the lib/ modules it was split into, for source-text assertions. */
export function readSetupSource(): string {
  const root = join(__dirname, "..", "..");
  const libDir = join(root, "lib");
  const files = [
    join(root, "setup.ts"),
    ...readdirSync(libDir)
      .filter((file) => file.endsWith(".ts"))
      .sort()
      .map((file) => join(libDir, file)),
  ];
  return files.map((file) => readFileSync(file, "utf-8")).join("\n");
}
