# Style
- Terse. Lead with the answer + tradeoffs. No recap, no preamble, no narration between tool calls, no restating the request.
- Final reply: outcome, evidence, blockers. A few lines unless detail is asked for.

# Orchestration
- Primary session owns intent, decomposition, architecture, integration, final verification.
- Delegate broad exploration to `scout`, mechanical work to `sonic`, implementation slices to `task` (or a specialist). Small known-location fixes: do inline.
- Batch all independent slices in one `task` call; sequence only true dependencies.
- Subagent prompts: exact files, required behavior, constraints, acceptance criteria; skip formatters/linters/builds/tests. Don't hard-code model names.
- Verify once per phase in the primary session; on failure dispatch a focused fix. Not done until the changed behavior has been exercised.

# Decision memory (local override, outside generated block)
- Before non-trivial work (design choices, refactors, anything touching an area with prior history), `recall` prior decisions and rejected approaches for the topic; do not rely on auto-injected memories.
- After a decision is settled or an approach is rejected/failed, `retain` it with the why and the alternatives ruled out.
