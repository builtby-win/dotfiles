import { afterEach, describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { spawnSync } from "child_process";

describe("tmux and sesh workflow", () => {
  const functionsSh = readFileSync(join(process.cwd(), "shell", "functions.sh"), "utf-8");
  const aliasesSh = readFileSync(join(process.cwd(), "shell", "aliases.sh"), "utf-8");
  const tmuxSmartPath = join(process.cwd(), "stow-packages", "tmux", ".local", "bin", "tmux-smart");
  const tmuxSmartSh = readFileSync(tmuxSmartPath, "utf-8");
  const seshPickerSh = readFileSync(
    join(process.cwd(), "stow-packages", "tmux", ".config", "tmux", "sesh-picker.sh"),
    "utf-8",
  );
  const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf-8");
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      rmSync(tempDirs.pop()!, { force: true, recursive: true });
    }
  });

  function createExecutable(dir: string, name: string, content: string) {
    const filePath = join(dir, name);
    writeFileSync(filePath, content, "utf-8");
    chmodSync(filePath, 0o755);
    return filePath;
  }

  function createTmuxSmartFixture() {
    const fixtureDir = mkdtempSync(join(tmpdir(), "tmux-smart-"));
    const binDir = join(fixtureDir, "bin");
    tempDirs.push(fixtureDir);
    mkdirSync(binDir, { recursive: true });

    const logPath = join(fixtureDir, "tmux.log");

    createExecutable(
      binDir,
      "tmux",
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "${logPath}"
case "$1" in
  list-sessions)
    if [[ -n "\${TMUX_LIST_SESSIONS_OUTPUT:-}" ]]; then
      printf '%s\\n' "$TMUX_LIST_SESSIONS_OUTPUT"
    fi
    ;;
  has-session)
    case "$3" in
      client-a)
        exit 0
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  new-session|attach-session|switch-client|display-message)
    ;;
  *)
    ;;
esac
`,
    );

    createExecutable(
      binDir,
      "git",
      `#!/usr/bin/env bash
exit 1
`,
    );

    createExecutable(
      binDir,
      "sesh",
      `#!/usr/bin/env bash
exit 1
`,
    );

    return { fixtureDir, logPath };
  }

  it("ignores antigravity local workspace state", () => {
    expect(gitignore).toContain(".agtx/");
  });

  it("wraps bare tmux launches with cwd-aware session reuse", () => {
    expect(aliasesSh).toContain("tmux() {");
    expect(aliasesSh).toContain('command tmux-smart "$@"');
  });

  it("reuses tmux sessions from a canonical root path", () => {
    expect(tmuxSmartSh).toContain("Usage: tmux-smart [--root PATH] [--new]");
    expect(tmuxSmartSh).toContain('session_root_arg="$2"');
    expect(tmuxSmartSh).toContain('session_root="$(canonical_root "${session_root_arg:-$PWD}")" || exit 1');
    expect(tmuxSmartSh).toContain('if ! cwd="$(cd "$input_path" 2>/dev/null && pwd -P)"; then');
    expect(tmuxSmartSh).toContain('git -C "$cwd" rev-parse --show-toplevel');
    expect(tmuxSmartSh).toContain(
      "tmux list-sessions -F '#{session_name}:::#{session_path}'",
    );
    expect(tmuxSmartSh).toContain('if command tmux has-session -t "$session_name" 2>/dev/null; then');
    expect(tmuxSmartSh).toContain('session_name="${session_name//[^[:alnum:]_-]/-}"');
    expect(tmuxSmartSh).toContain('current_session="$(command tmux display-message -p \'#S\' 2>/dev/null)"');
    expect(tmuxSmartSh).toContain('sesh connect "$session_root"');
    expect(tmuxSmartSh).toContain('command tmux new-session -A -s "$session_name" -c "$session_root"');
  });

  it("creates a unique session name when the basename is already taken by another root", () => {
    const { fixtureDir, logPath } = createTmuxSmartFixture();
    const otherRoot = join(fixtureDir, "roots", "one", "client-a");
    const targetRoot = join(fixtureDir, "roots", "two", "client-a");
    mkdirSync(otherRoot, { recursive: true });
    mkdirSync(targetRoot, { recursive: true });
    const expectedRoot = realpathSync(targetRoot);

    const result = spawnSync(tmuxSmartPath, ["--root", targetRoot], {
      cwd: fixtureDir,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${join(fixtureDir, "bin")}:${process.env.PATH ?? ""}`,
        TMUX: "",
        TMUX_LIST_SESSIONS_OUTPUT: `client-a:::${otherRoot}`,
      },
    });

    expect(result.status).toBe(0);
    expect(readFileSync(logPath, "utf-8")).toContain(`new-session -A -s client-a-2 -c ${expectedRoot}`);
  });

  it("passes explicit tmux arguments through unchanged", () => {
    const { fixtureDir, logPath } = createTmuxSmartFixture();

    const result = spawnSync(tmuxSmartPath, ["list-sessions", "-F", "#{session_name}"], {
      cwd: fixtureDir,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${join(fixtureDir, "bin")}:${process.env.PATH ?? ""}`,
      },
    });

    expect(result.status).toBe(0);
    expect(readFileSync(logPath, "utf-8")).toContain("list-sessions -F #{session_name}");
  });

  it("fails fast when --root is missing its path value", () => {
    const { fixtureDir } = createTmuxSmartFixture();

    const result = spawnSync(tmuxSmartPath, ["--root"], {
      cwd: fixtureDir,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${join(fixtureDir, "bin")}:${process.env.PATH ?? ""}`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tmux-smart: --root requires a path.");
  });

  it("keeps the current search query when entering fuzzy mode", () => {
    expect(seshPickerSh).toContain("sesh list --icons --hide-duplicates");
    expect(seshPickerSh).toContain("/:enable-search+change-prompt(🔍  )+unbind(j,k)+unbind(esc)");
    expect(seshPickerSh).not.toContain("clear-query");
  });

  it("adds bb tmux-clean command for stale detached sessions", () => {
    expect(functionsSh).toContain("bb tmux-clean");
    expect(functionsSh).toContain("tmux-clean)");
    expect(functionsSh).toContain('"$session_name" =~ ^[0-9]+$');
    expect(functionsSh).toContain('tmux kill-session -t "$session_name"');
  });

  it("adds bb backups-clean command for latest-only retention", () => {
    expect(functionsSh).toContain("bb backups-clean");
    expect(functionsSh).toContain("backups-clean)");
    expect(functionsSh).toContain('Usage: bb backups-clean [--yes]');
    expect(functionsSh).toContain('Keeps only the newest dotfiles backup for each target.');
    expect(functionsSh).toContain('_bb_prune_backup_groups()');
    expect(functionsSh).toContain('group_key="${name%.dotfiles-backup.*}"');
    expect(functionsSh).toContain('_bb_prune_backup_groups "$base_dir" 1 "$auto_yes"');
  });
});
