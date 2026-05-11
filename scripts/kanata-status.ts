#!/usr/bin/env npx tsx
/**
 * kanata-status — TUI dashboard for the kanata key remapper.
 *
 * Shows daemon health, config paths, versions, uptime, and recent log lines.
 *
 * Usage:
 *   tsx scripts/kanata-status.ts
 *   # or via alias: ks
 *
 * Inspired by btm / btop — one screen, all the kanata facts.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { connect } from "node:net";
import { homedir, hostname } from "node:os";
import { join } from "node:path";

/* ─── ANSI helpers ─────────────────────────────────────────────── */

const B = "\x1b[1m";
const D = "\x1b[2m";
const I = "\x1b[3m";
const R = "\x1b[0m";

const GRN = "\x1b[32m";
const YEL = "\x1b[33m";
const RED = "\x1b[31m";
const CYN = "\x1b[36m";
const WHT = "\x1b[97m";
const BLU = "\x1b[34m";

function ok(tag: string): string  { return `${GRN}●${R} ${tag}`; }
function warn(tag: string): string { return `${YEL}●${R} ${tag}`; }
function fail(tag: string): string { return `${RED}○${R} ${tag}`; }
function label(k: string, v: string): string {
  return `  ${D}${k}:${R} ${v}`;
}

/* ─── System helpers ───────────────────────────────────────────── */

function read(path: string): string | null {
  try { return readFileSync(path, "utf-8"); } catch { return null; }
}

function run(cmd: string, trim = true): string | null {
  try {
    const out = execSync(cmd, { encoding: "utf-8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
    return trim ? out.trim() : out;
  } catch { return null; }
}

function tcpHello(port: number): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const sock = connect(port, "127.0.0.1", () => {
      sock.write(JSON.stringify({ Hello: {} }) + "\n");
    });
    let data = "";
    sock.setTimeout(3000);
    sock.on("data", (chunk: Buffer) => {
      data += chunk.toString();
      // Kanata sends a LayerChange event first, then the HelloOk.
      if (data.includes("HelloOk")) {
        sock.end();
        try {
          for (const line of data.trim().split("\n")) {
            const parsed = JSON.parse(line);
            if (parsed.HelloOk) { resolve(parsed.HelloOk); return; }
          }
        } catch { /* partial parse, wait for more */ }
      }
    });
    sock.on("close", () => {
      // If we never got HelloOk, resolve null
      resolve(null);
    });
    sock.on("error", () => resolve(null));
    sock.on("timeout", () => { sock.destroy(); });
  });
}

function tcpReload(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect(port, "127.0.0.1", () => {
      sock.write(JSON.stringify({ Reload: {} }) + "\n");
    });
    let data = "";
    sock.on("data", (chunk: Buffer) => {
      data += chunk.toString();
      if (data.includes('"Ok"') || data.includes("ConfigFileReload")) {
        sock.end();
        resolve(true);
      }
    });
    // Safety timeout in case server doesn't respond
    setTimeout(() => { sock.destroy(); resolve(false); }, 4000);
    sock.on("close", () => resolve(data.includes("ConfigFileReload")));
    sock.on("error", () => resolve(false));
  });
}

/* ─── Data collection ─────────────────────────────────────────── */

interface DaemonInfo {
  name: string;
  label: string;
  pid: number | null;
  state: string;
  port: number;
  uptime: string | null;
  started: string | null;
  version: string | null;
  logPath: string;
  configPath: string;
  configLines: number | null;
}

interface VkAgentInfo {
  name: string;
  pid: number | null;
  uptime: string | null;
}

interface KanataStatus {
  binVersion: string | null;
  daemons: DaemonInfo[];
  vkAgents: VkAgentInfo[];
  errorLogTail: Record<string, string>;
}

