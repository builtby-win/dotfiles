#!/usr/bin/env npx tsx
import { checkbox, confirm } from "@inquirer/prompts";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const DOTFILES_DIR = dirname(fileURLToPath(import.meta.url));
const SKIP_CORE = process.argv.includes("--skip-core");

type OptionalChoice = {
  name: string;
  value: string;
  checked?: boolean;
  wingetId?: string;
  command?: string;
};

const log = {
  step: (msg: string) => console.log(`${colors.blue}==>${colors.reset} ${msg}`),
  ok: (msg: string) => console.log(`${colors.green}OK:${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}WARN:${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}ERROR:${colors.reset} ${msg}`),
};

function runCommand(cmd: string, silent = false): boolean {
  try {
    execSync(cmd, { stdio: silent ? "pipe" : "inherit" });
    return true;
  } catch {
    return false;
  }
}

function runPowerShellScript(scriptPath: string) {
  try {
    log.step(`Executing ${scriptPath}...`);
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: "inherit" });
    log.ok("Script completed successfully.");
  } catch (error) {
    log.error("Script failed execution.");
    process.exit(1);
  }
}

function ensureWinget(): boolean {
  if (!runCommand("winget --version", true)) {
    log.error("Winget not found. Install App Installer from Microsoft Store.");
    return false;
  }
  return true;
}

function ensureNpm(): boolean {
  if (!runCommand("npm --version", true)) {
    log.warn("npm not found. Skipping npm-based installs.");
    return false;
  }
  return true;
}

function commandExists(command: string): boolean {
  return runCommand(`where.exe ${command}`, true);
}

function wingetAppInstalled(id: string): boolean {
  return runCommand(`winget list --id "${id}" -e --source winget`, true);
}

function isInstalled(choice: OptionalChoice): boolean {
  if (choice.command && commandExists(choice.command)) return true;
  if (choice.wingetId && wingetAppInstalled(choice.wingetId)) return true;
  return false;
}

function markInstalled(choices: OptionalChoice[]): OptionalChoice[] {
  return choices.map((choice) => ({ ...choice, checked: isInstalled(choice) }));
}

function installWingetApp(name: string, id: string) {
  log.step(`Installing ${name} via winget...`);
  if (runCommand(`winget install --id "${id}" -e --source winget --accept-package-agreements --accept-source-agreements`)) {
    log.ok(`${name} installed`);
    return true;
  }
  log.warn(`${name} install failed or was skipped by winget`);
  return false;
}

function installWingetAppWithFallback(name: string, ids: string[]) {
  for (const id of ids) {
    if (installWingetApp(name, id)) return true;
  }
  log.warn(`No matching winget package found for ${name}. Try: winget source update`);
  return false;
}

function installNpmGlobal(name: string, cmd: string) {
  log.step(`Installing ${name}...`);
  if (runCommand(cmd)) {
    log.ok(`${name} installed`);
  } else {
    log.warn(`${name} install failed`);
  }
}

