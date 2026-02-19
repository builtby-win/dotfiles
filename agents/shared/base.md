# Shared Agent Rules

These rules apply to ALL AI coding agents. Agent-specific configs should include this content.

---

## Session Completion (Landing the Plane)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

### Mandatory Workflow

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
4. **Clean up** - Clear stashes, prune remote branches
5. **Verify** - All changes committed AND pushed
6. **Hand off** - Provide context for next session

### Critical Rules

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## Code Style

- Follow existing patterns in the codebase
- Keep functions small and focused
- Prefer composition over inheritance
- Don't run typecheck or lint automatically unless asked
- Prefer simple, focused solutions over complex ones

---

## Communication

- Be concise in responses
- Show code changes clearly
- Explain reasoning when making non-obvious choices
- Ask clarifying questions when requirements are ambiguous
