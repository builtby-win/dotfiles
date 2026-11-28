# PR helper design

## Goal
Add a tiny `pr()` shell function for the current worktree / current branch that auto-commits dirty changes, pushes them, reuses an existing PR if one already exists, and otherwise opens a PR with an AI-generated title/body or a random fallback when AI is unavailable.

## Behavior
- Operates on the current git worktree only.
- Uses the current branch name from `git`.
- Fails fast if the shell is not inside a git repo or if HEAD is detached.
- If the worktree has changes, stage everything and create a `wip: <branch>` commit before pushing.
- Pushes the current branch to `origin` on every invocation.
- After the push, if an open PR already exists for that branch, it leaves the PR alone and prints its URL.
- If no open PR exists, it generates a PR title/body from the branch diff:
  - Try `pi` with the GPT-5.4 medium path and ask for strict JSON `{title, body}`.
  - Parse the JSON with `jq`.
  - If the AI runner is missing or the output is invalid, synthesize a short fallback title/body with a random suffix so the PR can still move.
- Creates the PR with explicit `gh pr create --title ... --body ...`.

## Implementation
- Add the function to `shell/functions.sh`, where the other shell helpers live.
- Keep the function self-contained; no new script file, no extra wrapper command, no new flags.
- Use `command git` / `command gh` / `command pi` / `jq` so shell aliases do not interfere.
- Keep the logic branch-local: no branch switching, no worktree discovery, no cross-branch syncing.

## Suggested command flow
1. Determine the current branch.
2. If the worktree is dirty, stage all changes and create a `wip: <branch>` commit.
3. Push the branch to `origin`.
4. Resolve the open PR for that branch via `gh pr list --head "$branch" --state open`.
5. If a PR exists, print the URL.
6. Otherwise build a title/body with AI or fallback text.
7. Create the PR with `gh pr create --title "$title" --body "$body"`.

## Error handling
- Detached HEAD: print a short error and return non-zero.
- Missing `gh`: print a short error and return non-zero.
- Nothing to commit after staging: print a short error and return non-zero.
- AI unavailable or unparsable: do not fail; fall back to a random title/body.

## Verification
- Parse-check the shell file after the edit.
- Source the shell helpers in a clean shell and confirm `pr` is defined.
- Smoke-test the AI path, fallback path, and existing-PR path with temporary command stubs.
