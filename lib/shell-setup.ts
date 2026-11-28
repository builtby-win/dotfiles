import { select } from "@inquirer/prompts";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, lstatSync } from "fs";
import { join } from "path";
import { generateTmuxEntrypoint, hasBuiltbyTmuxBootstrap, normalizeTmuxEntrypoint, TMUX_MERGE_MARKER_START, upsertTmuxMergeBlock } from "./tmux-config";
import { addToManifest, backupFile } from "./backups";
import { log, HOME, DOTFILES_CONFIG_DIR, DOTFILES_LOCAL_SHELL_FILE, TMUX_BOOTSTRAP_BASIC_SOURCE, ZSHRC_MARKER_START, ZSHRC_MARKER_END } from "./context";

export function upsertZshrcMergeBlock(content: string): string {
  const block = [
    ZSHRC_MARKER_START,
    'if [[ -f "$HOME/.config/dotfiles/path" ]]; then',
    '  DOTFILES_DIR="$(cat "$HOME/.config/dotfiles/path")"',
    "  export DOTFILES_DIR",
    '  [[ -f "$DOTFILES_DIR/shell/init.sh" ]] && source "$DOTFILES_DIR/shell/init.sh"',
    "fi",
    ZSHRC_MARKER_END,
  ].join("\n");

  const startIdx = content.indexOf(ZSHRC_MARKER_START);
  const endIdx = content.indexOf(ZSHRC_MARKER_END);
  let next = content;

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    next = content.slice(0, startIdx) + content.slice(endIdx + ZSHRC_MARKER_END.length);
  }

  if (next && !next.endsWith("\n")) {
    next += "\n";
  }

  if (!next.trim()) {
    return `${block}\n`;
  }

  return `${next}\n${block}\n`;
}

export function ensureLocalShellOverridesFile(): void {
  if (!existsSync(DOTFILES_CONFIG_DIR)) {
    mkdirSync(DOTFILES_CONFIG_DIR, { recursive: true });
  }

  if (existsSync(DOTFILES_LOCAL_SHELL_FILE)) {
    return;
  }

  const content = [
    "# Local machine-only shell overrides",
    "# This file is not symlinked and is never committed by dotfiles.",
    "",
    "# Add aliases/functions for this computer only.",
    "# alias ll='ls -lah'",
    "# alias gs='git status'",
    "",
  ].join("\n");

  writeFileSync(DOTFILES_LOCAL_SHELL_FILE, content);
  log.success(`Created local shell overrides at ${DOTFILES_LOCAL_SHELL_FILE}`);
}

export function setupZshEntrypoint(): void {
  const zshrcPath = join(HOME, ".zshrc");
  let existingContent = "";
  let hasRegularFile = false;

  if (existsSync(zshrcPath)) {
    const stats = lstatSync(zshrcPath);

    if (stats.isSymbolicLink()) {
      try {
        const backupPath = backupFile(zshrcPath);
        addToManifest({ original: zshrcPath, backup: backupPath, type: "file" });
      } catch {
        log.warning("Could not back up ~/.zshrc symlink target before migration");
      }

      unlinkSync(zshrcPath);
      log.info("Converted ~/.zshrc symlink to local file");
    } else {
      existingContent = readFileSync(zshrcPath, "utf-8");
      hasRegularFile = true;
    }
  }

  const nextContent = upsertZshrcMergeBlock(existingContent);
  if (!hasRegularFile || nextContent !== existingContent) {
    if (hasRegularFile) {
      const backupPath = backupFile(zshrcPath);
      addToManifest({ original: zshrcPath, backup: backupPath, type: "file" });
    }
    writeFileSync(zshrcPath, nextContent);
    log.success(hasRegularFile
      ? "Updated ~/.zshrc to source dotfiles without symlinking"
      : "Created ~/.zshrc that sources dotfiles");
  } else {
    log.success("~/.zshrc already configured for dotfiles source mode");
  }

  ensureLocalShellOverridesFile();
}

export async function setupTmuxEntrypoint(): Promise<boolean> {
  const tmuxConfPath = join(HOME, ".tmux.conf");

  if (!existsSync(tmuxConfPath)) {
    try {
      const stats = lstatSync(tmuxConfPath);
      if (stats.isSymbolicLink()) {
        unlinkSync(tmuxConfPath);
        log.info("Removed stale ~/.tmux.conf symlink");
      }
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }

  if (!existsSync(tmuxConfPath)) {
    if (!existsSync(TMUX_BOOTSTRAP_BASIC_SOURCE)) {
      log.warning("tmux bootstrap.basic.conf not found - skipping ~/.tmux.conf setup");
      return false;
    }

    const content = generateTmuxEntrypoint();
    writeFileSync(tmuxConfPath, content);
    log.success("Created ~/.tmux.conf with builtby basic profile");
    return true;
  }

  const currentContent = readFileSync(tmuxConfPath, "utf-8");
  if (
    currentContent.includes(TMUX_MERGE_MARKER_START) ||
    hasBuiltbyTmuxBootstrap(currentContent) ||
    currentContent.includes("$HOME/.config/tmux/builtby/core.conf") ||
    currentContent.includes("$HOME/.config/tmux/builtby/basic.conf")
  ) {
    const normalizedContent = normalizeTmuxEntrypoint(currentContent);
    if (normalizedContent !== currentContent) {
      writeFileSync(tmuxConfPath, normalizedContent);
      log.success("Normalized ~/.tmux.conf to source the builtby tmux profile once");
      return true;
    }

    log.success("~/.tmux.conf already includes builtby tmux integration");
    return true;
  }

  log.warning("~/.tmux.conf already exists");
  const choice = await select({
    message: "How should we integrate tmux config?",
    choices: [
      { name: "Keep my existing keybinds (recommended)", value: "append-pro" as const },
      { name: "Replace with builtby basic profile (backup mine first)", value: "replace-basic" as const },
      { name: "Skip tmux config changes", value: "skip" as const },
    ],
  });

  if (choice === "skip") {
    log.info("Skipping tmux config changes");
    return false;
  }

  const backupPath = backupFile(tmuxConfPath);
  addToManifest({ original: tmuxConfPath, backup: backupPath, type: "file" });

  if (choice === "replace-basic") {
    if (!existsSync(TMUX_BOOTSTRAP_BASIC_SOURCE)) {
      log.error("tmux bootstrap.basic.conf not found");
      return false;
    }

    const content = generateTmuxEntrypoint();
    writeFileSync(tmuxConfPath, content);
    log.success("Replaced ~/.tmux.conf with builtby basic profile");
    return true;
  }

  const merged = upsertTmuxMergeBlock(currentContent);
  writeFileSync(tmuxConfPath, merged);
  log.success("Appended builtby tmux pro bootstrap without replacing your keybinds");
  return true;
}
