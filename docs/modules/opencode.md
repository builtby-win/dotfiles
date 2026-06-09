# OpenCode

OpenCode config is copy-managed from `templates/opencode/` because the tool owns its local files.

## Files

- `templates/opencode/opencode.json`
- `templates/opencode/oh-my-openagent.json`
- `templates/opencode/tui.json`

## Current styling

The repo keeps OpenCode on a cool blue palette so it visually matches the newer `neru` theme direction. Oh My OpenAgent is configured with GPT-5.5 for most reasoning paths and GPT-5.4 Mini for implementation/fast execution paths.

## Apply

OpenCode is selected by default in the recommended setup. Codex CLI is also available in the same checklist as an optional AI tool.

```bash
# Recommended setup — OpenCode is preselected; check Codex too if wanted
bb setup

# Or pass the AI Agent setup path explicitly for OpenCode-focused configs
bb setup --setup-path ai_agent
```

## Sync workflow

If you tweak OpenCode locally and want those changes versioned here, copy the updated files back into `templates/opencode/` and commit them.
