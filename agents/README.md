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

## How It Works

1. **Symlinks, not copies** - Changes in dotfiles propagate instantly
2. **Shared base** - Common rules in `shared/base.md` are included in each template
3. **Agent-specific** - Each agent has its own formatting and extensions

## Adding a New Agent

1. Create `agents/{agent}/` directory
2. Add the config file (e.g., `CONFIG.md`)
3. Update `shell/agents.sh` to include the new agent

## Best Practices

Edit `shared/base.md` for rules that apply to ALL agents:

- Git workflow (push, sync, etc.)
- Issue tracking (beads)
- Code style preferences
- Project-specific conventions
