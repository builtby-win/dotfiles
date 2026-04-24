# OpenCode

OpenCode config is copy-managed from `templates/opencode/` because the tool owns its local files.

## Files

- `templates/opencode/opencode.json`
- `templates/opencode/oh-my-openagent.json`
- `templates/opencode/tui.json`

## Current styling

The repo keeps OpenCode on a cool blue palette so it visually matches the newer `neru` theme direction. Oh My OpenAgent is configured with GPT-5.5 for most reasoning paths and GPT-5.4 Mini for implementation/fast execution paths.

## Apply

Run the interactive setup and select OpenCode, or re-run setup if it is already enabled:

```bash
bb setup
```

## Sync workflow

If you tweak OpenCode locally and want those changes versioned here, copy the updated files back into `templates/opencode/` and commit them.
