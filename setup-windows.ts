#!/usr/bin/env npx tsx
import { checkbox, select, confirm } from "@inquirer/prompts";
import { execSync } from "child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, renameSync, symlinkSync, rmSync, lstatSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";

// Colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  step: (msg: string) => console.log(`${colors.blue}==>${colors.reset} ${colors.bold}${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`  ${colors.dim}${msg}${colors.reset}`),
};

// Paths
const DOTFILES_DIR = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1'); // Fix leading slash on Windows
const HOME = homedir();
const APPDATA = process.env.APPDATA || join(HOME, "AppData", "Roaming");
const LOCALAPPDATA = process.env.LOCALAPPDATA || join(HOME, "AppData", "Local");
const MANIFEST_PATH = join(DOTFILES_DIR, ".backup-manifest-windows.json");

// Backup manifest
interface BackupEntry {
  original: string;
  backup: string;
  type: "file" | "symlink";
  timestamp: number;
}

interface BackupManifest {
  version: 1;
  entries: BackupEntry[];
}

function loadManifest(): BackupManifest {
  if (existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    } catch {
      return { version: 1, entries: [] };
    }
  }
  return { version: 1, entries: [] };
}

function saveManifest(manifest: BackupManifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function addToManifest(entry: Omit<BackupEntry, "timestamp">): void {
  const manifest = loadManifest();
  manifest.entries.push({ ...entry, timestamp: Date.now() });
  saveManifest(manifest);
}

// App Definitions for Windows (Chocolatey)
interface App {
  name: string;
  value: string;
  chocoName: string; // Chocolatey package name
  checked?: boolean;
  desc?: string;
  detectCmd?: string; // Command to check if installed
}

const APPS: App[] = [
  // Core
  { name: "Git", value: "git", chocoName: "git", checked: true, desc: "Version control" },
  { name: "PowerShell Core (pwsh)", value: "pwsh", chocoName: "powershell-core", checked: true, desc: "Modern cross-platform PowerShell" },
  { name: "Starship", value: "starship", chocoName: "starship", checked: true, desc: "Fast, customizable shell prompt" },
  
  // Node / Dev
  { name: "fnm (Fast Node Manager)", value: "fnm", chocoName: "fnm", checked: true, desc: "Fast and simple Node.js version manager" },
  
  // Editors
  { name: "Visual Studio Code", value: "vscode", chocoName: "vscode", checked: true, desc: "Code editor" },
  { name: "Cursor", value: "cursor", chocoName: "cursor", desc: "AI code editor (check manual install if choco fails)" },

  // Terminals & Multiplexers
  { name: "Windows Terminal", value: "terminal", chocoName: "microsoft-windows-terminal", checked: true, desc: "Modern terminal emulator" },
  { name: "Zellij", value: "zellij", chocoName: "zellij", desc: "Terminal workspace (tmux alternative)" },

  // Tools
  { name: "PowerToys", value: "powertoys", chocoName: "powertoys", checked: true, desc: "Essential Windows utilities (FancyZones, Run, etc.)" },
  { name: "Ripgrep", value: "ripgrep", chocoName: "ripgrep", desc: "Fast grep replacement" },
  { name: "Fzf", value: "fzf", chocoName: "fzf", desc: "Fuzzy finder" },
  { name: "Bat", value: "bat", chocoName: "bat", desc: "Cat with syntax highlighting" },
  { name: "Eza", value: "eza", chocoName: "eza", desc: "Modern ls replacement" },
  { name: "Zoxide", value: "zoxide", chocoName: "zoxide", desc: "Smarter cd command" },
  
  // Browsers
  { name: "Google Chrome", value: "chrome", chocoName: "googlechrome", desc: "Web browser" },
  { name: "Arc Browser", value: "arc", chocoName: "arc", desc: "Modern browser (requires manual install if choco package missing)" },

  // New Additions
  { name: "Warp Terminal", value: "warp", chocoName: "warp", desc: "Rust-based modern terminal" },
  { name: "Antigravity (Python)", value: "antigravity", chocoName: "python", desc: "Installs Python (required for antigravity)" },
];

// Configs to link
const CONFIGS = [
  { 
    name: "Starship Config", 
    value: "starship", 
    source: join("stow-packages", "zsh", ".config", "starship.toml"), 
    target: join(HOME, ".config", "starship.toml") 
  },
  { 
    name: "Ghostty Config", 
    value: "ghostty", 
    source: join("stow-packages", "ghostty", ".config", "ghostty", "config"), 
    target: join(APPDATA, "ghostty", "config") 
  },
  { 
    name: "Git Ignore", 
    value: "gitignore", 
    source: ".gitignore", 
    target: join(HOME, ".gitignore_global") 
  },
  {
    name: "PowerShell Profile",
    value: "ps_profile",
    source: "shell/init.ps1", // We need to create this source file or write content dynamically
    target: "PROFILE" // Special marker
  }
];

// Helper Functions

function isAdmin(): boolean {
  try {
    execSync("net session", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runCommand(cmd: string, silent = false): boolean {
  try {
    execSync(cmd, { stdio: silent ? "pipe" : "inherit" });
    return true;
  } catch {
    return false;
  }
}

function checkChoco(): boolean {
  return runCommand("choco --version", true);
}

function installChoco(): void {
  log.info("Installing Chocolatey...");
  const cmd = `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`;
  
  try {
    execSync(`powershell -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "${cmd}"`, { stdio: "inherit" });
    log.success("Chocolatey installed");
  } catch (e) {
    log.error("Failed to install Chocolatey. Please install it manually.");
    process.exit(1);
  }
}

function isPackageInstalled(chocoName: string): boolean {
  return runCommand(`choco search --local-only --exact ${chocoName}`, true);
}

function installWithWinget(appName: string, packageId: string): boolean {
  log.info(`Attempting to install ${appName} via Winget...`);
  if (runCommand(`winget install --id "${packageId}" -e --source winget --accept-package-agreements --accept-source-agreements`)) {
    log.success(`${appName} installed via Winget`);
    return true;
  }
  return false;
}

async function installPackages(apps: string[]): Promise<void> {
  const selected = APPS.filter(a => apps.includes(a.value));
  if (selected.length === 0) return;

  log.step("Installing packages...");

  for (const app of selected) {
    // 0. Check if already in PATH (avoid double install if bootstrap did it)
    if (runCommand(`where.exe ${app.chocoName}`, true) || runCommand(`where.exe ${app.value}`, true)) {
       log.success(`${app.name} found in PATH`);
       continue;
    }

    // 1. Try Chocolatey first
    if (isPackageInstalled(app.chocoName)) {
      log.success(`${app.name} already installed (via Choco)`);
      continue;
    }

    log.info(`Installing ${app.name} (Choco)...`);
    if (runCommand(`choco install ${app.chocoName} -y`)) {
      log.success(`${app.name} installed`);
    } else {
      // 2. Fallback to Winget for specific apps
      if (app.value === "warp") {
         if (!installWithWinget("Warp", "Warp.Warp")) {
           log.error(`Failed to install Warp`);
         }
      } else if (app.value === "antigravity") {
         // Antigravity isn't a package manager app usually, it's a python module 'import antigravity'
         // Assuming user meant a specific app or just Python.
         // If "antigravity" refers to the specific game/concept, it's built-in to Python.
         log.info("Note: 'antigravity' is a Python module. Ensuring Python is installed...");
         if (!installWithWinget("Python 3", "Python.Python.3")) {
            log.error("Failed to install Python for antigravity");
         }
      } else {
         log.error(`Failed to install ${app.name}`);
      }
    }
  }
}

function getPowerShellProfilePath(): string {
  try {
    // Get current user's CurrentUserCurrentHost profile path
    return execSync(`powershell -NoProfile -Command "echo $PROFILE"`, { encoding: 'utf-8' }).trim();
  } catch {
    return join(HOME, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1");
  }
}

async function setupPowerShellProfile(): Promise<void> {
  const profilePath = getPowerShellProfilePath();
  const profileDir = dirname(profilePath);

  log.info(`PowerShell Profile: ${profilePath}`);

  if (!existsSync(profileDir)) {
    mkdirSync(profileDir, { recursive: true });
  }

  // Content to append
  const initCode = `
# Added by builtby.win/dotfiles
if (Test-Path "$env:USERPROFILE\\.config\\dotfiles") {
    Invoke-Expression (Get-Content "$env:USERPROFILE\\.config\\dotfiles\\shell\\init.ps1" -Raw)
}

# Starship
if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
}

# fnm
if (Get-Command fnm -ErrorAction SilentlyContinue) {
    fnm env --use-on-cd | Out-String | Invoke-Expression
}

# Zoxide
if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    Invoke-Expression (& {
        $hook = if ($PSVersionTable.PSVersion.Major -lt 6) { 'powershell' } else { 'pwsh' }
        (zoxide init $hook | Out-String)
    })
}
`;

  let currentContent = "";
  if (existsSync(profilePath)) {
    currentContent = readFileSync(profilePath, "utf-8");
  }

  if (currentContent.includes("# Added by builtby.win/dotfiles")) {
    log.success("PowerShell profile already configured");
    return;
  }

  // Backup
  if (existsSync(profilePath)) {
    const backup = backupFile(profilePath);
    addToManifest({ original: profilePath, backup, type: "file" });
  }

  writeFileSync(profilePath, currentContent + "\n" + initCode);
  log.success("Updated PowerShell profile");
}

function backupFile(filePath: string): string {
  const backupPath = `${filePath}.backup.${Date.now()}`;
  if (existsSync(filePath)) {
    renameSync(filePath, backupPath);
    log.info(`Backed up ${filePath} to ${backupPath}`);
  }
  return backupPath;
}

async function setupConfigs(selectedConfigs: string[]): Promise<void> {
  log.step("Linking configuration files...");

  for (const configKey of selectedConfigs) {
    if (configKey === "ps_profile") {
      await setupPowerShellProfile();
      continue;
    }

    const config = CONFIGS.find(c => c.value === configKey);
    if (!config) continue;

    const sourcePath = join(DOTFILES_DIR, config.source);
    const targetPath = config.target;
    const targetDir = dirname(targetPath);

    if (!existsSync(sourcePath)) {
      log.warning(`Source not found: ${sourcePath}`);
      continue;
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    if (existsSync(targetPath)) {
      // Check if it's already a symlink to our file
      try {
        const stats = lstatSync(targetPath);
        if (stats.isSymbolicLink()) {
          // You'd check the target here, but realpath on Windows can be tricky
          log.info(`${config.name} already linked`);
          continue;
        }
      } catch {}

      // Backup existing
      const backup = backupFile(targetPath);
      addToManifest({ original: targetPath, backup, type: "file" });
    }

    try {
      // Use 'junction' for dirs, 'file' for files (default)
      // Note: symlinkSync on Windows requires Admin or Dev Mode
      symlinkSync(sourcePath, targetPath); 
      log.success(`Linked ${config.name}`);
    } catch (e) {
      log.error(`Failed to link ${config.name}: ${e}`);
      log.info("Note: Creating symlinks on Windows usually requires Administrator privileges.");
    }
  }
}

async function runSetup(): Promise<void> {
  console.log("");
  console.log(`${colors.cyan}${colors.bold}=== Windows Dotfiles Setup ===${colors.reset}`);
  console.log("");

  if (!isAdmin()) {
    log.warning("Not running as Administrator.");
    log.info("Some actions (installing packages, creating symlinks) may fail.");
    const cont = await confirm({ message: "Continue anyway?", default: false });
    if (!cont) process.exit(0);
  }

  // 0. Check/Install WSL
  const installWSL = await confirm({ 
    message: "Do you want to install/enable Windows Subsystem for Linux (WSL)?", 
    default: false 
  });
  
  if (installWSL) {
    try {
      log.info("Checking WSL status...");
      // Simple check to see if wsl command works and has distributions
      if (runCommand("wsl --status", true)) {
        log.success("WSL is already installed.");
      } else {
        log.info("Installing WSL (Ubuntu)...");
        // wsl --install defaults to Ubuntu and requires reboot usually
        execSync("wsl --install", { stdio: "inherit" });
        log.success("WSL installation command executed.");
        log.warning("You MUST reboot your computer to finish WSL installation.");
        log.info("After reboot, open 'Ubuntu' from Start Menu and run the standard './setup.ts' inside it.");
      }
    } catch (e) {
      log.error(`Failed to manage WSL: ${e}`);
    }
    console.log("");
  }

  // 1. Check Chocolatey
  if (!checkChoco()) {
    const install = await confirm({ message: "Chocolatey is not installed. Install it now?", default: true });
    if (install) installChoco();
    else {
      log.error("Chocolatey is required for this script.");
      process.exit(1);
    }
  }

  // 2. Select Apps
  const selectedApps = await checkbox({
    message: "Select apps to install:",
    choices: APPS.map(app => ({
      name: `${app.name} ${colors.dim}(${app.desc})${colors.reset}`,
      value: app.value,
      checked: app.checked || false
    })),
    pageSize: 15
  });

  // 3. Select Configs
  const selectedConfigs = await checkbox({
    message: "Select configs to link:",
    choices: CONFIGS.map(c => ({
      name: c.name,
      value: c.value,
      checked: true
    }))
  });

  // 4. Confirm
  const proceed = await confirm({ message: "Ready to install?", default: true });
  if (!proceed) process.exit(0);

  // 5. Execute
  await installPackages(selectedApps);
  await setupConfigs(selectedConfigs);

  // 6. fnm setup instructions
  if (selectedApps.includes("fnm")) {
    log.step("Final Setup Instructions:");
    console.log("");
    console.log("  To finish setting up fnm (Node manager), add this to your PowerShell profile:");
    console.log(`  ${colors.cyan}fnm env --use-on-cd | Out-String | Invoke-Expression${colors.reset}`);
    console.log("");
    console.log(`  Profile path: $PROFILE`);
    console.log("");
  }
  
  // 7. Git config
  if (selectedConfigs.includes("gitignore")) {
    runCommand(`git config --global core.excludesfile "${join(HOME, '.gitignore_global')}"`, true);
  }

  log.success("Setup complete!");
}

runSetup().catch(console.error);
