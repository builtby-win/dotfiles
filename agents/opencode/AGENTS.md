# Agent Instructions

<!-- This file is symlinked from builtby.win/dotfiles -->
<!-- Edit the source at: dotfiles/agents/opencode/AGENTS.md -->

## Issue Tracking

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Session Completion

**When ending a work session**, complete ALL steps. Work is NOT complete until `git push` succeeds.

1. File issues for remaining work
2. Run quality gates (if code changed)
3. Update issue status
4. **PUSH TO REMOTE**:
   ```bash
   git pull --rebase && bd sync && git push
   git status  # MUST show "up to date with origin"
   ```
5. Clean up stashes, verify all pushed

**Critical**: NEVER stop before pushing. YOU must push, not the user.

## Development Workflow

- Don't run typecheck or lint automatically unless asked
- Prefer simple, focused solutions over complex ones
- Ask clarifying questions when requirements are ambiguous

## Code Style

- Follow existing patterns in the codebase
- Keep functions small and focused
- Prefer composition over inheritance

## Communication

- Be concise in responses
- Show code changes clearly
- Explain reasoning for non-obvious choices