async function runSetup() {
  console.log("");
  console.log(`${colors.cyan}${colors.bold}=== Windows Dotfiles Setup ===${colors.reset}`);
  console.log("This script configures a Unix-like Windows development environment.");
  console.log("Core setup installs the package manifest, links shell/key configs, and copies AI tool templates.");
  console.log("Optional installs are selected interactively.");
  console.log("");

  if (process.platform !== "win32") {
    console.error(`${colors.red}Error: This script is intended for Windows only.${colors.reset}`);
    process.exit(1);
  }

  if (SKIP_CORE) {
    log.ok("Core setup already applied. Skipping windows/install.ps1.");
  } else {
    const proceed = await confirm({
      message: "Run the Windows core setup (windows/install.ps1)?",
      default: true,
    });

    if (!proceed) {
      console.log("Setup cancelled.");
      return;
    }

    const scriptPath = join(DOTFILES_DIR, "windows", "install.ps1");
    runPowerShellScript(scriptPath);
  }

  console.log("");
  log.step("Optional installs");
  console.log("Pick what you want. You can skip everything.");
  console.log("");

  const terminalChoices = markInstalled([
    { name: "Warp (beginner-friendly)", value: "warp", wingetId: "Warp.Warp" },
    { name: "Windows Terminal (if missing)", value: "windows_terminal", wingetId: "Microsoft.WindowsTerminal", command: "wt.exe" },
    { name: "WezTerm (power users)", value: "wezterm", wingetId: "wez.wezterm", command: "wezterm.exe" },
    { name: "Alacritty (minimal, fast)", value: "alacritty", wingetId: "Alacritty.Alacritty", command: "alacritty.exe" },
  ]);

  const editorChoices = markInstalled([
    { name: "Visual Studio Code", value: "vscode", wingetId: "Microsoft.VisualStudioCode", command: "code.cmd" },
  ]);

  const aiChoices = markInstalled([
    { name: "Gemini CLI (npm)", value: "gemini", command: "gemini.cmd" },
    { name: "Claude Code (PowerShell installer)", value: "claude", command: "claude.cmd" },
    { name: "OpenCode CLI (npm)", value: "opencode", command: "opencode.cmd" },
  ]);

  const miscChoices = markInstalled([
    { name: "PowerShell 7 (recommended shell)", value: "powershell", wingetId: "Microsoft.PowerShell", command: "pwsh.exe" },
    { name: "psmux (tmux for Windows)", value: "psmux", wingetId: "marlocarlo.psmux", command: "psmux.exe" },
    { name: "Kanata GUI (keyboard remapping)", value: "kanata_gui", wingetId: "jtroo.kanata_gui" },
    { name: "Rustup (for kanata CLI builds)", value: "rustup", wingetId: "Rustlang.Rustup", command: "rustup.exe" },
    { name: "Python 3 (required for antigravity)", value: "python", wingetId: "Python.Python.3", command: "python.exe" },
  ]);

  const selectedTerminals = await checkbox({
    message: "Select terminals to install:",
    choices: terminalChoices,
    pageSize: 10,
    loop: false,
  });

  const selectedEditors = await checkbox({
    message: "Select editors to install:",
    choices: editorChoices,
    pageSize: 10,
    loop: false,
  });

  const selectedAiTools = await checkbox({
    message: "Select AI CLIs to install:",
    choices: aiChoices,
    pageSize: 10,
    loop: false,
  });

  const selectedMisc = await checkbox({
    message: "Select additional tools:",
    choices: miscChoices,
    pageSize: 10,
    loop: false,
  });

  const anySelected =
    selectedTerminals.length ||
    selectedEditors.length ||
    selectedAiTools.length ||
    selectedMisc.length;

  if (!anySelected) {
    log.ok("No optional installs selected.");
    return;
  }

  const wingetNeeded =
    selectedTerminals.length ||
    selectedEditors.length ||
    selectedMisc.length;
  const npmNeeded =
    selectedAiTools.includes("gemini") || selectedAiTools.includes("opencode");

  const wingetOk = !wingetNeeded || ensureWinget();
  const npmOk = !npmNeeded || ensureNpm();

  if (wingetOk) {
    for (const item of selectedTerminals) {
      if (item === "warp") installWingetApp("Warp", "Warp.Warp");
      if (item === "windows_terminal") installWingetApp("Windows Terminal", "Microsoft.WindowsTerminal");
      if (item === "wezterm") installWingetApp("WezTerm", "wez.wezterm");
      if (item === "alacritty") installWingetApp("Alacritty", "Alacritty.Alacritty");
    }

    for (const item of selectedEditors) {
      if (item === "vscode") installWingetApp("Visual Studio Code", "Microsoft.VisualStudioCode");
    }

    for (const item of selectedMisc) {
      if (item === "powershell") installWingetApp("PowerShell 7", "Microsoft.PowerShell");
      if (item === "psmux") installWingetApp("psmux", "marlocarlo.psmux");
      if (item === "kanata_gui") installWingetApp("Kanata GUI", "jtroo.kanata_gui");
      if (item === "rustup") installWingetApp("Rustup", "Rustlang.Rustup");
      if (item === "python") {
        installWingetAppWithFallback("Python 3", [
          "Python.Python.3",
          "Python.Python.3.12",
          "Python.Python.3.11",
          "Python.Python.3.10",
        ]);
      }
    }
  }

  if (selectedAiTools.includes("claude")) {
    log.step("Installing Claude Code...");
    runCommand("powershell -NoProfile -ExecutionPolicy Bypass -Command \"irm https://claude.ai/install.ps1 | iex\"");
  }

  if (npmOk) {
    if (selectedAiTools.includes("gemini")) {
      installNpmGlobal("Gemini CLI", "npm install -g @google/gemini-cli@latest");
    }
    if (selectedAiTools.includes("opencode")) {
      installNpmGlobal("OpenCode CLI", "npm i -g opencode-ai");
    }
  }

  log.ok("Optional installs complete.");
}

runSetup().catch(console.error);
