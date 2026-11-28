import { existsSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { addToManifest, handleFileConflict, backupFile } from "./backups";
import { AI_CONFIGS } from "./catalog";
import { log, DOTFILES_DIR, HOME } from "./context";

export async function setupAIConfigs(configs: string[]): Promise<void> {
  if (configs.length === 0) return;

  log.step("Setting up AI tool configs...");

  for (const config of configs) {
    const configInfo = AI_CONFIGS[config];
    if (!configInfo) continue;

    const templateDir = join(DOTFILES_DIR, "ai", "tool-settings", config);
    if (!existsSync(templateDir)) {
      log.warning(`Templates for ${configInfo.name} not found, skipping`);
      continue;
    }

    const targetDir = join(HOME, configInfo.targetDir ?? `.${config}`);

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    for (const template of configInfo.templates) {
      const sourcePath = join(templateDir, template);
      const targetPath = join(targetDir, template);

      if (!existsSync(sourcePath)) {
        continue;
      }

      const targetParentDir = dirname(targetPath);
      if (!existsSync(targetParentDir)) {
        mkdirSync(targetParentDir, { recursive: true });
      }

      const choice = await handleFileConflict(targetPath);
      if (choice === "skip") {
        log.info(`Skipping ${template}`);
        continue;
      } else if (choice === "backup" && existsSync(targetPath)) {
        const backupPath = backupFile(targetPath);
        addToManifest({ original: targetPath, backup: backupPath, type: "file" });
      }

      copyFileSync(sourcePath, targetPath);
      log.success(`${configInfo.name}: ${template} installed`);
    }

    if (configInfo.skill) {
      const skillSourcePath = join(templateDir, configInfo.skill.template);
      const skillTargetPath = join(HOME, configInfo.skill.targetDir, configInfo.skill.template);
      if (existsSync(skillSourcePath)) {
        const skillParentDir = dirname(skillTargetPath);
        if (!existsSync(skillParentDir)) {
          mkdirSync(skillParentDir, { recursive: true });
        }

        const choice = await handleFileConflict(skillTargetPath);
        if (choice === "backup" && existsSync(skillTargetPath)) {
          const backupPath = backupFile(skillTargetPath);
          addToManifest({ original: skillTargetPath, backup: backupPath, type: "file" });
        }
        if (choice !== "skip") {
          copyFileSync(skillSourcePath, skillTargetPath);
          log.success(`${configInfo.name}: ${configInfo.skill.template} installed`);
        }
      }
    }
  }
}
