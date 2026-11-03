// Orchestrate real harness TUIs (claude, agy, muse, codex, omp, gemini) as child agents.
// Every child runs the vendor's own unmodified binary in a herdr pane, under the user's own login.
// This file only shells out to `herdr` and `agent-hooks`; it never touches harness credentials.
// @ts-nocheck

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// agent-hooks harness id -> herdr agent kind
const KINDS = {
  "claude-code": "claude",
  antigravity: "agy",
  muse: "muse",
  codex: "codex",
  omp: "omp",
  "gemini-cli": "gemini",
};
const HARNESSES = Object.keys(KINDS);
const SETTLED = ["idle", "done", "blocked"];
const MAX_CHILDREN = 8;
const PROMPT_SENTINEL = "__CHILD_PROMPT__";
const REGISTRY = path.join(homedir(), ".omp/agent/herdr-children.json");
const COMMIT_SUFFIX =
  "\n\nWhen finished, commit all of your work on the current branch with a clear message. Do not push.";

const loadRegistry = () => (existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, "utf8")) : {});
const saveRegistry = (reg) => {
  mkdirSync(path.dirname(REGISTRY), { recursive: true });
  writeFileSync(REGISTRY, JSON.stringify(reg, null, 2));
};

const run = (cmd, args, { cwd, signal } = {}) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, signal, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", (err) => resolve({ code: null, stdout, stderr: err.message, aborted: err.name === "AbortError" }));
    child.on("close", (code) => resolve({ code, stdout, stderr, aborted: false }));
  });

// herdr prints {"id","result"} on success and {"id","error"} (non-zero exit) on failure.
const herdr = async (args, opts) => {
  const out = await run("herdr", args, opts);
  if (out.aborted) throw new Error("aborted");
  let body;
  try {
    body = JSON.parse(out.stdout);
  } catch {
    if (out.code === 0) return { raw: out.stdout };
    throw new Error(`herdr ${args.slice(0, 2).join(" ")}: ${out.stderr || out.stdout}`.trim());
  }
  if (body.error || out.code !== 0) {
    throw new Error(`herdr ${args.slice(0, 2).join(" ")}: ${JSON.stringify(body.error ?? body)}`);
  }
  return body.result;
};

const getAgent = async (name, opts) => (await herdr(["agent", "get", name], opts)).agent;
const readTail = async (name, lines = 30) => (await herdr(["agent", "read", name, "--lines", String(lines)])).raw ?? "";
const text = (t, details) => ({ content: [{ type: "text", text: t }], details });

