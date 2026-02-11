import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNodeSetup, type NodeSetupDeps, type NodeSetupAPI } from "../lib/node-setup";
import type { SystemCommands } from "../lib/linux";

function mockLog() {
  return {
    step: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };
}

function mockDeps(overrides: Partial<NodeSetupDeps> = {}): NodeSetupDeps {
  return {
    sys: {
      runCommand: vi.fn().mockReturnValue(true),
      getCommandOutput: vi.fn().mockReturnValue(null),
    },
    home: "/home/testuser",
    env: {},
    installLinuxPackages: vi.fn().mockReturnValue(true),
    log: mockLog(),
    ...overrides,
  };
}

describe("createNodeSetup", () => {
  describe("ensurePnpmHome()", () => {
    it("uses XDG_DATA_HOME when set", () => {
      const deps = mockDeps({ env: { XDG_DATA_HOME: "/custom/data" } });
      const api = createNodeSetup(deps);
      const result = api.ensurePnpmHome();
      expect(result).not.toBeNull();
      expect(result!.pnpmHome).toBe("/custom/data/pnpm");
    });

    it("defaults to ~/.local/share/pnpm when XDG_DATA_HOME unset", () => {
      const deps = mockDeps();
      const api = createNodeSetup(deps);
      const result = api.ensurePnpmHome();
      expect(result).not.toBeNull();
      expect(result!.pnpmHome).toBe("/home/testuser/.local/share/pnpm");
    });

    it("rejects macOS paths and uses default instead", () => {
      const deps = mockDeps({ env: { PNPM_HOME: "/Users/mac-user/.pnpm" } });
      const api = createNodeSetup(deps);
      const result = api.ensurePnpmHome();
      expect(result).not.toBeNull();
      expect(result!.pnpmHome).toBe("/home/testuser/.local/share/pnpm");
    });

    it("uses PNPM_HOME when set to a valid Linux path", () => {
      const deps = mockDeps({ env: { PNPM_HOME: "/opt/pnpm" } });
      const api = createNodeSetup(deps);
      const result = api.ensurePnpmHome();
      expect(result).not.toBeNull();
      expect(result!.pnpmHome).toBe("/opt/pnpm");
    });

    it("returns null if mkdir fails for both paths", () => {
      const sys: SystemCommands = {
        runCommand: vi.fn().mockReturnValue(false),
        getCommandOutput: vi.fn().mockReturnValue(null),
      };
      const deps = mockDeps({ sys });
      const api = createNodeSetup(deps);
      const result = api.ensurePnpmHome();
      expect(result).toBeNull();
    });

    it("includes pnpmHome and ~/.local/bin in pathEntries", () => {
      const deps = mockDeps();
      const api = createNodeSetup(deps);
      const result = api.ensurePnpmHome();
      expect(result).not.toBeNull();
      expect(result!.pathEntries).toContain("/home/testuser/.local/share/pnpm");
      expect(result!.pathEntries).toContain("/home/testuser/.local/bin");
    });
  });

  describe("installFnm()", () => {
    it("skips if fnm already installed", () => {
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => cmd === "command -v fnm",
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installFnm()).toBe(true);
      expect(deps.log.success).toHaveBeenCalledWith("fnm already installed");
    });

    it("returns false if curl cannot reach fnm URL", () => {
      const deps = mockDeps({
        sys: {
          runCommand: () => false,
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installFnm()).toBe(false);
      expect(deps.log.error).toHaveBeenCalledWith(
        "Cannot access https://fnm.vercel.app/install",
      );
    });

    it("installs unzip if missing before fnm install", () => {
      const commandsRun: string[] = [];
      const deps = mockDeps({
        sys: {
          runCommand: (cmd, silent) => {
            commandsRun.push(cmd);
            if (cmd === "command -v fnm") return false;
            if (cmd === "command -v unzip" && commandsRun.filter((c) => c === "command -v unzip").length === 1) return false;
            if (cmd === "command -v unzip") return true;
            if (cmd.includes("fnm.vercel.app/install") && cmd.includes("> /dev/null")) return true;
            if (cmd.includes("fnm.vercel.app/install | bash")) return true;
            if (cmd.includes("test -x")) return true;
            return true;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installFnm()).toBe(true);
      expect(deps.installLinuxPackages).toHaveBeenCalledWith(["unzip"]);
    });

    it("returns false if fnm binary not found after install", () => {
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd === "command -v fnm") return false;
            if (cmd.includes("fnm.vercel.app/install") && cmd.includes("> /dev/null")) return true;
            if (cmd === "command -v unzip") return true;
            if (cmd.includes("fnm.vercel.app/install | bash")) return true;
            if (cmd.includes("test -x")) return false;
            return true;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installFnm()).toBe(false);
    });
  });

  describe("installNode()", () => {
    it("skips if node already installed", () => {
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => cmd === "command -v node",
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installNode()).toBe(true);
    });

    it("uses fnm when available", () => {
      const commandsRun: string[] = [];
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            commandsRun.push(cmd);
            if (cmd === "command -v node" && commandsRun.filter((c) => c === "command -v node").length === 1) return false;
            if (cmd === "command -v fnm") return true;
            if (cmd === "fnm install --lts") return true;
            if (cmd === "fnm use lts-latest") return true;
            if (cmd === "command -v node") return true;
            return false;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installNode()).toBe(true);
      expect(commandsRun).toContain("fnm install --lts");
      expect(commandsRun).toContain("fnm use lts-latest");
    });

    it("falls back to system package manager when fnm unavailable", () => {
      let nodeCallCount = 0;
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd === "command -v node") {
              nodeCallCount++;
              return nodeCallCount > 1;
            }
            if (cmd === "command -v fnm") return false;
            return false;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installNode()).toBe(true);
      expect(deps.installLinuxPackages).toHaveBeenCalledWith(["nodejs", "npm"]);
    });

    it("returns false if all install methods fail", () => {
      const deps = mockDeps({
        sys: {
          runCommand: () => false,
          getCommandOutput: () => null,
        },
        installLinuxPackages: vi.fn().mockReturnValue(false),
      });
      const api = createNodeSetup(deps);
      expect(api.installNode()).toBe(false);
    });
  });

  describe("installPnpm()", () => {
    it("skips if pnpm already installed", () => {
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => cmd === "command -v pnpm",
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installPnpm()).toBe(true);
    });

    it("tries corepack first", () => {
      const commandsRun: string[] = [];
      let pnpmCallCount = 0;
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            commandsRun.push(cmd);
            if (cmd === "command -v pnpm") {
              pnpmCallCount++;
              return pnpmCallCount > 1;
            }
            if (cmd === "command -v corepack") return true;
            if (cmd.includes("corepack enable")) return true;
            if (cmd.includes("corepack prepare")) return true;
            return false;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installPnpm()).toBe(true);
      expect(commandsRun).toContainEqual(expect.stringContaining("corepack enable"));
      expect(commandsRun).toContainEqual(expect.stringContaining("corepack prepare"));
    });

    it("falls back to package manager if corepack fails", () => {
      let pnpmCallCount = 0;
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd === "command -v pnpm") {
              pnpmCallCount++;
              // 1st: initial check, 2nd: after installLinuxPackages
              return pnpmCallCount >= 2;
            }
            if (cmd === "command -v corepack") return true;
            if (cmd.includes("corepack enable")) return false;
            return false;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.installPnpm()).toBe(true);
      expect(deps.installLinuxPackages).toHaveBeenCalledWith(["pnpm"]);
    });

    it("falls back to npm --prefix if package manager fails", () => {
      let pnpmCallCount = 0;
      const commandsRun: string[] = [];
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            commandsRun.push(cmd);
            if (cmd === "command -v pnpm") {
              pnpmCallCount++;
              // 1st: initial, 2nd: after npm --prefix (installLinuxPackages returns false so no pnpm check there)
              return pnpmCallCount >= 2;
            }
            if (cmd === "command -v corepack") return false;
            if (cmd.includes("npm install -g pnpm --prefix")) return true;
            return false;
          },
          getCommandOutput: () => null,
        },
        installLinuxPackages: vi.fn().mockReturnValue(false),
      });
      const api = createNodeSetup(deps);
      expect(api.installPnpm()).toBe(true);
      expect(commandsRun).toContainEqual(
        expect.stringContaining('npm install -g pnpm --prefix'),
      );
    });

    it("returns false if all methods fail", () => {
      const deps = mockDeps({
        sys: {
          runCommand: () => false,
          getCommandOutput: () => null,
        },
        installLinuxPackages: vi.fn().mockReturnValue(false),
      });
      const api = createNodeSetup(deps);
      expect(api.installPnpm()).toBe(false);
    });
  });

  describe("ensureNodeAndPnpm()", () => {
    it("full success flow", () => {
      let nodeCallCount = 0;
      let pnpmCallCount = 0;
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd === "command -v node") {
              nodeCallCount++;
              return nodeCallCount > 0;
            }
            if (cmd === "command -v pnpm") {
              pnpmCallCount++;
              return pnpmCallCount > 0;
            }
            if (cmd === "command -v npm") return true;
            if (cmd.includes("mkdir -p")) return true;
            return false;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.ensureNodeAndPnpm()).toBe(true);
      expect(deps.log.success).toHaveBeenCalledWith("Node.js and pnpm ready");
    });

    it("fails if node install fails", () => {
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd.includes("mkdir -p")) return true;
            return false;
          },
          getCommandOutput: () => null,
        },
        installLinuxPackages: vi.fn().mockReturnValue(false),
      });
      const api = createNodeSetup(deps);
      expect(api.ensureNodeAndPnpm()).toBe(false);
    });

    it("fails if pnpm install fails", () => {
      let nodeCallCount = 0;
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd.includes("mkdir -p")) return true;
            if (cmd === "command -v node") {
              nodeCallCount++;
              return nodeCallCount > 0;
            }
            if (cmd === "command -v npm") return true;
            if (cmd === "command -v pnpm") return false;
            return false;
          },
          getCommandOutput: () => null,
        },
        installLinuxPackages: vi.fn().mockReturnValue(false),
      });
      const api = createNodeSetup(deps);
      expect(api.ensureNodeAndPnpm()).toBe(false);
    });

    it("fails if PNPM_HOME cannot be initialized", () => {
      const deps = mockDeps({
        sys: {
          runCommand: () => false,
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.ensureNodeAndPnpm()).toBe(false);
      expect(deps.log.error).toHaveBeenCalledWith("Could not initialize PNPM_HOME");
    });

    it("installs npm if not available", () => {
      let nodeCallCount = 0;
      let pnpmCallCount = 0;
      const deps = mockDeps({
        sys: {
          runCommand: (cmd) => {
            if (cmd.includes("mkdir -p")) return true;
            if (cmd === "command -v node") {
              nodeCallCount++;
              return nodeCallCount > 0;
            }
            if (cmd === "command -v npm") return false;
            if (cmd === "command -v pnpm") {
              pnpmCallCount++;
              return pnpmCallCount > 0;
            }
            return false;
          },
          getCommandOutput: () => null,
        },
      });
      const api = createNodeSetup(deps);
      expect(api.ensureNodeAndPnpm()).toBe(true);
      expect(deps.installLinuxPackages).toHaveBeenCalledWith(["npm"]);
    });
  });
});
