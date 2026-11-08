#!/usr/bin/env bun
// but-tidy: read-only-by-default triage of a GitButler repo with hundreds of agent branches.
//
//   but-tidy plan  [--repo DIR] [--target origin/main]   classify branches, group unlanded commits by theme
//   but-tidy clean [--repo DIR] [--target ...]           list landed branches (no deletion; `but` can't delete unapplied refs)
//   but-tidy group THEME [THEME...] [--repo DIR] --yes   copy a theme's commits onto work/<theme> (sources untouched)
//
// Safety: plan never mutates. clean lists branches where every commit has a patch-equivalent on the
// target (squash/rebase-merged included), no merge commits, and no worktree checkout. group uses `but pick`
// (copies), so per-agent branches stay intact; `but undo` reverts it.
import { $ } from "bun";

const args = Bun.argv.slice(2);
const cmd = args[0];
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const repo = flag("--repo") ?? process.cwd();
const yes = args.includes("--yes");
const git = async (...a: string[]) => (await $`git -C ${repo} ${a}`.quiet().text()).trim();
const lines = (s: string) => (s ? s.split("\n") : []);

const target =
  flag("--target") ??
  (await git("symbolic-ref", "--short", "refs/remotes/origin/HEAD").catch(() => "origin/main"));

interface Branch {
  name: string;
  worktree: string;
  commits: { sha: string; subject: string; theme: string; patch: string }[];
  /** Safe to delete: ancestor of target, or every commit patch-equivalent on target and no merge commits. */
  landed: boolean;
  /** Has merge commits ahead of target (resolution changes unseen by `git cherry`): never auto-deleted or grouped. */
  review: boolean;
}

// Conventional-commit scope wins; otherwise first word of the branch slug (agent prefixes stripped).
function themeOf(subject: string, branch: string): string {
  const scope = subject.match(/^\w+\(([^)]+)\)!?:/)?.[1];
  const slug = branch.replace(/^(winston|snoolord|codex|claude|worktree|backup|vlx|fix|feat|wip|docs)\//, "");
  return (scope ?? slug.split(/[-_/]/)[0] ?? "misc").split(/[,/ ]/)[0].toLowerCase();
}

async function load(): Promise<Branch[]> {
  const refs = lines(
    await git("for-each-ref", "refs/heads", "--format=%(refname:short)|%(worktreepath)"),
  ).map((l) => l.split("|") as [string, string]);
  const out: Branch[] = [];
  for (const [name, worktree] of refs) {
    if (name === "main" || target.endsWith(`/${name}`) || name.startsWith("gitbutler/")) continue;
    // `git cherry` marks commits already patch-equivalent on target with '-'.
    const cherry = lines(await git("cherry", target, name));
    const commits = [];
    for (const l of cherry.filter((c) => c.startsWith("+ "))) {
      const sha = l.slice(2);
      const subject = await git("show", "-s", "--format=%s", sha);
      const patch = (await $`git -C ${repo} show ${sha} | git patch-id --stable`.quiet().text()).split(" ")[0];
      commits.push({ sha, subject, theme: themeOf(subject, name), patch });
    }
    const isAncestor = (await $`git -C ${repo} merge-base --is-ancestor ${name} ${target}`.quiet().nothrow()).exitCode === 0;
    const hasMerges = (await git("rev-list", "--merges", "--count", `${target}..${name}`)) !== "0";
    const equivalent = commits.length === 0;
    out.push({
      name,
      worktree,
      commits,
      landed: isAncestor || (equivalent && !hasMerges),
      review: !isAncestor && hasMerges,
    });
  }
  return out;
}

function themes(branches: Branch[]) {
  const by = new Map<string, Map<string, { sha: string; subject: string; branches: Set<string> }>>();
  for (const b of branches.filter((x) => !x.landed && !x.review)) {
    for (const c of b.commits) {
      const t = by.get(c.theme) ?? new Map();
      by.set(c.theme, t);
      // Identical patch on several branches = stacked copies; keep one, remember all sources.
      const e = t.get(c.patch) ?? { sha: c.sha, subject: c.subject, branches: new Set<string>() };
      e.branches.add(b.name);
      t.set(c.patch, e);
    }
  }
  return by;
}

if (cmd === "plan") {
  const branches = await load();
  const landed = branches.filter((b) => b.landed);
  const review = branches.filter((b) => b.review);
  const open = branches.filter((b) => !b.landed && !b.review);
  console.log(`target ${target}: ${branches.length} local branches, ${landed.length} landed, ${review.length} need manual review (merge commits), ${open.length} with unlanded work\n`);
  if (review.length) console.log(`Review by hand (never auto-deleted): ${review.map((b) => b.name).join(", ")}\n`);
  console.log(`Deletable now (landed, no worktree): ${landed.filter((b) => !b.worktree).length}`);
  console.log(`Landed but checked out in a worktree (remove worktree first): ${landed.filter((b) => b.worktree).length}\n`);
  console.log("| theme | unique commits | branches |\n|---|---|---|");
  for (const [t, m] of [...themes(branches)].sort((a, b) => b[1].size - a[1].size)) {
    const src = new Set([...m.values()].flatMap((e) => [...e.branches]));
    console.log(`| ${t} | ${m.size} | ${src.size} |`);
  }
  console.log("\nnext: but-tidy group <theme> --yes   |   but-tidy clean --yes");
} else if (cmd === "clean") {
  // List only: `but branch delete`/`but discard` reject unapplied branches, and applying them fails while the
  // checkout is dirty. Delete the ref by hand (or via GitHub/UI) after reviewing the list.
  const doomed = (await load()).filter((b) => b.landed && !b.worktree).map((b) => b.name);
  console.log(`${doomed.length} landed branches (ancestor of ${target}, or patch-equivalent with no merge commits):\n${doomed.join("\n")}`);
} else if (cmd === "group") {
  const wanted = args.slice(1).filter((a) => !a.startsWith("--") && a !== repo && a !== target);
  const by = themes(await load());
  for (const t of wanted) {
    const entries = [...(by.get(t)?.values() ?? [])];
    if (!entries.length) {
      console.log(`${t}: no unlanded commits`);
      continue;
    }
    // Oldest first so dependent commits apply in order.
    const shas = (
      await git("rev-list", "--no-walk", "--date-order", "--reverse", ...entries.map((e) => e.sha))
    ).split("\n");
    console.log(`${t}: ${shas.length} commits -> work/${t}`);
    entries.forEach((e) => console.log(`  ${e.sha.slice(0, 9)} ${e.subject}  [${[...e.branches].join(", ")}]`));
    if (yes) await $`but -C ${repo} pick ${shas} -b work/${t}`;
  }
  if (!yes) console.log("\ndry run; pass --yes to pick");
} else {
  console.log("usage: but-tidy plan|clean|group THEME... [--repo DIR] [--target REF] [--yes (group only)]");
  process.exit(1);
}
