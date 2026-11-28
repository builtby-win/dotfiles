import { checkbox, select, confirm } from "@inquirer/prompts";
import * as manifest from "./manifest";
import { setupAIConfigs } from "./ai-configs";
import { autoDetectExistingSetup, manifestExists, getAppInstallState, formatAppChoiceName, selectFocusedWorkflowApps, isManagedConfigApplied, type AppInstallState } from "./app-detect";
import { getManualDownloadApps, printManualDownloadApps, installApps } from "./app-install";
import { revertBackups } from "./backups";
import { getCurrentPlatform, isPlatformSupported, CATEGORY_ORDER, CATEGORY_LABELS, APPS, MANAGED_CONFIGS, OPTIONAL_FEATURES, AI_CONFIGS, type AppCategory, type App } from "./catalog";
import { colors, log, DOTFILES_DIR } from "./context";
import { setupManagedConfigs } from "./managed-configs";
import { selectedManagedTargetPaths, selectedAIConfigPaths, printPathList } from "./managed-targets";
import { runMergeMode } from "./merge-mode";
import { maybeSetDefaultShellToZsh, maybeLoginGhCli } from "./post-setup";
import { getBootstrapSetupPath, getPresetRef, loadPreset, validatePresetValues, listPresets, type SetupPathChoice } from "./presets";

