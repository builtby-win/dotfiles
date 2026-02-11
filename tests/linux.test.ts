import { describe, it, expect, beforeEach } from "vitest";
import { createLinuxPackageManager, type SystemCommands, type LinuxPackageManagerAPI } from "../lib/linux";

function createMockSys(overrides: Partial<SystemCommands> = {}): SystemCommands {
  return {
    runCommand: () => false,
    getCommandOutput: () => null,
    ...overrides,
  };
}

describe("createLinuxPackageManager", () => {
  let pm: LinuxPackageManagerAPI;

  describe("detect()", () => {
    it("detects apt when apt-get is available", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.detect()).toBe("apt");
    });

    it("detects dnf when dnf is available", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v dnf",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.detect()).toBe("dnf");
    });

    it("detects pacman when pacman is available", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v pacman",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.detect()).toBe("pacman");
    });

    it("returns null when no package manager found", () => {
      const sys = createMockSys();
      pm = createLinuxPackageManager(sys);
      expect(pm.detect()).toBeNull();
    });

    it("prefers apt over dnf if both exist", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get" || cmd === "command -v dnf",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.detect()).toBe("apt");
    });
  });

  describe("install()", () => {
    it("runs apt-get update before first apt install", () => {
      const commands: string[] = [];
      const sys = createMockSys({
        runCommand: (cmd) => {
          if (cmd === "command -v apt-get") return true;
          commands.push(cmd!);
          return true;
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.install(["vim"]);
      expect(commands).toContain("sudo apt-get update");
      expect(commands).toContain("sudo apt-get install -y vim");
    });

    it("does NOT run apt-get update on second call", () => {
      const commands: string[] = [];
      const sys = createMockSys({
        runCommand: (cmd) => {
          if (cmd === "command -v apt-get") return true;
          commands.push(cmd!);
          return true;
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.install(["vim"]);
      commands.length = 0;
      pm.install(["git"]);
      expect(commands).not.toContain("sudo apt-get update");
      expect(commands).toContain("sudo apt-get install -y git");
    });

    it("uses correct flags for dnf", () => {
      const commands: string[] = [];
      const sys = createMockSys({
        runCommand: (cmd) => {
          if (cmd === "command -v apt-get") return false;
          if (cmd === "command -v dnf") return true;
          commands.push(cmd!);
          return true;
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.install(["vim"]);
      expect(commands).toContain("sudo dnf install -y vim");
    });

    it("uses --noconfirm --needed for pacman", () => {
      const commands: string[] = [];
      const sys = createMockSys({
        runCommand: (cmd) => {
          if (cmd === "command -v apt-get") return false;
          if (cmd === "command -v dnf") return false;
          if (cmd === "command -v pacman") return true;
          commands.push(cmd!);
          return true;
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.install(["vim"]);
      expect(commands).toContain("sudo pacman -S --noconfirm --needed vim");
    });

    it("returns false when command fails", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.install(["vim"])).toBe(false);
    });

    it("skips empty package list and returns true", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.install([])).toBe(true);
    });

    it("invalidates installed packages cache", () => {
      let callCount = 0;
      const sys = createMockSys({
        runCommand: (cmd) => {
          if (cmd === "command -v apt-get") return true;
          return true;
        },
        getCommandOutput: () => {
          callCount++;
          return "vim\ngit";
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.getInstalledPackages();
      const countBefore = callCount;
      pm.getInstalledPackages();
      expect(callCount).toBe(countBefore);

      pm.install(["curl"]);
      pm.getInstalledPackages();
      expect(callCount).toBe(countBefore + 1);
    });
  });

  describe("getPackageName()", () => {
    it("returns override for known packages", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.getPackageName("visual-studio-code")).toBe("code");
      expect(pm.getPackageName("google-chrome")).toBe("google-chrome-stable");
    });

    it("returns name as-is when no override", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.getPackageName("vim")).toBe("vim");
    });

    it("returns null when no package manager detected", () => {
      const sys = createMockSys();
      pm = createLinuxPackageManager(sys);
      expect(pm.getPackageName("vim")).toBeNull();
    });
  });

  describe("getInstalledPackages()", () => {
    it("uses dpkg-query for apt", () => {
      let queriedCmd: string | null = null;
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
        getCommandOutput: (cmd) => {
          queriedCmd = cmd;
          return "vim\ngit\ncurl";
        },
      });
      pm = createLinuxPackageManager(sys);
      const result = pm.getInstalledPackages();
      expect(queriedCmd).toContain("dpkg-query");
      expect(result).toEqual(new Set(["vim", "git", "curl"]));
    });

    it("uses rpm -qa for dnf", () => {
      let queriedCmd: string | null = null;
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v dnf",
        getCommandOutput: (cmd) => {
          queriedCmd = cmd;
          return "vim\ngit";
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.getInstalledPackages();
      expect(queriedCmd).toContain("rpm -qa");
    });

    it("uses pacman -Qq for pacman", () => {
      let queriedCmd: string | null = null;
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v pacman",
        getCommandOutput: (cmd) => {
          queriedCmd = cmd;
          return "vim\ngit";
        },
      });
      pm = createLinuxPackageManager(sys);
      pm.getInstalledPackages();
      expect(queriedCmd).toBe("pacman -Qq");
    });

    it("returns empty set on error", () => {
      const sys = createMockSys({
        runCommand: (cmd) => cmd === "command -v apt-get",
        getCommandOutput: () => null,
      });
      pm = createLinuxPackageManager(sys);
      expect(pm.getInstalledPackages()).toEqual(new Set());
    });
  });
});
