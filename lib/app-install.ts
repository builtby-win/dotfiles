import { existsSync, mkdirSync, readFileSync, renameSync } from "fs";
import { join, dirname } from "path";
import { getInstalledLinuxPackages } from "./app-detect";
import { getCurrentPlatform, APPS, type App } from "./catalog";
import { colors, log, HOME } from "./context";
import { runCommand, getCommandOutput, linuxPM, getLinuxPackageManager, getLinuxPackageName } from "./system";

export function installLinuxPackages(packages: string[]): boolean {
  if (!linuxPM.detect()) {
    log.warning("No supported Linux package manager found (need apt-get, dnf, or pacman)");
    return false;
  }
  return linuxPM.install(packages);
}

export function ensureLocalBinInPath(): void {
  const localBin = join(HOME, ".local", "bin");
  const currentPath = process.env.PATH ?? "";
  const pathEntries = currentPath.split(":").filter(Boolean);

  if (!pathEntries.includes(localBin)) {
    process.env.PATH = currentPath ? `${localBin}:${currentPath}` : localBin;
  }
}

export function installStarshipOnLinux(): boolean {
  if (runCommand("command -v starship", true)) {
    log.success("starship already installed");
    return true;
  }

  log.info("Installing starship...");
  ensureLocalBinInPath();

  const installerUrl = "https://starship.rs/install.sh";
  if (!runCommand(`curl -fsSL \"${installerUrl}\" -o /dev/null`, true)) {
    log.error(`Cannot access ${installerUrl}`);
    log.error("Third-party URL access is required to install starship on Linux");
    return false;
  }

  const installCommand = "curl -sS https://starship.rs/install.sh | sh";
  if (!runCommand(installCommand)) {
    log.error("Starship installer failed");
    log.error("Please ensure third-party URLs are reachable and retry");
    return false;
  }

  ensureLocalBinInPath();
  if (runCommand("command -v starship", true)) {
    log.success("starship installed");
    return true;
  }

  const localCandidates = [
    join(HOME, ".local", "bin", "starship"),
    join(HOME, ".cargo", "bin", "starship"),
    join(HOME, ".nix-profile", "bin", "starship"),
  ];

  for (const candidate of localCandidates) {
    if (!existsSync(candidate)) continue;
    const candidateDir = dirname(candidate);
    const currentPath = process.env.PATH ?? "";
    if (!currentPath.split(":").includes(candidateDir)) {
      process.env.PATH = currentPath ? `${candidateDir}:${currentPath}` : candidateDir;
    }
    log.success("starship installed");
    return true;
  }

  log.error("Starship installation completed but binary was not found in PATH");
  return false;
}

export function installSeshOnLinux(): boolean {
  if (runCommand("command -v sesh", true)) {
    log.success("sesh already installed");
    return true;
  }

  log.info("Installing sesh...");
  ensureLocalBinInPath();
  const arch = getCommandOutput("uname -m");
  if (!arch || arch !== "x86_64") {
    log.warning("sesh automatic install currently only supports x86_64 architecture on Linux");
    return false;
  }

  const latestTag = getCommandOutput('curl -s https://api.github.com/repos/joshmedeski/sesh/releases/latest | grep "tag_name" | cut -d\'"\' -f4');
  if (!latestTag) {
    log.warning("Failed to detect latest sesh version");
    return false;
  }
  const version = latestTag.startsWith('v') ? latestTag.substring(1) : latestTag;

  const url = `https://github.com/joshmedeski/sesh/releases/download/${latestTag}/sesh_Linux_x86_64.tar.gz`;
  const localBin = join(HOME, ".local", "bin");
  if (!existsSync(localBin)) {
    mkdirSync(localBin, { recursive: true });
  }

  const directInstall = `curl -L "${url}" | tar -xz -O sesh > "${localBin}/sesh.bin" && chmod +x "${localBin}/sesh.bin"`;
  if (!runCommand(directInstall)) {
    const fallbackInstall = `curl -L "${url}" | tar -xz -C "${localBin}" sesh`;
    if (!runCommand(fallbackInstall)) {
      log.error("Sesh binary download failed");
      return false;
    }
    try {
      const shimPath = join(localBin, "sesh");
      const binPath = join(localBin, "sesh.bin");
      if (existsSync(shimPath) && !existsSync(binPath)) {
        const content = readFileSync(shimPath, "utf-8").slice(0, 20);
        if (!content.includes("#!/usr/bin/env bash")) {
          renameSync(shimPath, binPath);
        }
      }
    } catch {}
  }

  if (runCommand("command -v sesh", true)) {
    log.success("sesh installed");
    return true;
  }

  log.warning("sesh installation completed but binary was not found in PATH");
  return false;
}

