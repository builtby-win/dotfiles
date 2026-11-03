// Delegates a prompt to the official Google Antigravity CLI (`agy -p`), which runs its own
// agent loop (shell, file edits, browser, MCP) on the Antigravity quota.
// Shell-out to the official binary only: no direct use of Antigravity credentials/endpoints from omp.
// @ts-nocheck

import { spawn } from "node:child_process";

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export default function (pi) {
  const z = pi.zod;

  pi.registerTool({
    name: "agy_exec",
    label: "Agy Exec",
    description:
      "Run a task through the official Antigravity CLI (`agy`). agy runs its own agent loop in the given cwd and can run shell commands, read/edit files, and use its MCP/plugins/hooks. Returns its final answer plus a conversation_id you can pass back to continue the same session. Models: gemini-3.8-flash (default), gemini-4-argon, claude-sonnet-5-5, claude-opus-5-5.",
    parameters: z.object({
      prompt: z.string().describe("Task for agy. Be self-contained; agy has no access to this conversation."),
      model: z.string().optional().describe("agy model id without effort suffix. Default gemini-3.8-flash."),
      effort: z.enum(EFFORTS).optional().describe("Reasoning effort. Default medium."),
      cwd: z.string().optional().describe("Working directory for agy. Defaults to the session cwd."),
      conversation: z.string().optional().describe("conversation_id from a previous agy_exec call to continue it."),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const model = params.model ?? "gemini-3.8-flash";
      const args = ["--output-format", "stream-json", "--model", model, "--effort", params.effort ?? "medium"];
      if (params.conversation) args.push("--conversation", params.conversation);
      args.push(`--print=${params.prompt}`);

      const progress = [];
      const push = (text) => onUpdate?.({ content: [{ type: "text", text }], details: { model, status: "running" } });

      const outcome = await new Promise((resolve) => {
        const child = spawn("agy", args, { cwd: params.cwd ?? ctx?.cwd ?? process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
        let buf = "";
        let stderr = "";
        let streamed = "";
        let result;
        let conversationId = params.conversation;
        const onAbort = () => child.kill("SIGTERM");
        signal?.addEventListener("abort", onAbort, { once: true });

        const handle = (line) => {
          let ev;
          try {
            ev = JSON.parse(line);
          } catch {
            return;
          }
          if (ev.event === "init") conversationId = ev.conversation_id ?? conversationId;
          if (ev.event === "step_update") {
            const s = ev.step_update;
            if (s.text_delta) {
              streamed += s.text_delta;
              push(streamed);
            } else if (s.step_type === "tool" && s.state === "ACTIVE") {
              const p = s.tool_info?.parameters;
              progress.push(`${s.tool_name}${p ? " " + JSON.stringify(p).slice(0, 160) : ""}`);
              push(progress.join("\n"));
            }
          }
          if (ev.event === "result") result = ev.result;
        };

        child.stdout.on("data", (chunk) => {
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const l of lines) if (l.trim()) handle(l);
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("error", (err) => resolve({ error: err.message }));
        child.on("close", (code) => {
          signal?.removeEventListener("abort", onAbort);
          if (buf.trim()) handle(buf);
          resolve({ code, result, stderr, streamed, conversationId });
        });
      });

      if (outcome.error) {
        return { content: [{ type: "text", text: `agy failed to start: ${outcome.error}` }], details: { model, status: "error" }, isError: true };
      }
      const { result, streamed, stderr, code, conversationId } = outcome;
      const failed = !result || result.status !== "SUCCESS";
      const text = result?.response || streamed || (failed ? `agy exited ${code}: ${result?.error || stderr.trim() || "no output"}` : "");
      const trace = progress.length ? `\n\n[agy tool calls]\n${progress.join("\n")}` : "";
      return {
        content: [{ type: "text", text: `${text}${trace}\n\n[conversation_id: ${conversationId ?? "unknown"}]` }],
        details: { model, status: failed ? "error" : "complete", conversationId, usage: result?.usage },
        isError: failed,
      };
    },
  });
}
