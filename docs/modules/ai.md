# AI configs

AI tool configs are copied from `templates/` because these tools rewrite their files.

## Included templates

- Claude Code
- Codex CLI
- Cursor

## Install

Use the interactive setup to copy templates based on the apps you select:

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
