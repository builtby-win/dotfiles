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

## Platform overlays

Codex and the other managed agent configurations are rendered from a shared
base file plus one OS-specific overlay: `.macos`, `.linux`, or `.windows`.
Put portable settings in the base file. Put local paths, desktop integrations,
and MCP servers in the appropriate overlay; this prevents macOS-only commands
from being installed on Linux SSH remotes or Windows. The current non-macOS
overlays are intentionally empty until a platform-specific integration is
explicitly needed.

## Repo-level agent instructions

For per-repo agent rules and instructions, use `agent-link` from `agents/`:

```bash
agent-link
agent-link claude
agent-link all
```

Details: `agents/README.md`.
