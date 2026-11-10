# OpenCode

OpenCode config is copy-managed from `ai/tool-settings/opencode/` because the tool owns its local files.

## Files

- `ai/tool-settings/opencode/opencode.json`
- `ai/tool-settings/opencode/oh-my-openagent.json`
- `ai/tool-settings/opencode/tui.json`

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

If you tweak OpenCode locally and want those changes versioned here, copy the updated files back into `ai/tool-settings/opencode/` and commit them.

## Default model

`opencode.json` and every agent/category in `oh-my-openagent.json` default to `opencode/muse-spark-1.3` (also the small model), with the previous paid models as fallbacks.

Applying via `bb setup` replaces the live `opencode.json` (after a backup), dropping local-only settings such as custom agents, provider timeouts and the plugin pin. Merge `model`/`small_model` by hand if you have those.