export function printAdBanner(): void {
  console.log("");
  console.log(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  Speed up your workflow even more:${colors.reset}`);
  console.log("");
  console.log(`  ${colors.yellow}→${colors.reset} back2vibing - Focus & productivity for AI developers`);
  console.log(`    ${colors.dim}https://back2vibing.builtby.win/downloads/${colors.reset}`);
  console.log("");
  console.log(`  ${colors.yellow}→${colors.reset} zerostack`);
  console.log(`    ${colors.dim}https://zerostack.builtby.win${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  console.log("");
}

// ============================================
// Merge Mode - À la carte adoption
// ============================================

export async function mainMenu(): Promise<void> {
  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Setup dotfiles (full install)", value: "setup" as const },
      { name: "Merge with existing (à la carte)", value: "merge" as const },
      { name: "Revert to backups", value: "revert" as const },
      { name: "Exit", value: "exit" as const },
    ],
  });

  switch (action) {
    case "setup":
      return runSetup();
    case "merge":
      return runMergeMode();
    case "revert":
      return revertBackups();
    case "exit":
      process.exit(0);
  }
}

export async function runSetup(): Promise<void> {
  // Filter apps and configs by current platform
  const currentPlatform = getCurrentPlatform();
  const platformApps = APPS.filter(app => isPlatformSupported(app.platforms, currentPlatform));
  const platformManagedConfigs = MANAGED_CONFIGS.filter(config => isPlatformSupported(config.platforms, currentPlatform));
  const linuxCommandCategories = new Set<AppCategory>(["cli", "ai"]);
  const selectableApps = currentPlatform === "linux"
    ? platformApps.filter((app) => !app.cask && linuxCommandCategories.has(app.category))
    : platformApps;
  const selectableManagedConfigs = currentPlatform === "linux"
    ? platformManagedConfigs.filter((config) => config.value === "zsh" || config.value === "tmux" || config.value === "nvim")
    : platformManagedConfigs;
  const installItemLabel = currentPlatform === "linux" ? "commands" : "apps";

  // Check what's already installed
  log.step(`Checking installed ${installItemLabel}...`);
  const appStates = new Map<string, AppInstallState>();
  const installedConfigs = new Set<string>();

  for (const app of selectableApps) {
    appStates.set(app.value, getAppInstallState(app));
  }

  for (const config of selectableManagedConfigs) {
    if (isManagedConfigApplied(config.value)) {
      installedConfigs.add(config.value);
    }
  }

  const installedCount = [...appStates.values()].filter(s => s === "installed").length + installedConfigs.size;
  const partialCount = [...appStates.values()].filter(s => s === "partial").length;
  if (installedCount > 0) {
    log.success(`Found ${installedCount} already installed`);
  }
  if (partialCount > 0) {
    log.warning(`Found ${partialCount} with missing extras`);
  }
  console.log("");

  // ============================================
  // Auto-Detection for First Run (No Manifest)
  // ============================================
  let selectedApps: string[] = [];
  let selectedManagedConfigs: string[] = [];
  let selectedFeatures: string[] = [];
  let aiConfigs: string[] = [];
  let currentStep = 1;
  let skipToRecap = false;

  if (!manifestExists()) {
    // First run - detect what's already installed
    const detected = autoDetectExistingSetup();
    const detectedAppsOnPlatform = detected.apps.filter(a => selectableApps.some(p => p.value === a));
    const detectedConfigsOnPlatform = detected.configs.filter(c => selectableManagedConfigs.some(p => p.value === c));
    const detectedFeaturesList = Object.entries(detected.features).filter(([_, v]) => v).map(([k]) => k);

    const hasDetectedItems = detectedAppsOnPlatform.length > 0 || 
                             detectedConfigsOnPlatform.length > 0 || 
                             detectedFeaturesList.length > 0;

    console.log(`${colors.cyan}${colors.bold}Welcome to builtby.win/dotfiles!${colors.reset}`);
    console.log(`${colors.dim}Setup starts with the recommended full AI/dev workflow, with iTerm2 as the first terminal and OpenCode as the default AI coding CLI. You can also select Codex before install.${colors.reset}`);
    console.log("");

    // Support --focus flag and bootstrap handoff
    const bootstrapSetupPath = getBootstrapSetupPath(process.argv.slice(2));
    const isFocusFlag = process.argv.includes("--focus");
    let setupPath: SetupPathChoice | "use_detected" = bootstrapSetupPath ?? (isFocusFlag ? "focus" : "focus");
    let presetRef = getPresetRef(process.argv.slice(2));
    let preset = presetRef ? loadPreset(presetRef) : null;

    if (!bootstrapSetupPath && !isFocusFlag && !preset) {
      const startingPoint = await select<string>({
        message: "How should we set up this machine?",
        choices: [
          {
            name: "Recommended full AI/dev workflow",
            value: "focus",
            description: "iTerm2 and OpenCode are selected by default; optional alternatives like Codex can be checked."
          },
          ...listPresets().map((entry) => ({
            name: `Preset: ${entry.label}`,
            value: `preset:${entry.ref}`,
            description: "Everything preselected by the preset file; goes straight to the review screen.",
          })),
          ...(hasDetectedItems
            ? [{
                name: `Keep detected setup (${detectedAppsOnPlatform.length} apps, ${detectedConfigsOnPlatform.length} configs)`,
                value: "use_detected",
                description: "Keeps only the tools and configs already found on this machine.",
              }]
            : []),
          {
            name: "Customize manually",
            value: "customize",
            description: "Walk through each group yourself.",
          },
        ],
        default: "focus",
      });
      if (startingPoint.startsWith("preset:")) {
        presetRef = startingPoint.slice("preset:".length);
        preset = loadPreset(presetRef);
      } else {
        setupPath = startingPoint as SetupPathChoice | "use_detected";
      }
    }

    if (preset) {
      // A preset file decides everything; the user only reviews the step 4 recap.
      validatePresetValues("apps", [...(preset.apps ?? []), ...(preset.addApps ?? []), ...(preset.removeApps ?? [])], new Set(APPS.map((a) => a.value)));
      validatePresetValues("configs", preset.configs, new Set(MANAGED_CONFIGS.map((c) => c.value)));
      validatePresetValues("features", preset.features, new Set(OPTIONAL_FEATURES.map((f) => f.value)));
      selectedApps = preset.apps
        ? [...preset.apps]
        : selectableApps
            .filter((a) => (appStates.get(a.value) ?? "not_installed") !== "not_installed" || a.checked)
            .map((a) => a.value);
      for (const added of preset.addApps ?? []) {
        if (!selectedApps.includes(added)) selectedApps.push(added);
      }
      selectedApps = selectedApps.filter(
        (value) => !(preset.removeApps ?? []).includes(value) && selectableApps.some((a) => a.value === value),
      );
      selectedManagedConfigs = (preset.configs ?? selectableManagedConfigs.filter((c) => c.checked).map((c) => c.value))
        .filter((value) => selectableManagedConfigs.some((c) => c.value === value));
      selectedFeatures = preset.features ?? OPTIONAL_FEATURES.filter((f) => f.checked).map((f) => f.value);
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success(`Selected preset: ${preset.name ?? presetRef}`);
      console.log("");
    } else if (setupPath === "use_detected") {
      selectedApps = detectedAppsOnPlatform;
      selectedManagedConfigs = detectedConfigsOnPlatform;
      selectedFeatures = detectedFeaturesList;
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Using detected settings");
      console.log("");
    } else if (setupPath === "focus") {
      selectedApps = await selectFocusedWorkflowApps(selectableApps, appStates, installItemLabel);
      selectedManagedConfigs = ["zsh", "tmux", "iterm2"];
      selectedFeatures = ["tips"];
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected focused full AI/dev workflow defaults");
      console.log("");
    } else if (setupPath === "standard") {
      selectedApps = selectableApps.filter(a => a.checked).map(a => a.value);
      selectedManagedConfigs = selectableManagedConfigs.filter(c => c.checked).map(c => c.value);
      selectedFeatures = OPTIONAL_FEATURES.filter(f => f.checked).map(f => f.value);
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected standard defaults");
      console.log("");
    } else if (setupPath === "minimal") {
      selectedApps = ["starship", "fzf", "zoxide"]; // Core CLI dependencies
      selectedManagedConfigs = ["zsh"];
      selectedFeatures = ["tips"];
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected minimal shell foundation");
      console.log("");
    } else if (setupPath === "ai_agent") {
      selectedApps = selectableApps.filter(a => a.checked).map(a => a.value);
      if (!selectedApps.includes("opencode")) selectedApps.push("opencode");
      selectedManagedConfigs = selectableManagedConfigs.filter(c => c.checked).map(c => c.value);
      selectedFeatures = OPTIONAL_FEATURES.filter(f => f.checked).map(f => f.value);
      aiConfigs = ["opencode"];
      skipToRecap = true;
      currentStep = 4;
      console.log("");
      log.success("Selected OpenCode with AI agent configs");
      console.log(`  ${colors.dim}Includes: opencode CLI install, oh-my-openagent.json agent configs, TUI theme${colors.reset}`);
      console.log("");
    } else {
      console.log("");
      log.info("Proceeding to manual selection...");
      console.log("");
    }
  }

  // If not skipping, show info and do normal flow
  if (!skipToRecap) {
    // Ask if user wants to see what each tool does
    const showInfo = await confirm({
      message: "Want to see what each tool does first?",
      default: false,
    });

    if (showInfo) {
      console.log("");
      for (const category of CATEGORY_ORDER) {
        const appsInCategory = selectableApps.filter(app => app.category === category);
        if (appsInCategory.length === 0) continue;
        console.log(`${colors.cyan}${colors.bold}=== ${CATEGORY_LABELS[category]} ===${colors.reset}`);
        for (const app of appsInCategory) {
          const urlPart = app.url ? ` ${colors.dim}${app.url}${colors.reset}` : "";
          console.log(`  ${colors.bold}${app.name}${colors.reset} - ${app.desc || ""}${urlPart}`);
        }
        console.log("");
      }
    }
  }

  const TOTAL_STEPS = 5;

  // Step navigation loop
  while (currentStep >= 1) {
    // Step 1: Show every app, grouped visually so each one can be selected
    if (currentStep === 1) {
      log.step(`[Step 1 of ${TOTAL_STEPS}] Select ${installItemLabel} to install`);

      const appChoices: Array<{ name: string; value: string; checked?: boolean; disabled?: string | false }> = [];
      for (const category of CATEGORY_ORDER) {
        const appsInCategory = selectableApps.filter((app) => app.category === category);
        if (appsInCategory.length === 0) continue;

        appChoices.push({
          name: `${colors.cyan}${colors.bold}── ${CATEGORY_LABELS[category]} ──${colors.reset}`,
          value: `__category_${category}__`,
          disabled: " ",
        });

        for (const app of appsInCategory) {
          const state = appStates.get(app.value) ?? "not_installed";
          const details = [
            app.desc,
            app.url ? `${colors.cyan}${app.url}${colors.reset}` : "",
          ].filter(Boolean).join(` ${colors.dim}·${colors.reset} `);
          appChoices.push({
            name: `  ${formatAppChoiceName(app, state)}${details ? ` ${colors.dim}- ${details}${colors.reset}` : ""}`,
            value: app.value,
            checked: state !== "not_installed" || (app.checked ?? false),
            disabled: state === "installed" ? "(already installed)" : false,
          });
        }
      }

      selectedApps = await checkbox({
        message: `Select ${installItemLabel} individually (groups are shown as headings)${colors.reset}:`,
        choices: appChoices,
        pageSize: 20,
        loop: false,
      });

      selectedApps = selectedApps.filter((app) => !app.startsWith("__category_"));

      for (const app of selectableApps) {
        const state = appStates.get(app.value);
        if ((state === "installed" || state === "partial") && !selectedApps.includes(app.value)) {
          selectedApps.push(app.value);
        }
      }

      console.log("");
      const toInstall = selectedApps.filter((app) => appStates.get(app) !== "installed").length;
      log.success(`Selected ${selectedApps.length} ${installItemLabel} (${toInstall} to install)`);
      if (toInstall === 0) {
        log.info("All selected tools are already installed — proceed or go back to add more.");
      }


      const step1Nav = await select({
        message: "Next step?",
        choices: [
          { name: "Continue to step 2 (configs)", value: "next" as const },
          { name: "Back to main menu", value: "menu" as const },
        ],
      });

      if (step1Nav === "menu") {
        return mainMenu();
      }

      console.log("");
      currentStep = 2;
    }

    // Step 2: Select chezmoi-managed configs
    if (currentStep === 2) {
      log.step(`[Step 2 of ${TOTAL_STEPS}] Select configs to apply`);
      const managedChoices = selectableManagedConfigs.map((config) => {
          const installed = installedConfigs.has(config.value);
          const descPart = config.desc ? ` ${colors.dim}- ${config.desc}${colors.reset}` : "";
          return {
            name: installed 
              ? `${config.name}${descPart} ${colors.green}(installed)${colors.reset}` 
              : `${config.name}${descPart}`,
            value: config.value,
            checked: installed ? true : (config.checked ?? false),
            disabled: installed ? "(already installed)" : false,
          };
        });
      
      selectedManagedConfigs = await checkbox({
        message: `Select configs to install (space to toggle, enter when done — you can go back after) ${colors.dim}[${managedChoices.length} items]${colors.reset}:`,
        choices: managedChoices,
        pageSize: 20,
        loop: false,
      });

      console.log("");
      const step2Nav = await select({
        message: "Next step?",
        choices: [
          { name: "Continue to step 3 (optional features)", value: "next" as const },
          { name: "Back to step 1 (apps)", value: "back" as const },
        ],
      });

      if (step2Nav === "back") {
        currentStep = 1;
        continue;
      }

      currentStep = 3;
    }

    // Step 3: Select optional features
    if (currentStep === 3) {
      log.step(`[Step 3 of ${TOTAL_STEPS}] Select optional features`);
      const featureChoices = OPTIONAL_FEATURES.map((feature) => ({
          name: feature.desc ? `${feature.name} ${colors.dim}- ${feature.desc}${colors.reset}` : feature.name,
          value: feature.value,
          checked: feature.checked ?? false,
          disabled: false,
        }));

      selectedFeatures = await checkbox({
        message: `Select optional features (space to toggle, enter when done — you can go back after) ${colors.dim}[${featureChoices.length} items]${colors.reset}:`,
        choices: featureChoices,
        pageSize: 20,
        loop: false,
      });

      console.log("");
      const step3Nav = await select({
        message: "Next step?",
        choices: [
          { name: "Continue to step 4 (review selections)", value: "next" as const },
          { name: "Back to step 2 (configs)", value: "back" as const },
        ],
      });

      if (step3Nav === "back") {
        currentStep = 2;
        continue;
      }

      currentStep = 4;
    }

    // Step 4: Recap and confirm
    if (currentStep === 4) {
      const autoSelectedAppConfigs = selectedApps
        .filter((app) => {
          const appDef = APPS.find((a) => a.value === app);
          return appDef?.configs && appDef.configs.length > 0;
        })
        .flatMap((app) => APPS.find((a) => a.value === app)?.configs ?? []);

      const managedConfigValues = new Set(MANAGED_CONFIGS.map((config) => config.value));
      const autoSelectedManagedConfigs = autoSelectedAppConfigs.filter((config) => managedConfigValues.has(config));
      selectedManagedConfigs = [...new Set([...selectedManagedConfigs, ...autoSelectedManagedConfigs])];

      // Auto-select AI configs based on app selection
      const autoSelectedAIConfigs = autoSelectedAppConfigs.filter((config) => AI_CONFIGS[config]);

      aiConfigs = [...new Set(autoSelectedAIConfigs)];

      // Show recap screen
      log.step(`[Step 4 of ${TOTAL_STEPS}] Review your selections`);
      console.log("");

      // Count what will actually be installed (not already installed)
      const appsToInstallCount = selectedApps.filter(app => {
        const state = appStates.get(app);
        return state === "not_installed" || state === "partial";
      }).length;
      const configsToInstallCount = selectedManagedConfigs.filter(c => !installedConfigs.has(c)).length;

      // Apps summary
      console.log(`  ${colors.bold}${installItemLabel[0].toUpperCase() + installItemLabel.slice(1)}:${colors.reset} ${selectedApps.length} selected (${appsToInstallCount} to install)`);
      if (selectedApps.length > 0) {
        // Group by category for display
        for (const category of CATEGORY_ORDER) {
          const appsInCat = selectedApps
            .map(v => APPS.find(a => a.value === v))
            .filter((a): a is App => a !== undefined && a.category === category);
          if (appsInCat.length > 0) {
            console.log(`    ${colors.dim}${CATEGORY_LABELS[category]}:${colors.reset} ${appsInCat.map(a => a.name).join(", ")}`);
          }
        }
      }

      const manualDownloadApps = getManualDownloadApps(selectedApps);
      if (manualDownloadApps.length > 0) {
        console.log("");
        printManualDownloadApps(manualDownloadApps);
      }

      // Configs summary
      console.log(`  ${colors.bold}Configs:${colors.reset} ${selectedManagedConfigs.length} selected (${configsToInstallCount} to install)`);
      if (selectedManagedConfigs.length > 0) {
        const configNames = selectedManagedConfigs
          .map(v => MANAGED_CONFIGS.find(c => c.value === v)?.name)
          .filter(Boolean)
          .join(", ");
        console.log(`    ${colors.dim}${configNames}${colors.reset}`);
      }

      // Features summary
      console.log(`  ${colors.bold}Features:${colors.reset} ${selectedFeatures.length} selected`);
      if (selectedFeatures.length > 0) {
        const featureNames = selectedFeatures
          .map(v => OPTIONAL_FEATURES.find(f => f.value === v)?.name)
          .filter(Boolean)
          .join(", ");
        console.log(`    ${colors.dim}${featureNames}${colors.reset}`);
      }

      // AI configs (auto-selected)
      if (aiConfigs.length > 0) {
        console.log(`  ${colors.bold}AI Configs:${colors.reset} ${aiConfigs.length} auto-selected`);
        console.log(`    ${colors.dim}${aiConfigs.map(c => AI_CONFIGS[c]?.name).join(", ")}${colors.reset}`);
      }

      console.log("");
      console.log(`  ${colors.bold}Will modify or create:${colors.reset}`);
      printPathList(
        [
          ...selectedManagedTargetPaths(selectedManagedConfigs),
          ...selectedAIConfigPaths(aiConfigs),
          manifest.getManifestPath(),
        ],
        "No file changes selected"
      );

      const skippedConfigs = selectableManagedConfigs
        .filter((config) => !selectedManagedConfigs.includes(config.value))
        .map((config) => config.name);
      if (skippedConfigs.length > 0) {
        console.log(`  ${colors.bold}Will not touch:${colors.reset}`);
        console.log(`    ${colors.dim}${skippedConfigs.join(", ")}${colors.reset}`);
      }

      console.log(`  ${colors.bold}Backups:${colors.reset}`);
      console.log(`    ${colors.dim}Guided setup backs up managed files before optional replacements.${colors.reset}`);
      console.log(`    ${colors.dim}Restore later with: bb setup revert${colors.reset}`);

      if (appsToInstallCount === 0 && configsToInstallCount === 0 && aiConfigs.length === 0) {
        console.log(`  ${colors.bold}Already installed:${colors.reset}`);
        console.log(`    ${colors.dim}Selected apps/configs already appear to be present; setup will refresh the manifest and shell checks.${colors.reset}`);
      }

      console.log("");

      const proceed = await confirm({
        message: "Apply these installs and file changes?",
        default: true,
      });

      if (!proceed) {
        const goBack = await confirm({
          message: "Go back to edit selections?",
          default: true,
        });

        if (goBack) {
          console.log("");
          currentStep = 3;
          continue;
        } else {
          console.log("Aborted.");
          process.exit(0);
        }
      }

      console.log("");
      currentStep = 5;
    }

    // Step 5: Install everything
    if (currentStep === 5) {
      break;
    }
  }

  // Step 5: Install everything
  log.step(`[Step 5 of ${TOTAL_STEPS}] Installing...`);
  console.log("");

  // Filter: include apps that are not_installed OR partial (need deps)
  const appsToInstall = selectedApps.filter((app) => {
    const state = appStates.get(app);
    return state === "not_installed" || state === "partial";
  });
  const configsToInstall = selectedManagedConfigs.filter((config) => !installedConfigs.has(config));
  let failedApps: string[] = [];

  if (appsToInstall.length === 0 && configsToInstall.length === 0 && aiConfigs.length === 0) {
    log.success("Everything is already installed!");
  } else {
    failedApps = await installApps(appsToInstall);
    console.log("");

    await setupManagedConfigs(configsToInstall);
    console.log("");

    await setupAIConfigs(aiConfigs);
  }

  await maybeSetDefaultShellToZsh(selectedManagedConfigs);
  console.log("");

  await maybeLoginGhCli(selectedApps);

  // Save setup manifest (tracks what user selected for features)
  const setupManifest = manifest.getEmptyManifest();
  manifest.setInstalledApps(setupManifest, selectedApps);
  manifest.setInstalledConfigs(setupManifest, selectedManagedConfigs);
  manifest.setFeatures(
    setupManifest,
    selectedFeatures.reduce((acc, feature) => {
      acc[feature] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );
  manifest.saveManifest(setupManifest);
  log.success(`Setup manifest saved to ${manifest.getManifestPath()}`);
  printAdBanner();

  // Done!
  console.log("");
  if (failedApps.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠ Setup finished, but these installs failed: ${failedApps.join(", ")}${colors.reset}`);
    console.log(`${colors.dim}  Scroll up for the brew error, fix it, then rerun: bb setup${colors.reset}`);
  } else {
    console.log(`${colors.green}${colors.bold}✅ Your dotfiles are set up!${colors.reset}`);
  }
  console.log("");
  
  console.log(`  ${colors.bold}Next steps:${colors.reset}`);
  console.log(`  1. ${colors.cyan}exec zsh${colors.reset} (or open a new terminal)`);
  console.log(`  2. Try the dotfiles helper: ${colors.cyan}bb help${colors.reset}`);
  console.log(`  3. Change or restore setup later: ${colors.cyan}bb setup${colors.reset}`);
  console.log("");

  const bootstrapCommand = getCurrentPlatform() === "linux" ? "./bootstrap-linux.sh" : "./bootstrap.sh";
  console.log(`${colors.dim}  To update manually: cd ${DOTFILES_DIR} && git pull && ${bootstrapCommand}${colors.reset}`);
  console.log(`${colors.dim}  Setup manifest: ${manifest.getManifestPath()}${colors.reset}`);
}