function parseDaemon(label: string): {
  pid: number | null; state: string; started: string | null; uptime: string | null;
} {
  const out = run(`launchctl print system/${label} 2>/dev/null`);
  let pid: number | null = null;
  let state = "stopped";
  let started: string | null = null;
  let uptime: string | null = null;

  if (out) {
    const pm = out.match(/pid\s*=\s*(\d+)/);
    if (pm) pid = parseInt(pm[1]);
    const sm = out.match(/state\s*=\s*(\S+)/);
    if (sm) state = sm[1];
  }

  if (pid) {
    const psOut = run(`ps -p ${pid} -o lstart=,etime= 2>/dev/null`);
    if (psOut) {
      const parts = psOut.trim().split(/\s+/, 6);
      if (parts.length >= 5) {
        started = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}`;
        uptime = parts.slice(5).join(" ").trim();
      }
    }
  }

  return { pid, state, started, uptime };
}

function parseVkAgent(label: string): VkAgentInfo {
  const out = run(`launchctl print gui/$(id -u)/${label} 2>/dev/null`);
  let pid: number | null = null;
  let uptime: string | null = null;

  if (out) {
    const pm = out.match(/pid\s*=\s*(\d+)/);
    if (pm) pid = parseInt(pm[1]);
  }

  if (pid) {
    const psOut = run(`ps -p ${pid} -o etime= 2>/dev/null`);
    if (psOut) uptime = psOut.trim();
  }

  return { name: label, pid, uptime };
}

function tailLog(path: string, n = 5): string {
  const content = read(path);
  if (!content) return "(no log file)";
  const lines = content.trim().split("\n").filter(Boolean);
  return lines.slice(-n).join("\n") || "(empty)";
}

async function collectStatus(): Promise<KanataStatus> {
  const binVersion = run("kanata --version 2>/dev/null");

  const HOME = homedir();
  const configs = [
    { name: "kanata", label: "com.builtbywin.kanata", port: 5829, configPath: join(HOME, ".config/kanata/kanata.kbd"), logPath: "/tmp/com.builtbywin.kanata.err.log" },
    { name: "kanata-sculpt", label: "com.builtbywin.kanata-sculpt", port: 5830, configPath: join(HOME, ".config/kanata/kanata-sculpt.kbd"), logPath: "/tmp/com.builtbywin.kanata-sculpt.err.log" },
  ];

  const daemons: DaemonInfo[] = await Promise.all(
    configs.map(async (cfg) => {
      const base = parseDaemon(cfg.label);
      const version = base.pid ? await tcpHello(cfg.port).then((h) => h?.version as string ?? null) : null;
      const cl = base.pid && existsSync(cfg.configPath) ? statSync(cfg.configPath).size : null;
      return {
        name: cfg.name,
        label: cfg.label,
        ...base,
        port: cfg.port,
        version,
        logPath: cfg.logPath,
        configPath: cfg.configPath,
        configLines: cl,
      };
    })
  );

  const vkLabels = ["local.kanata-vk-agent", "local.kanata-vk-agent-sculpt"];
  const vkAgents = vkLabels.map(parseVkAgent);

  const errorLogTail: Record<string, string> = {};
  for (const d of daemons) {
    errorLogTail[d.name] = tailLog(d.logPath, 5);
  }

  return { binVersion, daemons, vkAgents, errorLogTail };
}

/* ─── Display ──────────────────────────────────────────────────── */

function display(status: KanataStatus): void {
  const sep = "─".repeat(58);

  // Header
  console.log();
  console.log(`  ${B}${CYN}kanata status${R}  ${D}builtby.win/dotfiles${R}`);
  console.log(`  ${sep}`);

  // Binary version
  console.log(`  ${B}Binary${R}  ${D}kanata ${status.binVersion ?? "(not found)"}${R}`);

  // Daemon table
  console.log();
  console.log(`  ${B}Daemons${R}`);
  for (const d of status.daemons) {
    const stateIcon = d.state === "running" ? ok("running") : fail("stopped");
    const pidStr = d.pid ? `${d.pid}` : "—";
    const uptimeStr = d.uptime ?? "—";
    const verStr = d.version ? `${D}v${d.version}${R}` : D + "—" + R;
    const portStr = `${D}:${d.port}${R}`;
    const configOk = d.configLines ? ok("OK") : fail("missing");
    console.log(`    ${B}${d.name}${R}  ${stateIcon}  PID ${pidStr}  up ${uptimeStr}`);
    console.log(`    ${label("version", `${verStr}${R}  TCP port${portStr}`)}`);
    console.log(`    ${label("config", d.configPath)}  ${configOk}`);
    if (d.started) console.log(`    ${label("started", d.started)}`);
    console.log();
  }

  // vk-agent
  console.log(`  ${B}vk-agent${R}`);
  for (const v of status.vkAgents) {
    const icon = v.pid ? ok("running") : fail("stopped");
    const pidStr = v.pid ? `${v.pid}` : "—";
    const uptimeStr = v.uptime ?? "—";
    console.log(`    ${v.name}  ${icon}  PID ${pidStr}  up ${uptimeStr}`);
  }

  // Recent errors
  console.log();
  console.log(`  ${B}Recent stderr (last 5 lines)${R}`);
  for (const [name, log] of Object.entries(status.errorLogTail)) {
    const lines = log.split("\n").filter(Boolean);
    if (lines.length === 0 || log === "(no log file)") {
      console.log(`    ${D}${name}: (empty)${R}`);
    } else {
      const hasError = log.toLowerCase().includes("error") || log.toLowerCase().includes("fail");
      console.log(`    ${hasError ? YEL : D}${name}:${R}`);
      for (const line of lines) {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
        console.log(`      ${D}${stripped.length > 100 ? stripped.slice(0, 100) + "…" : stripped}${R}`);
      }
    }
  }

  // Footer tips
  console.log(`  ${sep}`);
  console.log(`  ${D}Reload config:  ${R}${CYN}echo '{"Reload":{}}' | nc localhost 5829${R}  ${D}(and${R} ${CYN}5830${R}${D})${R}`);
  console.log(`  ${D}Restart:       ${R}${CYN}kr${R}`);
  console.log();
}

/* ─── Entry point ─────────────────────────────────────────────── */

const args = process.argv.slice(2);

if (args[0] === "reload" || args[0] === "r") {
  console.log(`${B}Reloading kanata configs…${R}`);
  const ok1 = await tcpReload(5829);
  const ok2 = await tcpReload(5830);
  if (ok1) console.log(`  ${ok("kanata")}       reloaded`);
  else      console.log(`  ${fail("kanata")}       failed — daemon not running?`);
  if (ok2) console.log(`  ${ok("kanata-sculpt")} reloaded`);
  else      console.log(`  ${fail("kanata-sculpt")} failed — daemon not running?`);
  process.exit(0);
}

if (args[0] === "--help" || args[0] === "-h") {
  console.log(`Usage: kanata-status [command]

Commands:
  (none)    Show daemon status dashboard
  reload    Hot-reload config via TCP (no restart needed)
  r         Alias for reload
`);
  process.exit(0);
}

const status = await collectStatus();
display(status);
