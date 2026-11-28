# Shared agent principles

These principles apply to every supported coding agent:

- Use judgment and prefer the smallest change that satisfies the request.
- Match the repository's existing patterns and keep unrelated work out of the diff.
- Inspect before editing; state assumptions when requirements are ambiguous.
- Verify changed behavior with the narrowest useful check before claiming completion.
- Run broader quality gates when the repository or delivery task requires them.
- Keep machine-specific paths, permissions, integrations, and secrets in local configuration.
- Publishing is explicit; use the shipping workflow when delivery is requested.