export function installPackage(name: string, cask = false): boolean {
  const platform = getCurrentPlatform();

  if (platform === "linux") {
    if (name === "starship") {
      return installStarshipOnLinux();
    }
    if (name === "sesh") {
      return installSeshOnLinux();
    }

    const linuxManager = getLinuxPackageManager();
    if (!linuxManager) {
      log.warning(`Skipping ${name}: no supported Linux package manager and no curl installer is configured`);
      return false;
    }

    const linuxPackage = getLinuxPackageName(name) ?? name;

    const installed = getInstalledLinuxPackages();
    if (installed.has(linuxPackage) || runCommand(`command -v ${linuxPackage}`, true)) {
      log.success(`${linuxPackage} already installed`);
      return true;
    }

    if (cask) {
      log.info(`Installing ${linuxPackage} as a regular Linux package`);
    } else {
      log.info(`Installing ${linuxPackage}...`);
    }

    if (installLinuxPackages([linuxPackage])) {
      log.success(`${linuxPackage} installed`);
      return true;
    }

    log.warning(`Failed to install ${linuxPackage}`);
    return false;
  }

  const checkCmd = cask
    ? `brew list --cask ${name} 2>/dev/null`
    : `brew list ${name} 2>/dev/null`;

  if (runCommand(checkCmd, true)) {
    log.success(`${name} already installed`);
    return true;
  }

  log.info(`Installing ${name}...`);
  const cmd = cask ? `brew install --cask ${name}` : `brew install ${name}`;
  // Not silent: casks may prompt for sudo and failures must be visible.
  if (runCommand(cmd, false)) {
    log.success(`${name} installed`);
    return true;
  }

  log.warning(`Failed to install ${name}`);
  return false;
}

export function getManualDownloadApps(apps: string[]): App[] {
  return APPS.filter((app) => apps.includes(app.value) && app.manualDownload);
}

export function printManualDownloadApps(apps: App[]): void {
  if (apps.length === 0) return;

  console.log(`  ${colors.yellow}${colors.bold}Manual download required:${colors.reset}`);
  console.log(`  ${colors.dim}Download these manually:${colors.reset}`);

  for (const app of apps) {
    const url = app.url ?? "";
    console.log(`    • ${app.name}: ${colors.cyan}${url}${colors.reset}`);
  }

  console.log("");
}

function ensureBrewInPath(): void {
  if (getCurrentPlatform() !== "macos" || runCommand("command -v brew", true)) return;
  for (const prefix of ["/opt/homebrew", "/usr/local"]) {
    if (existsSync(`${prefix}/bin/brew`)) {
      process.env.PATH = `${prefix}/bin:${prefix}/sbin:${process.env.PATH ?? ""}`;
      return;
    }
  }
}

export async function installApps(apps: string[]): Promise<string[]> {
  const failed: string[] = [];
  ensureBrewInPath();
  if (apps.length === 0) return failed;

  const appsToInstall = APPS.filter((a) => apps.includes(a.value) && (a.brewName || a.installCommand));
  const platform = getCurrentPlatform();
  if (appsToInstall.length > 0) {
    if (platform === "linux") {
      const manager = getLinuxPackageManager();
      log.step(`Installing commands via ${manager ?? "Linux package manager"}...`);
    } else if (appsToInstall.some((app) => app.brewName)) {
      log.step("Installing apps via Homebrew...");
    }

    for (const app of appsToInstall) {
      if (platform === "macos" && app.brewTap) {
        const { name, url } = app.brewTap;
        if (!runCommand(`brew tap-info "${name}"`, true)) {
          log.info(`Adding Homebrew tap ${name}...`);
          if (!runCommand(`brew tap "${name}" "${url}"`, false)) {
            log.warning(`Failed to add Homebrew tap ${name}`);
          }
        }
        // Homebrew may mark third-party taps untrusted; trust only this selected tap.
        runCommand(`brew trust --tap "${name}"`, true);
      }
      if (app.brewName && !(platform === "linux" && app.linuxInstallCommand)) {
        if (!installPackage(app.brewName, app.cask)) failed.push(app.name);
      }
      const customInstallCommand = platform === "linux"
        ? app.linuxInstallCommand ?? app.installCommand
        : app.installCommand;
      if (customInstallCommand) {
        log.info(`Installing ${app.name}...`);
        if (runCommand(customInstallCommand, false)) {
          log.success(`${app.name} installed`);
        } else {
          log.warning(`Failed to install ${app.name}`);
          failed.push(app.name);
        }
      }

      if (app.dependencies) {
        for (const dep of app.dependencies) {
          if (!installPackage(dep)) failed.push(`${app.name} dependency ${dep}`);
        }
      }
    }
  }

  const manualDownloadApps = getManualDownloadApps(apps);
  if (manualDownloadApps.length > 0) {
    log.step("Manual app downloads");
    printManualDownloadApps(manualDownloadApps);
  }

  if (apps.includes("claude")) {
    log.info("Installing Claude Code CLI...");
    if (runCommand("npm install -g @anthropic-ai/claude-code", false)) {
      log.success("Claude Code CLI installed");
    } else {
      log.warning("Failed to install Claude Code CLI");
      failed.push("Claude Code CLI");
    }
  }

  if (apps.includes("gemini")) {
    log.info("Installing Gemini CLI...");
    if (runCommand("npm install -g @google/gemini-cli", false)) {
      log.success("Gemini CLI installed");
    } else {
      log.warning("Failed to install Gemini CLI");
      failed.push("Gemini CLI");
    }
  }

  if (apps.includes("codex")) {
    log.info("Installing Codex CLI...");
    if (runCommand("npm install -g @openai/codex", false)) {
      log.success("Codex CLI installed");
    } else {
      log.warning("Failed to install Codex CLI");
      failed.push("Codex CLI");
    }
  }

  if (apps.includes("opencode")) {
    log.info("Installing OpenCode CLI...");
    const installCommand = getCurrentPlatform() === "linux"
      ? "curl -fsSL https://opencode.ai/install | bash"
      : "npm install -g opencode-ai";
    if (runCommand(installCommand, false)) {
      log.success("OpenCode CLI installed");
    } else {
      log.warning("Failed to install OpenCode CLI");
      failed.push("OpenCode CLI");
    }
  }

  return failed;
}
