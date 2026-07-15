export const TMUX_MERGE_MARKER_START = "# === Added from builtby.win/dotfiles (tmux) ===";
export const TMUX_MERGE_MARKER_END = "# === End builtby.win/dotfiles (tmux) ===";

export function upsertTmuxMergeBlock(content: string): string {
  const block = [
    TMUX_MERGE_MARKER_START,
    `if-shell '[ -f "$HOME/.config/tmux/builtby/bootstrap.pro.conf" ]' 'source-file "$HOME/.config/tmux/builtby/bootstrap.pro.conf"'`,
    TMUX_MERGE_MARKER_END,
  ].join("\n");

  const startIndex = content.indexOf(TMUX_MERGE_MARKER_START);
  const endIndex = content.indexOf(TMUX_MERGE_MARKER_END);
  let next = content;

  if (startIndex !== -1 && endIndex > startIndex) {
    next = content.slice(0, startIndex) + content.slice(endIndex + TMUX_MERGE_MARKER_END.length);
  }

  if (next && !next.endsWith("\n")) {
    next += "\n";
  }

  return `${next}\n${block}\n`;
}

export function generateTmuxEntrypoint(): string {
  return [
    "# =============================================================================",
    "# Tmux bootstrap",
    "# =============================================================================",
    "",
    `source-file "$HOME/.config/tmux/builtby/bootstrap.basic.conf"`,
  ].join("\n") + "\n";
}

function isManagedTmuxDirectSource(line: string): boolean {
  return (
    line === 'source-file "$HOME/.config/tmux/builtby/core.conf"' ||
    line === 'source-file -q "$HOME/.config/tmux/builtby/core.conf"' ||
    line === 'source-file "$HOME/.config/tmux/builtby/basic.conf"' ||
    line === 'source-file -q "$HOME/.config/tmux/builtby/basic.conf"'
  );
}

export function hasBuiltbyTmuxBootstrap(content: string): boolean {
  return content.includes("bootstrap.basic.conf") || content.includes("bootstrap.pro.conf");
}

export function normalizeTmuxEntrypoint(content: string): string {
  const lines = content.split(/\r?\n/u);
  const normalized: string[] = [];
  let removedManagedDirectSource = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    const nextLine = lines[index + 1]?.trim() ?? "";

    if (trimmed === "# Back2Vibing Integration" && nextLine.includes("back2vibing-tmux.conf")) {
      continue;
    }

    if (isManagedTmuxDirectSource(trimmed)) {
      removedManagedDirectSource = true;
      continue;
    }

    if (trimmed.startsWith("source-file ") && trimmed.includes("back2vibing-tmux.conf")) {
      continue;
    }

    normalized.push(line);
  }

  if (removedManagedDirectSource && !hasBuiltbyTmuxBootstrap(normalized.join("\n"))) {
    normalized.push('source-file "$HOME/.config/tmux/builtby/bootstrap.basic.conf"');
  }

  const next = normalized.join("\n").replace(/\n{3,}$/u, "\n\n").replace(/[ \t]+\n/gu, "\n");
  return next.endsWith("\n") ? next : `${next}\n`;
}
