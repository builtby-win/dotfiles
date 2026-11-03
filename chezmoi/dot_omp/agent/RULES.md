# Style
- Terse. Lead with the answer + tradeoffs. No recap, no preamble, no narration between tool calls, no restating the request.
- Final reply: outcome, evidence, blockers. A few lines unless detail is asked for.

# Orchestration
- Primary session owns intent, decomposition, architecture, integration, final verification.
- Delegate broad exploration to `scout`, mechanical work to `sonic`, implementation slices to `task` (or a specialist). Small known-location fixes: do inline.
- Batch all independent slices in one `task` call; sequence only true dependencies.
- Subagent prompts: exact files, required behavior, constraints, acceptance criteria; skip formatters/linters/builds/tests. Don't hard-code model names.
- Verify once per phase in the primary session; on failure dispatch a focused fix. Not done until the changed behavior has been exercised.

<!-- gitbutler-agent-setup:start -->
## Version control

- Use GitButler (`but`) for version-control inspection and write operations, including status, diffs, branching, committing, pushing, and history edits.
- Assume multiple agents may be working in this repository. Do not move, amend, squash, discard, commit, push, or otherwise modify another agent's work unless the user asks.
- For commit just/only/specific changes on a new branch (selected-change requests), use the two-command fast path from the GitButler skill: `but diff`, then `but commit -b <branch> -m "message" <id> <id>`.
- For that fast path, after the commit succeeds, stop and summarize; do not run separate branch, staging, status, or diff commands unless the commit output is missing information you need.
- Use the installed GitButler skill for command recipes and syntax before guessing flags, using `--help`, or translating Git habits directly.
- Mutation commands report their result without appending workspace status. Add `--status-after` only when the next step needs resulting workspace IDs or details; otherwise do not rerun status or diff to verify success.
- Use a dedicated GitButler branch for each agent session, unless the user asks for a different branch structure. Commit only changes that belong to that session.
- Do not push or open pull requests unless the user asks.
- Keep commit messages and pull request descriptions succinct: explain what changed, why it changed, and any important decision.

### Amend local fixes into the right commits

- For small cleanup or follow-up fixes, amend an unpublished local commit when the change clearly belongs with that commit's intent.
- Do not create tiny fixup commits unless the user asks.
- Use GitButler to move the relevant changes into the commit where they belong.
- Ask before rewriting pushed, reviewed, shared, or ambiguous history.

### Split unrelated changes into separate commits

- If one file contains unrelated changes, split them by hunk instead of committing the whole file.
- Keep tests with the behavior they verify.
- Split generated output, docs-only edits, or mechanical cleanup into separate commits when each commit remains coherent on its own.
- If the split is ambiguous, summarize the options before committing.

### Create stacked pull requests

- If this session depends on another in-flight branch, stack its branch on top of that dependency instead of mixing the changes.
- If this session is working in a stack, put commits on the branch where they belong.
- Ask before moving commits onto lower, pushed, reviewed, or shared branches.
- Use `but move` for branch stacking and restacking. Do not recreate branches to simulate stacking.
- For stacked branches, create pull requests with `but pr`, not `gh`, so GitButler keeps the right PR base branches and stack metadata.

### Update from the target branch automatically

- When GitButler status shows new changes on the target branch and the workspace holds only this session's branches, update with `but pull` directly — its output reports the result and `but undo` reverts it.
- If an update you started on your own initiative reports conflicted commits, stop and ask before resolving them (`but undo` reverts the pull if the user prefers).
- When other agents' branches are applied, run `but pull --check` first and ask before updating if it reports conflicts or their branches would move.
- If the user asks you to handle update conflicts, use GitButler's conflict tools. Ask before resolving semantic conflicts, dependency updates, generated files, or conflicts involving another person's work.

### Publish on a shortcut phrase

- When the user says `ship it`, commit this session's changes on its dedicated GitButler branch, creating one if needed.
- Push the branch and open or update its pull request with GitButler.
- Reuse the existing branch or pull request for this session when one already exists.
- Treat this phrase as approval to commit, push, and open or update a pull request without asking again, unless something risky or surprising changed.

### Branch naming

- When creating a GitButler branch for an agent session, use `<name>/<short-description>`.

### Commit message convention

- Follow the `type(scope): summary` commit-message convention when writing commit messages.

### Commit checkpoints after each turn

- Commit after a working checkpoint, when the requested change is complete and relevant checks have passed or been reported.
- Treat checkpoint commits as local savepoints, not final review history.
- When the user asks you to tidy the history, use GitButler to squash commits, reword commits, and move changes between commits where appropriate.
- Only tidy unpublished local history unless the user explicitly authorizes changing pushed or shared history.
<!-- gitbutler-agent-setup:end -->

# GitButler: commit every turn (local override, outside generated block)
- Whenever a turn leaves file changes made by this session, you MUST end the turn by committing them with `but` (`but diff`, then `but commit -b <name>/<short-description> -m "type(scope): summary" <ids>`). Applies to trivial edits too; this overrides "when checks passed" wording above and any "NEVER run git subcommands" guidance (use `but`, not `git`).
- Reuse this session's branch for later turns (`but commit -b <existing-branch> ...`). Commit only IDs this session changed. Never push or open PRs unless asked.

# Big or long tasks: isolate in a GitButler worktree (local override, outside generated block)
Reason: edits in the main checkout trigger hot reload/rebuilds. Procedure lives in the `but-worktree` skill (`skill://but-worktree`).
- Big task at start (multi-file refactor/feature, subagent fan-out, likely >10 min): read the skill first and ask the user whether to work in an isolated worktree.
- Any task you implement directly in the main checkout (including ones that looked small): before the first edit, pick a `<task-slug>` and run `F="${TMPDIR:-/tmp}/but-task-start-$(echo "$PWD" | shasum | cut -c1-8)-<task-slug>"; [ -e "$F" ] || date +%s > "$F"`. Before each later batch of edits or subagent dispatch, if `$(( $(date +%s) - $(cat "$F") ))` > 600 and work remains, read the skill and auto-migrate to a worktree without asking. Delete `$F` when the task ends (or after applying a worktree branch).
