import type { SystemCommands } from "./linux.js";

export interface NodeSetupDeps {
  sys: SystemCommands;
  home: string;
  env: Record<string, string | undefined>;
  installLinuxPackages: (pkgs: string[]) => boolean;
  log: {
    step: (msg: string) => void;
    success: (msg: string) => void;
    warning: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

export interface NodeSetupAPI {
  ensurePnpmHome(): { pnpmHome: string; pathEntries: string[] } | null;
  installFnm(): boolean;
  installNode(): boolean;
  installPnpm(): boolean;
  ensureNodeAndPnpm(): boolean;
}

export function createNodeSetup(deps: NodeSetupDeps): NodeSetupAPI {
  const { sys, home, env, installLinuxPackages, log } = deps;

  function ensurePnpmHome(): { pnpmHome: string; pathEntries: string[] } | null {
    const xdgDataHome = env.XDG_DATA_HOME || `${home}/.local/share`;
    const defaultPnpmHome = `${xdgDataHome}/pnpm`;

    let pnpmHome = env.PNPM_HOME;
    if (!pnpmHome || pnpmHome.startsWith("/Users/")) {
      pnpmHome = defaultPnpmHome;
    }

    if (!sys.runCommand(`mkdir -p "${pnpmHome}"`, true)) {
      log.warning(`PNPM_HOME is not writable (${pnpmHome}); using ${defaultPnpmHome}`);
      pnpmHome = defaultPnpmHome;
      if (!sys.runCommand(`mkdir -p "${pnpmHome}"`, true)) {
        log.error("Could not create PNPM_HOME directory");
        return null;
      }
    }

    const pathEntries = [pnpmHome, `${home}/.local/bin`];
    return { pnpmHome, pathEntries };
  }

  function installFnm(): boolean {
    if (sys.runCommand("command -v fnm", true)) {
      log.success("fnm already installed");
      return true;
    }

    log.step("Installing fnm (Node version manager)...");

    if (!sys.runCommand("curl -fsSL https://fnm.vercel.app/install > /dev/null", true)) {
      log.error("Cannot access https://fnm.vercel.app/install");
      return false;
    }

    if (!sys.runCommand("command -v unzip", true)) {
      log.step("Installing unzip (required by fnm installer)...");
      if (!installLinuxPackages(["unzip"])) {
        log.error("fnm installer requires unzip but it is not available");
        return false;
      }
      if (!sys.runCommand("command -v unzip", true)) {
        log.error("fnm installer requires unzip but it is not available");
        return false;
      }
    }

    if (!sys.runCommand("curl -fsSL https://fnm.vercel.app/install | bash")) {
      log.error("fnm installer failed");
      return false;
    }

    const fnmPath = `${home}/.local/share/fnm/fnm`;
    if (!sys.runCommand(`test -x "${fnmPath}"`, true)) {
      log.error("fnm installer completed but fnm was not found in PATH");
      return false;
    }

    log.success("fnm installed");
    return true;
  }

  function installNode(): boolean {
    if (sys.runCommand("command -v node", true)) {
      return true;
    }

    log.step("Installing Node.js...");

    if (sys.runCommand("command -v fnm", true)) {
      if (sys.runCommand("fnm install --lts") && sys.runCommand("fnm use lts-latest")) {
        if (sys.runCommand("command -v node", true)) {
          log.success("Node.js installed via fnm");
          return true;
        }
      }
      log.error("Failed to install Node.js via fnm");
      return false;
    }

    if (installLinuxPackages(["nodejs", "npm"])) {
      if (sys.runCommand("command -v node", true)) {
        log.success("Node.js installed via package manager");
        return true;
      }
    }

    log.error("Failed to install Node.js");
    return false;
  }

  function installPnpm(): boolean {
    if (sys.runCommand("command -v pnpm", true)) {
      return true;
    }

    log.step("Installing pnpm...");

    if (sys.runCommand("command -v corepack", true)) {
      if (
        sys.runCommand(`corepack enable --install-directory "${home}/.local/bin"`) &&
        sys.runCommand("corepack prepare pnpm@latest --activate") &&
        sys.runCommand("command -v pnpm", true)
      ) {
        log.success("pnpm installed via corepack");
        return true;
      }
      log.warning("corepack setup failed, trying other pnpm install methods");
    }

    if (installLinuxPackages(["pnpm"]) && sys.runCommand("command -v pnpm", true)) {
      log.success("pnpm installed via package manager");
      return true;
    }

    if (sys.runCommand(`npm install -g pnpm --prefix "${home}/.local"`) &&
        sys.runCommand("command -v pnpm", true)) {
      log.success(`pnpm installed in ${home}/.local/bin`);
      return true;
    }

    log.error("Failed to install pnpm");
    return false;
  }

  function ensureNodeAndPnpm(): boolean {
    const pnpmResult = ensurePnpmHome();
    if (!pnpmResult) {
      log.error("Could not initialize PNPM_HOME");
      return false;
    }

    if (!installNode()) {
      return false;
    }

    if (!sys.runCommand("command -v npm", true)) {
      log.step("Installing npm...");
      if (!installLinuxPackages(["npm"])) {
        log.error("npm is required but could not be installed");
        return false;
      }
    }

    if (!installPnpm()) {
      return false;
    }

    log.success("Node.js and pnpm ready");
    return true;
  }

  return { ensurePnpmHome, installFnm, installNode, installPnpm, ensureNodeAndPnpm };
}
