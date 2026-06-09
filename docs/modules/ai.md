# AI configs

AI tool configs are copied from `templates/` because these tools rewrite their files.

## Included templates

- Claude Code
- OpenCode
- Codex CLI
- Cursor

## Install

Use the interactive setup to copy templates based on the apps you select. OpenCode is selected by default in the recommended setup; Codex CLI is optional in the same checklist:

```bash
bb setup
```

## Repo-level agent instructions

For per-repo agent rules and instructions, use `agent-link` from `agents/`:

```bash
agent-link
agent-link claude
agent-link all
```

Details: `agents/README.md`.