// `agent prompt` returns on submission; wait until the agent is observed working/blocked so a later
// `agent wait` cannot match the stale pre-turn idle state.
const submit = async (name, prompt) => {
  await herdr(["agent", "prompt", name, prompt]);
  for (let i = 0; i < 20; i++) {
    const { agent_status } = await getAgent(name);
    if (agent_status === "working" || agent_status === "blocked" || agent_status === "done") return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

// agent-hooks owns each harness's yolo flags. Resolve its argv with a sentinel prompt, then strip the
// prompt (and a preceding `--prompt*` flag) so the prompt can be sent through herdr once the TUI is ready.
const nativeArgs = async (harness, model) => {
  const args = ["start", "--harness", harness, "--yolo", "--dry-run"];
  if (model) args.push("--model", model);
  args.push(PROMPT_SENTINEL);
  const out = await run("agent-hooks", args);
  if (out.code !== 0) throw new Error(`agent-hooks start --dry-run failed: ${out.stderr || out.stdout}`);
  const argv = JSON.parse(out.stdout).slice(1);
  const at = argv.indexOf(PROMPT_SENTINEL);
  const dropFrom = at > 0 && argv[at - 1].startsWith("--prompt") ? at - 1 : at;
  return argv.slice(0, dropFrom).concat(argv.slice(at + 1));
};

const entryFor = (reg, name) => {
  const entry = reg[name];
  if (!entry) throw new Error(`unknown child '${name}'. Known: ${Object.keys(reg).join(", ") || "none"}`);
  return entry;
};

export default function (pi) {
  const z = pi.zod;

  pi.registerTool({
    name: "child_spawn",
    label: "Child Spawn",
    description:
      "Start a real harness TUI (claude-code, antigravity, muse, codex, omp, gemini-cli) as a yolo child in its own git worktree + herdr workspace, send it the prompt, and return immediately. Children cannot spawn children. Instruct the child with a self-contained prompt; it is told to commit its work. Follow with child_wait.",
    parameters: z.object({
      harness: z.enum(HARNESSES),
      prompt: z.string().describe("Self-contained task; the child has no access to this conversation."),
      name: z.string().optional().describe("Short unique child name. Default: <harness>-<random>."),
      model: z.string().optional().describe("Model id the harness reports (agent-hooks models)."),
      base: z.string().optional().describe("Base ref for the child branch. Default: current HEAD."),
      cwd: z.string().optional().describe("Repo to branch from. Default: session cwd."),
    }),
    async execute(_id, params, signal, _onUpdate, ctx) {
      const repo = params.cwd ?? ctx?.cwd ?? process.cwd();
      const reg = loadRegistry();
      if (Object.values(reg).some((c) => repo === c.path || repo.startsWith(`${c.path}/`))) {
        throw new Error("children cannot spawn children");
      }
      const live = Object.values(reg).filter((c) => c.repo === repo);
      if (live.length >= MAX_CHILDREN) throw new Error(`child cap reached (${MAX_CHILDREN}); close some first`);

      const name = params.name ?? `${params.harness}-${Math.random().toString(36).slice(2, 6)}`;
      if (reg[name]) throw new Error(`child '${name}' already exists`);
      const branch = `child/${name}`;

      const wt = ["worktree", "create", "--cwd", repo, "--branch", branch, "--label", name, "--no-focus", "--trust-repository"];
      if (params.base) wt.push("--base", params.base);
      const created = await herdr(wt, { signal });
      const pane = created.root_pane.pane_id;
      const workspace = created.workspace.workspace_id;
      const checkout = created.workspace.worktree.checkout_path;

      try {
        const extra = await nativeArgs(params.harness, params.model);
        await herdr(
          ["agent", "start", name, "--kind", KINDS[params.harness], "--pane", pane, "--timeout", "90000", "--", ...extra],
          { signal },
        );
        reg[name] = { harness: params.harness, repo, branch, path: checkout, workspace, pane, createdAt: Date.now() };
        saveRegistry(reg);
        const armed = await submit(name, params.prompt + COMMIT_SUFFIX);
        return text(
          `Spawned ${name} (${params.harness}) on branch ${branch} at ${checkout}.${armed ? "" : " Warning: prompt submitted but the child was not observed working."}`,
          { name, branch, path: checkout, workspace, pane, armed },
        );
      } catch (err) {
        await herdr(["worktree", "remove", "--workspace", workspace, "--force", "--trust-repository"]).catch(() => {});
        delete reg[name];
        saveRegistry(reg);
        throw err;
      }
    },
  });

  pi.registerTool({
    name: "child_wait",
    label: "Child Wait",
    description:
      "Block until child agents settle (idle/done/blocked). any=true (default) returns when the first settles; any=false waits for all. Streams live status. Aborting cancels only the wait, never the children. A 'blocked' child needs child_answer or child_send.",
    parameters: z.object({
      names: z.array(z.string()).min(1),
      any: z.boolean().optional(),
      timeout_ms: z.number().optional().describe("Default 600000."),
    }),
    async execute(_id, params, signal, onUpdate) {
      const reg = loadRegistry();
      for (const n of params.names) entryFor(reg, n);
      const stop = new AbortController();
      const relay = () => stop.abort();
      signal?.addEventListener("abort", relay, { once: true });
      const timeout = String(params.timeout_ms ?? 600000);

      const poll = setInterval(async () => {
        const rows = await Promise.all(
          params.names.map((n) => getAgent(n).then((a) => `${n}: ${a.agent_status}`, () => `${n}: gone`)),
        );
        onUpdate?.(text(rows.join("\n"), { phase: "waiting" }));
      }, 5000);

      const waits = params.names.map((n) =>
        herdr(["agent", "wait", n, "--timeout", timeout], { signal: stop.signal }).then(
          () => n,
          () => n,
        ),
      );
      try {
        await (params.any === false ? Promise.all(waits) : Promise.race(waits));
      } finally {
        clearInterval(poll);
        signal?.removeEventListener("abort", relay);
        stop.abort();
      }
      if (signal?.aborted) throw new Error("wait cancelled; children keep running");

      const children = await Promise.all(
        params.names.map(async (n) => {
          const status = await getAgent(n).then((a) => a.agent_status, () => "gone");
          const tail = SETTLED.includes(status) ? await readTail(n, 20).catch(() => "") : "";
          return { name: n, status, tail };
        }),
      );
      const out = children.map((c) => `## ${c.name}: ${c.status}${c.tail ? `\n${c.tail.trimEnd()}` : ""}`).join("\n\n");
      return text(out, { children: children.map(({ name, status }) => ({ name, status })) });
    },
  });

  pi.registerTool({
    name: "child_read",
    label: "Child Read",
    description: "Read the last N terminal lines of a child agent (bounded; default 40).",
    parameters: z.object({ name: z.string(), lines: z.number().optional() }),
    async execute(_id, params) {
      entryFor(loadRegistry(), params.name);
      return text(await readTail(params.name, params.lines ?? 40));
    },
  });

  pi.registerTool({
    name: "child_send",
    label: "Child Send",
    description: "Send a follow-up prompt to a child. Rejected by herdr if the child is blocked on a prompt; use child_answer first.",
    parameters: z.object({ name: z.string(), text: z.string() }),
    async execute(_id, params) {
      entryFor(loadRegistry(), params.name);
      const armed = await submit(params.name, params.text);
      return text(armed ? `Sent to ${params.name}.` : `Sent to ${params.name}, but it was not observed working.`, { armed });
    },
  });

  pi.registerTool({
    name: "child_answer",
    label: "Child Answer",
    description:
      "Resolve a pending permission/question prompt of a child via `agent-hooks answer --auto`. verdict: allow | deny[:reason] | ask[:question] | answer:<option-or-text>. session_id selects the prompt when several are pending.",
    parameters: z.object({ verdict: z.string(), session_id: z.string().optional() }),
    async execute(_id, params, signal) {
      const args = ["answer", "--auto", params.verdict];
      if (params.session_id) args.push(params.session_id);
      const out = await run("agent-hooks", args, { signal });
      if (out.code !== 0) throw new Error(`agent-hooks answer failed: ${out.stderr || out.stdout}`);
      return text(out.stdout.trim() || "answered");
    },
  });

  pi.registerTool({
    name: "child_list",
    label: "Child List",
    description: "List known children with live herdr status, branch, and worktree path.",
    parameters: z.object({}),
    async execute() {
      const reg = loadRegistry();
      const rows = await Promise.all(
        Object.entries(reg).map(async ([name, c]) => {
          const status = await getAgent(name).then((a) => a.agent_status, () => "gone");
          return { name, status, harness: c.harness, branch: c.branch, path: c.path };
        }),
      );
      return text(rows.map((r) => `${r.name}\t${r.status}\t${r.harness}\t${r.branch}`).join("\n") || "no children", { children: rows });
    },
  });

  pi.registerTool({
    name: "child_merge",
    label: "Child Merge",
    description:
      "Merge a finished child's branch into its source repo with `git merge --no-ff`. Refuses if the child has uncommitted changes. On conflict the merge is aborted and the conflicting files are returned for you or the user to resolve.",
    parameters: z.object({ name: z.string() }),
    async execute(_id, params, signal) {
      const c = entryFor(loadRegistry(), params.name);
      const dirty = await run("git", ["-C", c.path, "status", "--porcelain"], { signal });
      if (dirty.stdout.trim()) {
        return text(`${params.name} has uncommitted changes; ask it to commit (child_send) before merging:\n${dirty.stdout}`, { merged: false, reason: "dirty" });
      }
      const inProgress = () => run("git", ["-C", c.repo, "rev-parse", "-q", "--verify", "MERGE_HEAD"], { signal });
      if ((await inProgress()).code === 0) {
        return text(`${c.repo} already has a merge in progress; finish or abort it before merging ${c.branch}.`, { merged: false, reason: "merge-in-progress" });
      }
      const merge = await run("git", ["-C", c.repo, "merge", "--no-ff", "--no-edit", c.branch], { signal });
      if (merge.code === 0) return text(`Merged ${c.branch} into ${c.repo}.\n${merge.stdout}`, { merged: true });
      const conflicts = await run("git", ["-C", c.repo, "diff", "--name-only", "--diff-filter=U"]);
      // Only abort a merge this call started; MERGE_HEAD was absent at preflight.
      if ((await inProgress()).code === 0) await run("git", ["-C", c.repo, "merge", "--abort"]);
      const files = conflicts.stdout.split("\n").filter(Boolean);
      return text(
        files.length
          ? `Merge conflict; aborted. Conflicting files:\n${files.join("\n")}`
          : `Merge failed; aborted.\n${merge.stderr || merge.stdout}`,
        { merged: false, reason: files.length ? "conflict" : "error", files },
      );
    },
  });

  pi.registerTool({
    name: "child_close",
    label: "Child Close",
    description:
      "Stop a child: close its herdr workspace, remove its worktree, and forget it. Committed work stays on the branch. Refuses if the worktree has uncommitted or untracked changes unless discard_uncommitted=true.",
    parameters: z.object({
      name: z.string(),
      discard_uncommitted: z.boolean().optional().describe("Destructive: delete uncommitted and untracked files in the child worktree."),
    }),
    async execute(_id, params, signal) {
      const reg = loadRegistry();
      const c = entryFor(reg, params.name);
      if (!params.discard_uncommitted) {
        const dirty = await run("git", ["-C", c.path, "status", "--porcelain"], { signal });
        if (dirty.stdout.trim()) {
          return text(
            `${params.name} has uncommitted/untracked changes that closing would delete. Ask it to commit (child_send), or pass discard_uncommitted=true:\n${dirty.stdout}`,
            { closed: false, reason: "dirty" },
          );
        }
      }
      await herdr(["worktree", "remove", "--workspace", c.workspace, "--force", "--trust-repository"]);
      delete reg[params.name];
      saveRegistry(reg);
      return text(`Closed ${params.name}; branch ${c.branch} kept in ${c.repo}.`, { closed: true });
    },
  });
}
