import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const scriptPath = path.resolve(__dirname, "../scripts/conductor-workspace.sh");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function archive(options: {
  savedId?: string;
  legacy?: boolean;
  workspaces?: { workspace_id: string; label: string }[];
  panes?: { workspace_id: string; cwd: string }[];
  listFailure?: boolean;
  paneFailure?: boolean;
  closeFailure?: boolean;
  retainedAfterClose?: boolean;
  malformedList?: boolean;
  symlinkedPanePath?: boolean;
}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "conductor-archive-"));
  temporaryDirectories.push(home);
  const workspacePath = path.join(home, "workspaces", "private", "test");
  const stateDirectory = path.join(home, "state", "conductor-herdr-workspaces");
  const legacyDirectory = path.join(home, ".conductor-herdr-workspaces");
  const key = createHash("sha256").update(workspacePath).digest("hex").slice(0, 16);
  fs.mkdirSync(stateDirectory, { recursive: true });
  fs.mkdirSync(legacyDirectory, { recursive: true });
  let panePath = workspacePath;
  if (options.symlinkedPanePath) {
    fs.mkdirSync(workspacePath, { recursive: true });
    panePath = path.join(home, "pane-cwd");
    fs.symlinkSync(workspacePath, panePath, "dir");
  }
  const stateFile = path.join(options.legacy ? legacyDirectory : stateDirectory, key);
  if (options.savedId !== undefined) fs.writeFileSync(stateFile, options.savedId);
  const result = spawnSync("/bin/sh", ["-c", `
herdr() {
  case "$1 $2" in
    "workspace list")
      [ "$LIST_FAILURE" = 0 ] || { echo 'server unavailable' >&2; return 1; }
      [ "$MALFORMED_LIST" = 0 ] || { echo '{"error":"bad response"}'; return 0; }
      if [ -f "$HOME/closed" ] && [ "$RETAINED_AFTER_CLOSE" = 0 ]; then
        printf '%s\n' '{"result":{"workspaces":[]}}'
      else
        printf '%s\n' "$WORKSPACES"
      fi ;;
    "pane list")
      [ "$PANE_FAILURE" = 0 ] || { echo 'pane lookup unavailable' >&2; return 1; }
      printf '%s\n' "$PANES" ;;
    "workspace close")
      printf '%s\n' "$3" >> "$HOME/close-attempts"
      [ "$CLOSE_FAILURE" = 0 ] || { echo 'workspace_group_close_required' >&2; return 1; }
      touch "$HOME/closed" ;;
    *) echo "unexpected command: $*" >&2; return 1 ;;
  esac
}
set -- archive
. "$SCRIPT_PATH"
`], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      XDG_STATE_HOME: path.join(home, "state"),
      SCRIPT_PATH: scriptPath,
      CONDUCTOR_WORKSPACE_PATH: workspacePath,
      CONDUCTOR_WORKSPACE_NAME: "test",
      LIST_FAILURE: options.listFailure ? "1" : "0",
      PANE_FAILURE: options.paneFailure ? "1" : "0",
      CLOSE_FAILURE: options.closeFailure ? "1" : "0",
      RETAINED_AFTER_CLOSE: options.retainedAfterClose ? "1" : "0",
      MALFORMED_LIST: options.malformedList ? "1" : "0",
      WORKSPACES: JSON.stringify({ result: { workspaces: options.workspaces ?? [{ workspace_id: "wTarget", label: "private-test" }] } }),
      PANES: JSON.stringify({ result: { panes: options.panes ?? [{ workspace_id: "wTarget", cwd: panePath }] } }),
    },
  });
  const attemptsFile = path.join(home, "close-attempts");
  return {
    status: result.status,
    state: fs.existsSync(stateFile) ? fs.readFileSync(stateFile, "utf8").trim() : undefined,
    log: fs.readFileSync(path.join(stateDirectory, "log"), "utf8"),
    closedIds: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, "utf8").trim().split("\n") : [],
  };
}

describe("Conductor Herdr archive", () => {
  it("retains state and surfaces a failed close", () => {
    const result = archive({ savedId: "wTarget", closeFailure: true });
    expect(result.status).not.toBe(0);
    expect(result.state).toBe("wTarget");
    expect(result.log).toContain("workspace_group_close_required");
    expect(result.log).toContain("FAILED");
  });

  it("removes legacy state only after a successful close", () => {
    const result = archive({ savedId: "wTarget", legacy: true });
    expect(result.status).toBe(0);
    expect(result.closedIds).toEqual(["wTarget"]);
    expect(result.state).toBeUndefined();
  });

  it("recovers a stale saved ID using the workspace path", () => {
    const result = archive({ savedId: "wStale", workspaces: [{ workspace_id: "wTarget", label: "renamed" }] });
    expect(result.status).toBe(0);
    expect(result.closedIds).toEqual(["wTarget"]);
    expect(result.state).toBeUndefined();
  });

  it("matches equivalent symlinked paths even after the workspace is renamed", () => {
    const result = archive({ savedId: "wStale", symlinkedPanePath: true, workspaces: [{ workspace_id: "wTarget", label: "renamed" }] });
    expect(result.status).toBe(0);
    expect(result.closedIds).toEqual(["wTarget"]);
    expect(result.state).toBeUndefined();
  });

  it("does not turn an unavailable server into successful cleanup", () => {
    const result = archive({ savedId: "wTarget", listFailure: true });
    expect(result.status).not.toBe(0);
    expect(result.state).toBe("wTarget");
    expect(result.closedIds).toEqual([]);
    expect(result.log).toContain("server unavailable");
  });

  it("retains stale state if fallback pane lookup fails", () => {
    const result = archive({ savedId: "wStale", paneFailure: true });
    expect(result.status).not.toBe(0);
    expect(result.state).toBe("wStale");
    expect(result.closedIds).toEqual([]);
    expect(result.log).toContain("pane lookup unavailable");
  });

  it("rejects malformed lookup responses without deleting state", () => {
    const result = archive({ savedId: "wTarget", malformedList: true });
    expect(result.status).not.toBe(0);
    expect(result.state).toBe("wTarget");
    expect(result.closedIds).toEqual([]);
  });

  it("rejects ambiguous label matches instead of closing an arbitrary workspace", () => {
    const result = archive({ panes: [], workspaces: [
      { workspace_id: "wFirst", label: "private-test" },
      { workspace_id: "wSecond", label: "private-test" },
    ] });
    expect(result.status).not.toBe(0);
    expect(result.closedIds).toEqual([]);
  });

  it("retains state if a successful close response leaves the workspace open", () => {
    const result = archive({ savedId: "wTarget", retainedAfterClose: true });
    expect(result.status).not.toBe(0);
    expect(result.state).toBe("wTarget");
  });

  it("treats an already absent workspace as an idempotent archive", () => {
    const result = archive({ savedId: "wStale", workspaces: [], panes: [] });
    expect(result.status).toBe(0);
    expect(result.closedIds).toEqual([]);
    expect(result.state).toBeUndefined();
  });
});
