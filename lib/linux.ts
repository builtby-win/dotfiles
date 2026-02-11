export type LinuxPackageManager = "apt" | "dnf" | "pacman";

export interface SystemCommands {
  runCommand(cmd: string, silent?: boolean): boolean;
  getCommandOutput(cmd: string): string | null;
}

export const LINUX_PACKAGE_NAME_OVERRIDES: Record<string, Partial<Record<LinuxPackageManager, string>>> = {
  "visual-studio-code": { apt: "code", dnf: "code", pacman: "code" },
  "google-chrome": { apt: "google-chrome-stable", dnf: "google-chrome-stable", pacman: "google-chrome" },
};

export interface LinuxPackageManagerAPI {
  detect(): LinuxPackageManager | null;
  getPackageName(name: string): string | null;
  getInstalledPackages(): Set<string>;
  install(packages: string[]): boolean;
  resetCache(): void;
}

export function createLinuxPackageManager(sys: SystemCommands): LinuxPackageManagerAPI {
  let packageManagerCache: LinuxPackageManager | null | undefined = undefined;
  let aptUpdated = false;
  let installedPackagesCache: Set<string> | null = null;

  function detect(): LinuxPackageManager | null {
    if (packageManagerCache !== undefined) return packageManagerCache;

    if (sys.runCommand("command -v apt-get", true)) {
      packageManagerCache = "apt";
    } else if (sys.runCommand("command -v dnf", true)) {
      packageManagerCache = "dnf";
    } else if (sys.runCommand("command -v pacman", true)) {
      packageManagerCache = "pacman";
    } else {
      packageManagerCache = null;
    }

    return packageManagerCache;
  }

  function getPackageName(name: string): string | null {
    const manager = detect();
    if (!manager) return null;

    const override = LINUX_PACKAGE_NAME_OVERRIDES[name]?.[manager];
    if (override) return override;
    return name;
  }

  function getInstalledPackages(): Set<string> {
    if (installedPackagesCache) return installedPackagesCache;

    const manager = detect();
    if (!manager) {
      installedPackagesCache = new Set();
      return installedPackagesCache;
    }

    try {
      const command = manager === "apt"
        ? "dpkg-query -W -f='${binary:Package}\\n'"
        : manager === "dnf"
          ? "rpm -qa --qf '%{NAME}\\n'"
          : "pacman -Qq";
      const output = sys.getCommandOutput(command);
      if (output) {
        installedPackagesCache = new Set(output.trim().split("\n").filter(Boolean));
      } else {
        installedPackagesCache = new Set();
      }
    } catch {
      installedPackagesCache = new Set();
    }

    return installedPackagesCache;
  }

  function install(packages: string[]): boolean {
    const manager = detect();
    if (!manager) return false;

    const normalizedPackages = [...new Set(packages.filter(Boolean))];
    if (normalizedPackages.length === 0) return true;

    if (manager === "apt" && !aptUpdated) {
      if (!sys.runCommand("sudo apt-get update")) {
        return false;
      }
      aptUpdated = true;
    }

    const command = manager === "apt"
      ? `sudo apt-get install -y ${normalizedPackages.join(" ")}`
      : manager === "dnf"
        ? `sudo dnf install -y ${normalizedPackages.join(" ")}`
        : `sudo pacman -S --noconfirm --needed ${normalizedPackages.join(" ")}`;

    if (sys.runCommand(command)) {
      installedPackagesCache = null;
      return true;
    }

    return false;
  }

  function resetCache(): void {
    packageManagerCache = undefined;
    aptUpdated = false;
    installedPackagesCache = null;
  }

  return { detect, getPackageName, getInstalledPackages, install, resetCache };
}
