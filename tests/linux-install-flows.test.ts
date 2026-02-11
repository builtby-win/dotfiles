import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLinuxPackageManager, type SystemCommands } from "../lib/linux";
import { createNodeSetup } from "../lib/node-setup";

function createMockSystem(installedCommands: Set<string> = new Set()) {
  const commandLog: string[] = [];

  const sys: SystemCommands = {
    runCommand(cmd: string, silent?: boolean): boolean {
      commandLog.push(cmd);
      const cmdMatch = cmd.match(/^command -v (\S+)$/);
      if (cmdMatch) {
        return installedCommands.has(cmdMatch[1]);
      }
      if (cmd.startsWith("mkdir")) return true;
      const testMatch = cmd.match(/^test -x ".*\/(\w+)"$/);
      if (testMatch) return installedCommands.has(testMatch[1]);
      return true;
    },
    getCommandOutput(cmd: string): string | null {
      commandLog.push(cmd);
      if (cmd.includes("dpkg-query")) return "git\ncurl\nstow\n";
      if (cmd.includes("rpm -qa")) return "git\ncurl\nstow\n";
      if (cmd.includes("pacman -Qq")) return "git\ncurl\nstow\n";
      return null;
    },
  };

  return { sys, commandLog, installedCommands };
}

const mockLog = {
  step: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Fresh Ubuntu install", () => {
  it("detects apt and installs packages correctly", () => {
    const { sys, commandLog } = createMockSystem(new Set(["apt-get"]));
    const pm = createLinuxPackageManager(sys);

    expect(pm.detect()).toBe("apt");

    pm.install(["stow"]);
    expect(commandLog).toContain("sudo apt-get update");
    expect(commandLog).toContain("sudo apt-get install -y stow");
  });

  it("runs full node setup flow with fnm already installed", () => {
    const installed = new Set(["apt-get", "curl", "unzip", "fnm", "npm", "corepack"]);
    const { sys, commandLog } = createMockSystem(installed);

    const originalRunCommand = sys.runCommand.bind(sys);
    sys.runCommand = (cmd: string, silent?: boolean) => {
      const result = originalRunCommand(cmd, silent);
      if (cmd.includes("fnm install --lts")) {
        installed.add("node");
      }
      if (cmd.includes("corepack prepare pnpm")) {
        installed.add("pnpm");
      }
      return result;
    };

    const pm = createLinuxPackageManager(sys);
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: {},
      installLinuxPackages: (pkgs) => pm.install(pkgs),
      log: mockLog,
    });

    expect(nodeSetup.ensureNodeAndPnpm()).toBe(true);
    expect(commandLog.some((c) => c.includes("fnm install --lts"))).toBe(true);
    expect(commandLog.some((c) => c.includes("fnm default lts-latest"))).toBe(true);
  });

  it("installs fnm then uses it for node", () => {
    const installed = new Set(["apt-get", "curl", "unzip"]);
    const { sys, commandLog } = createMockSystem(installed);

    const originalRunCommand = sys.runCommand.bind(sys);
    sys.runCommand = (cmd: string, silent?: boolean) => {
      const result = originalRunCommand(cmd, silent);
      if (cmd.includes("fnm.vercel.app/install | bash")) {
        installed.add("fnm");
      }
      if (cmd.includes("fnm install --lts")) {
        installed.add("node");
      }
      return result;
    };

    const pm = createLinuxPackageManager(sys);
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: {},
      installLinuxPackages: (pkgs) => pm.install(pkgs),
      log: mockLog,
    });

    expect(nodeSetup.installFnm()).toBe(true);
    expect(nodeSetup.installNode()).toBe(true);
    expect(commandLog.some((c) => c.includes("fnm.vercel.app/install | bash"))).toBe(true);
    expect(commandLog.some((c) => c.includes("fnm install --lts"))).toBe(true);
    expect(commandLog.some((c) => c.includes("fnm default lts-latest"))).toBe(true);
  });
});

describe("Fedora with existing node", () => {
  it("detects dnf and skips node install", () => {
    const { sys } = createMockSystem(new Set(["dnf", "node", "npm", "corepack"]));
    const pm = createLinuxPackageManager(sys);
    expect(pm.detect()).toBe("dnf");

    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: {},
      installLinuxPackages: (pkgs) => pm.install(pkgs),
      log: mockLog,
    });

    expect(nodeSetup.installNode()).toBe(true);
  });

  it("uses dnf flags correctly", () => {
    const { sys, commandLog } = createMockSystem(new Set(["dnf"]));
    const pm = createLinuxPackageManager(sys);
    pm.install(["tmux", "fzf"]);
    expect(commandLog).toContain("sudo dnf install -y tmux fzf");
  });
});

