#!/usr/bin/env npx tsx
import { confirm } from "@inquirer/prompts";
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
};

const DOTFILES_DIR = dirname(fileURLToPath(import.meta.url));

function runPowerShellScript(scriptPath: string) {
  try {
    console.log(`${colors.blue}==>${colors.reset} Executing ${scriptPath}...`);
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: "inherit" });
    console.log(`${colors.green}✓${colors.reset} Script completed successfully.`);
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Script failed execution.`);
    process.exit(1);
  }
}

async function runSetup() {
  console.log("");
  console.log(`${colors.cyan}${colors.bold}=== Windows Dotfiles Setup ===${colors.reset}`);
  console.log("This script will configure your Windows environment for AI coding.");
  console.log("");

  if (process.platform !== "win32") {
    console.error(`${colors.red}Error: This script is intended for Windows only.${colors.reset}`);
    process.exit(1);
  }

  const proceed = await confirm({
    message: "Do you want to run the core bootstrap script (windows/install.ps1)?",
    default: true,
  });

  if (proceed) {
    const scriptPath = join(DOTFILES_DIR, "windows", "install.ps1");
    runPowerShellScript(scriptPath);
  } else {
    console.log("Setup cancelled.");
  }
}

runSetup().catch(console.error);