#!/usr/bin/env npx tsx
import { revertBackups } from "./lib/backups";
import { runMergeMode } from "./lib/merge-mode";
import { mainMenu, runSetup } from "./lib/run-setup";

async function main(): Promise<void> {
  try {
    console.log("");
    const action = process.argv[2];
    if (action === "menu") {
      await mainMenu();
    } else if (action === "merge") {
      await runMergeMode();
    } else if (action === "revert") {
      await revertBackups();
    } else {
      await runSetup();
    }
  } catch (error) {
    if ((error as Error).name === "ExitPromptError") {
      console.log("\nAborted.");
      process.exit(0);
    }
    throw error;
  }
}

main().catch(console.error);
