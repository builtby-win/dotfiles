import { existsSync, readFileSync, writeFileSync } from "node:fs";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
} as const;

export const DOTFILES_MARKER_START = "# === Added from builtby.win/dotfiles ===";
export const DOTFILES_MARKER_END = "# === End builtby.win/dotfiles ===";

export type ParsedSection = {
  readonly name: string;
  readonly type: "alias" | "function" | "export" | "comment" | "code" | "conditional";
  readonly content: string;
  readonly description?: string;
};

export type SectionConflict = {
  readonly user: ParsedSection;
  readonly dotfiles: ParsedSection;
};

export function parseShellFile(content: string): ParsedSection[] {
  const lines = content.split("\n");
  const sections: ParsedSection[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("#") && !trimmed.startsWith("#!")) {
      let commentBlock = `${line}\n`;
      const description = trimmed.replace(/^#\s*/u, "");
      index += 1;
      while (
        index < lines.length &&
        (lines[index] ?? "").trim().startsWith("#") &&
        !(lines[index] ?? "").trim().startsWith("#!")
      ) {
        commentBlock += `${lines[index] ?? ""}\n`;
        index += 1;
      }
      const nextLine = lines[index]?.trim() ?? "";
      if (nextLine && !nextLine.startsWith("#")) {
        continue;
      }
      sections.push({
        name: description.slice(0, 50),
        type: "comment",
        content: commentBlock.trimEnd(),
        description,
      });
      continue;
    }

    if (trimmed.startsWith("alias ")) {
      const match = trimmed.match(/^alias\s+([\w-]+)=/u);
      if (match?.[1]) {
        sections.push({ name: match[1], type: "alias", content: line, description: `Alias: ${match[1]}` });
      }
      index += 1;
      continue;
    }

    if (trimmed.startsWith("export ")) {
      const match = trimmed.match(/^export\s+(\w+)=/u);
      if (match?.[1]) {
        sections.push({ name: match[1], type: "export", content: line, description: `Environment: ${match[1]}` });
      }
      index += 1;
      continue;
    }

    const functionMatch = trimmed.match(/^(\w+)\s*\(\)\s*\{/u) ?? trimmed.match(/^function\s+(\w+)/u);
    if (functionMatch?.[1]) {
      const functionName = functionMatch[1];
      let functionContent = `${line}\n`;
      let braceCount = (line.match(/\{/gu) ?? []).length - (line.match(/\}/gu) ?? []).length;
      index += 1;
      while (index < lines.length && braceCount > 0) {
        const currentLine = lines[index] ?? "";
        functionContent += `${currentLine}\n`;
        braceCount += (currentLine.match(/\{/gu) ?? []).length - (currentLine.match(/\}/gu) ?? []).length;
        index += 1;
      }
      sections.push({
        name: functionName,
        type: "function",
        content: functionContent.trimEnd(),
        description: `Function: ${functionName}()`,
      });
      continue;
    }

    if (trimmed.startsWith("if ") || trimmed.startsWith("case ")) {
      let blockContent = `${line}\n`;
      let depth = 1;
      const isIf = trimmed.startsWith("if ");
      index += 1;
      while (index < lines.length && depth > 0) {
        const currentLine = lines[index] ?? "";
        const currentTrimmed = currentLine.trim();
        if (isIf) {
          if (currentTrimmed.startsWith("if ")) depth += 1;
          if (currentTrimmed === "fi") depth -= 1;
        } else {
          if (currentTrimmed.startsWith("case ")) depth += 1;
          if (currentTrimmed === "esac") depth -= 1;
        }
        blockContent += `${currentLine}\n`;
        index += 1;
      }
      const description = trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : "");
      sections.push({
        name: description,
        type: "conditional",
        content: blockContent.trimEnd(),
        description: `Conditional: ${description}`,
      });
      continue;
    }

    let codeBlock = `${line}\n`;
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index] ?? "";
      const nextTrimmed = nextLine.trim();
      if (
        nextTrimmed.startsWith("#") ||
        nextTrimmed.startsWith("alias ") ||
        nextTrimmed.startsWith("export ") ||
        /^\w+\s*\(\)\s*\{/u.test(nextTrimmed) ||
        /^function\s+\w+/u.test(nextTrimmed) ||
        nextTrimmed.startsWith("if ") ||
        nextTrimmed.startsWith("case ") ||
        !nextTrimmed
      ) {
        break;
      }
      codeBlock += `${nextLine}\n`;
      index += 1;
    }
    sections.push({
      name: trimmed.slice(0, 40),
      type: "code",
      content: codeBlock.trimEnd(),
      description: "Code block",
    });
  }

  return sections;
}

export function generateDiff(userContent: string, dotfilesContent: string): string {
  const userLines = userContent.split("\n");
  const dotfilesLines = dotfilesContent.split("\n");
  const diff: string[] = [];
  const maxLength = Math.max(userLines.length, dotfilesLines.length);

  for (let index = 0; index < maxLength; index += 1) {
    const userLine = userLines[index];
    const dotfilesLine = dotfilesLines[index];
    if (userLine === dotfilesLine) {
      diff.push(`  ${userLine ?? ""}`);
    } else if (userLine === undefined) {
      diff.push(`${colors.green}+ ${dotfilesLine}${colors.reset}`);
    } else if (dotfilesLine === undefined) {
      diff.push(`${colors.red}- ${userLine}${colors.reset}`);
    } else {
      diff.push(`${colors.red}- ${userLine}${colors.reset}`);
      diff.push(`${colors.green}+ ${dotfilesLine}${colors.reset}`);
    }
  }

  return diff.join("\n");
}

export function findNewSections(
  userSections: readonly ParsedSection[],
  dotfilesSections: readonly ParsedSection[],
): ParsedSection[] {
  const userNames = new Set(userSections.map((section) => section.name.toLowerCase()));
  return dotfilesSections.filter((section) => !userNames.has(section.name.toLowerCase()));
}

export function findConflictingSections(
  userSections: readonly ParsedSection[],
  dotfilesSections: readonly ParsedSection[],
): SectionConflict[] {
  const conflicts: SectionConflict[] = [];
  for (const dotfiles of dotfilesSections) {
    const user = userSections.find(
      (section) => section.name.toLowerCase() === dotfiles.name.toLowerCase() && section.type === dotfiles.type,
    );
    if (user && user.content !== dotfiles.content) {
      conflicts.push({ user, dotfiles });
    }
  }
  return conflicts;
}

export function appendSectionsToFile(filePath: string, sections: readonly ParsedSection[]): void {
  if (sections.length === 0) return;
  let content = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
  const startIndex = content.indexOf(DOTFILES_MARKER_START);
  const endIndex = content.indexOf(DOTFILES_MARKER_END);
  if (startIndex !== -1 && endIndex !== -1) {
    content = content.slice(0, startIndex) + content.slice(endIndex + DOTFILES_MARKER_END.length);
  }
  if (content && !content.endsWith("\n")) content += "\n";
  content += `\n${DOTFILES_MARKER_START}\n`;
  for (const section of sections) content += `${section.content}\n\n`;
  content += `${DOTFILES_MARKER_END}\n`;
  writeFileSync(filePath, content);
}
