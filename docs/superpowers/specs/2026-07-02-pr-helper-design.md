# PR helper design

## Goal
Add a tiny `pr()` shell function for the current worktree / current branch.

## Behavior
- Operates on the current git worktree only.
- Uses the current branch name from `git`.
- Fails fast if the shell is not inside a git repo or if HEAD is detached.
- Pushes the current branch to `origin` on every invocation.
- After the push, if an open PR already exists for that branch, it leaves the PR alone and prints its URL.
- If no open PR exists, it creates one with `gh pr create --fill` against the repo’s default branch.

## Implementation
- Add the function to `shell/functions.sh`, where the other shell helpers live.
- Keep the function self-contained; no new script file, no extra wrapper command, no new flags.
- Use `command git` / `command gh` so shell aliases do not interfere.
- Keep the logic branch-local: no branch switching, no worktree discovery, no cross-branch syncing.

## Suggested command flow
1. Determine the current branch.
2. Push the branch to `origin`.
3. Resolve the open PR for that branch via `gh pr list --head "$branch" --state open`.
4. If a PR exists, print the URL.
5. Otherwise create the PR with `gh pr create --fill`.

## Error handling
- Detached HEAD: print a short error and return non-zero.
- Missing `gh`: print a short error and return non-zero.
- Push failure: stop immediately; do not try to create a PR.
- PR creation failure: surface the `gh` error directly.

## Verification
- Parse-check the shell file after the edit.
- Source the shell helpers in a clean shell and confirm `pr` is defined.
- Smoke-test the branch detection and PR lookup path with a non-destructive dry run or a mocked shell command if the live repo is not suitable.
