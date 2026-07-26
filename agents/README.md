# Agent Configuration Templates

This directory contains centralized agent configuration templates that can be symlinked to any repository.

## Quick Start

```bash
# Ensure shell helpers are loaded (bb setup shell)

# In any git repository:
agent-link              # Interactive: select agents to link
agent-link claude       # Link just Claude
agent-link all          # Link all agents

# Update all configs (pulls dotfiles)
agent-update

# Check which repos have which configs
agent-status
```

If `agent-link` is not found, ensure your shell config is installed:

```bash
bb setup shell
```

## Directory Structure

```
agents/
├── shared/
│   └── base.md         # Common rules for all agents
├── claude/
│   └── CLAUDE.md       # Claude Code config
├── gemini/
│   └── GEMINI.md       # Gemini/Antigravity config
└── opencode/
    └── AGENTS.md       # OpenCode config
```

## How it works

`agent-link` creates symlinks from supported agent-specific files into the current repository. The three adapters currently supported are Claude, Gemini, and OpenCode.

The adapters intentionally stay short and mirror the principles in `shared/base.md`. There is no runtime include mechanism, so update the adapters when changing the shared principles.

AI application settings under `templates/` are copy-managed by `setup.ts`; they are separate from repo-level agent instructions.

## Adding a new agent

1. Add an adapter under `agents/{agent}/`.
2. Add its `agent:config_filename` entry to `shell/agents.sh`.
3. Document its installation path and precedence.
4. Keep machine-specific settings and permissions out of shared templates.

Codex and Cursor currently have application templates but no repo-level instruction adapters. OMP uses its runtime-managed skills rather than a repository instruction file.

## Editing principles

Keep `shared/base.md` as the canonical checklist for supported adapters. Keep agent files short, positive, and specific to repository behavior. Put delivery, review, QA, and other long procedures in their respective skills.
