import { confirm } from "@inquirer/prompts";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { installLinuxPackages } from "./app-install";
import { getCurrentPlatform } from "./catalog";
import { log, HOME } from "./context";
import { runCommand, getCommandOutput } from "./system";

export async function maybeSetDefaultShellToZsh(selectedManagedConfigs: string[]): Promise<void> {
  const platform = getCurrentPlatform();
  if (platform === "windows") return;
  if (!selectedManagedConfigs.includes("zsh")) return;

  const currentShell = (process.env.SHELL ?? "").trim();
  const currentShellName = currentShell.split("/").pop() ?? currentShell;
  if (currentShellName === "zsh") return;

  const shouldSwitch = await confirm({
    message: "Set zsh as your default shell (login shell)?",
    default: true,
  });

  if (!shouldSwitch) {
    if (currentShell) {
      log.info(`Keeping current default shell: ${currentShell}`);
    }
    return;
  }

  let zshPath = getCommandOutput("command -v zsh");
  if (!zshPath && platform === "linux") {
    log.info("zsh is not installed. Installing via Linux package manager...");
    if (!installLinuxPackages(["zsh"])) {
      log.warning("Could not install zsh automatically");
      log.warning('Install zsh and run: chsh -s "$(command -v zsh)"');
      return;
    }
    zshPath = getCommandOutput("command -v zsh");
  }

  if (!zshPath) {
    log.warning("zsh was not found in PATH");
    log.warning('Install zsh and run: chsh -s "$(command -v zsh)"');
    return;
  }

  if (runCommand(`chsh -s "${zshPath}"`)) {
    log.success("Default shell changed to zsh");
    log.info("Open a new terminal or run: exec zsh");
  } else {
    log.warning("Could not change default shell automatically");
    log.warning(`Run manually: chsh -s "${zshPath}"`);
  }
}

export async function maybeLoginGhCli(selectedApps: string[]): Promise<void> {
  if (!selectedApps.includes("gh")) return;

  const ghInstalled = runCommand("command -v gh", true);
  if (!ghInstalled) return;

  // Check if already authenticated
  const authStatus = getCommandOutput("gh auth status 2>&1");
  if (authStatus && authStatus.includes("Logged in to github.com")) {
    log.success("GitHub CLI already authenticated");
    return;
  }

  log.warning("GitHub CLI is installed but not authenticated");
  const shouldLogin = await confirm({
    message: "Login to GitHub now via gh auth login? (opens browser)",
    default: true,
  });

  if (!shouldLogin) {
    log.info("Skipping GitHub auth. Run 'gh auth login' later to set it up.");
    return;
  }

  console.log("");
  log.step("Launching GitHub CLI login...");
  log.info("Follow the prompts in your terminal to authenticate.");
  console.log("");

  runCommand("gh auth login");
}

export function installTpmPlugins(tpmPath: string): void {
  const tmuxConfPath = join(HOME, ".tmux.conf");
  const installScript = join(tpmPath, "bin", "install_plugins");

  if (!existsSync(tmuxConfPath)) {
    log.warning("~/.tmux.conf not found - skipping TPM plugin install");
    return;
  }

  if (!existsSync(installScript)) {
    log.warning("TPM install script not found - skipping plugin install");
    return;
  }

  log.info("Installing tmux plugins via TPM...");
  const installed =
    runCommand(`"${installScript}"`, true) ||
    runCommand(`bash "${installScript}"`, true);

  if (installed) {
    log.success("Tmux plugins installed");
  } else {
    log.warning("Failed to install tmux plugins - you can run prefix + I later");
  }
}

export function setupTmuxFingersOnLinux(): void {
  const fingersPath = join(HOME, ".tmux", "plugins", "tmux-fingers");
  if (!existsSync(fingersPath)) return;

  const arch = getCommandOutput("uname -m");
  if (arch !== "x86_64") return;

  const binaryPath = join(fingersPath, "bin", "tmux-fingers");
  if (existsSync(binaryPath)) return;

  log.info("Initializing tmux-fingers for Linux...");
  runCommand(`bash "${join(fingersPath, "install-wizard.sh")}" download-binary`, true);
}

export function setupTpm(): void {
  const tpmPath = join(HOME, ".tmux", "plugins", "tpm");
  let tpmReady = false;

  if (existsSync(tpmPath)) {
    log.success("TPM already installed");
    tpmReady = true;
  } else {
    log.info("Installing TPM (Tmux Plugin Manager)...");
    const tpmDir = join(HOME, ".tmux", "plugins");
    if (!existsSync(tpmDir)) {
      mkdirSync(tpmDir, { recursive: true });
    }

    if (runCommand(`git clone https://github.com/tmux-plugins/tpm "${tpmPath}"`, true)) {
      log.success("TPM installed");
      tpmReady = true;
    } else {
      log.warning("Failed to install TPM - you can install manually later");
    }
  }

  if (tpmReady) {
    installTpmPlugins(tpmPath);
    if (getCurrentPlatform() === "linux") {
      setupTmuxFingersOnLinux();
    }
  }
}
