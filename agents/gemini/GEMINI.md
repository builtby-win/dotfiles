# Gemini Instructions

<!-- This file is symlinked from builtby.win/dotfiles -->
<!-- Edit the source at: dotfiles/agents/gemini/GEMINI.md -->

## Session Completion

**When ending a work session**, complete ALL steps. Work is NOT complete until `git push` succeeds.

1. File issues for remaining work
2. Run quality gates (if code changed)
3. **PUSH TO REMOTE**:
   ```bash
   git pull --rebase && git push
   git status  # MUST show "up to date with origin"
   ```
4. Clean up stashes, verify all pushed

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
