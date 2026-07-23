import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const codexTemplateDir = resolve(__dirname, "../templates/codex");

describe("Codex platform config templates", () => {
  it("provides a shared base and an overlay for each supported OS", () => {
    for (const name of ["config.base.toml", "config.macos.toml", "config.linux.toml", "config.windows.toml"]) {
      expect(existsSync(resolve(codexTemplateDir, name))).toBe(true);
    }
  });

  it("gives every managed agent a portable base and OS overlays", () => {
    const agentTemplates = [
      ["claude", "settings"],
      ["codex", "hooks"],
      ["gemini", "settings"],
      ["opencode", "opencode"],
    ];

    for (const [agent, name] of agentTemplates) {
      for (const suffix of ["base", "linux", "macos", "windows"]) {
        expect(existsSync(resolve(codexTemplateDir, "..", agent, `${name}.${suffix}.json`))).toBe(true);
      }
    }
  });

  it("keeps macOS-only MCP servers out of portable and non-macOS configs", () => {
    const base = readFileSync(resolve(codexTemplateDir, "config.base.toml"), "utf-8");
    const linux = readFileSync(resolve(codexTemplateDir, "config.linux.toml"), "utf-8");
    const windows = readFileSync(resolve(codexTemplateDir, "config.windows.toml"), "utf-8");
    const macos = readFileSync(resolve(codexTemplateDir, "config.macos.toml"), "utf-8");

    for (const content of [base, linux, windows]) {
      expect(content).not.toMatch(/cua-driver|pencil|posthog/);
      expect(content).not.toContain("/Users/");
    }
    expect(macos).toContain("[mcp_servers.pencil]");
    expect(macos).toContain('[mcp_servers."cua-driver"]');
  });

  it("renders platform configs from a base plus the current platform overlay", () => {
    const setup = readFileSync(resolve(__dirname, "../setup.ts"), "utf-8");
    expect(setup).toContain("function renderCodexConfig(): string");
    expect(setup).toContain("function renderPlatformJsonConfig(config: string, template: string): string");
    expect(setup).toContain("config.${currentPlatform}.toml");
  });
});