describe("Arch Linux", () => {
  it("detects pacman and uses correct flags", () => {
    const { sys, commandLog } = createMockSystem(new Set(["pacman"]));
    const pm = createLinuxPackageManager(sys);
    expect(pm.detect()).toBe("pacman");
    pm.install(["git", "stow"]);
    expect(commandLog).toContain("sudo pacman -S --noconfirm --needed git stow");
  });
});

describe("Node setup failure handling", () => {
  it("fails gracefully when fnm URL is unreachable", () => {
    const { sys } = createMockSystem(new Set(["apt-get", "curl"]));
    const originalRunCommand = sys.runCommand.bind(sys);
    sys.runCommand = (cmd: string, silent?: boolean) => {
      if (cmd.includes("fnm.vercel.app")) return false;
      return originalRunCommand(cmd, silent);
    };

    const pm = createLinuxPackageManager(sys);
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: {},
      installLinuxPackages: (pkgs) => pm.install(pkgs),
      log: mockLog,
    });

    expect(nodeSetup.installFnm()).toBe(false);
  });

  it("falls back to system packages when fnm unavailable", () => {
    const installed = new Set(["apt-get"]);
    const { sys, commandLog } = createMockSystem(installed);
    const originalRunCommand = sys.runCommand.bind(sys);
    sys.runCommand = (cmd: string, silent?: boolean) => {
      if (cmd.includes("curl")) return false;
      const result = originalRunCommand(cmd, silent);
      if (cmd.includes("apt-get install") && cmd.includes("nodejs")) {
        installed.add("node");
        installed.add("npm");
      }
      return result;
    };

    const pm = createLinuxPackageManager(sys);
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: {},
      installLinuxPackages: (pkgs) => pm.install(pkgs),
      log: mockLog,
    });

    expect(nodeSetup.installNode()).toBe(true);
    expect(commandLog.some((c) => c.includes("apt-get install") && c.includes("nodejs"))).toBe(true);
  });

  it("pnpm fallback chain: corepack fails → package manager fails → npm prefix", () => {
    const installed = new Set(["apt-get", "node", "npm"]);
    const { sys, commandLog } = createMockSystem(installed);
    const originalRunCommand = sys.runCommand.bind(sys);
    let npmPrefixCalled = false;
    sys.runCommand = (cmd: string, silent?: boolean) => {
      if (cmd.includes("apt-get install") && cmd.includes("pnpm")) return false;
      if (cmd.includes("npm install -g pnpm --prefix")) {
        npmPrefixCalled = true;
        installed.add("pnpm");
        return true;
      }
      return originalRunCommand(cmd, silent);
    };

    const pm = createLinuxPackageManager(sys);
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: {},
      installLinuxPackages: (pkgs) => pm.install(pkgs),
      log: mockLog,
    });

    expect(nodeSetup.installPnpm()).toBe(true);
    expect(npmPrefixCalled).toBe(true);
  });
});

describe("PNPM_HOME edge cases", () => {
  it("rejects macOS PNPM_HOME on Linux", () => {
    const { sys } = createMockSystem(new Set(["apt-get"]));
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: { PNPM_HOME: "/Users/mac-user/Library/pnpm" },
      installLinuxPackages: vi.fn(),
      log: mockLog,
    });

    const result = nodeSetup.ensurePnpmHome();
    expect(result).not.toBeNull();
    expect(result!.pnpmHome).toBe("/home/testuser/.local/share/pnpm");
  });

  it("respects XDG_DATA_HOME", () => {
    const { sys } = createMockSystem(new Set(["apt-get"]));
    const nodeSetup = createNodeSetup({
      sys,
      home: "/home/testuser",
      env: { XDG_DATA_HOME: "/custom/data" },
      installLinuxPackages: vi.fn(),
      log: mockLog,
    });

    const result = nodeSetup.ensurePnpmHome();
    expect(result).not.toBeNull();
    expect(result!.pnpmHome).toBe("/custom/data/pnpm");
  });
});
