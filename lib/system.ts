import { execSync } from "child_process";
import { createLinuxPackageManager, type SystemCommands } from "./linux";

export function runCommand(cmd: string, silent = false): boolean {
  try {
    execSync(cmd, { stdio: silent ? "pipe" : "inherit" });
    return true;
  } catch {
    return false;
  }
}

export function getCommandOutput(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

export const systemCommands: SystemCommands = {
  runCommand,
  getCommandOutput,
};

export const linuxPM = createLinuxPackageManager(systemCommands);

export function getLinuxPackageManager() { return linuxPM.detect(); }

export function getLinuxPackageName(name: string) { return linuxPM.getPackageName(name); }
