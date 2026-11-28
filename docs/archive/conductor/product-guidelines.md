# Product Guidelines

## Prose Style
- **Concise and Direct:** All documentation, commit messages, and script outputs should be professional, direct, and concise. Avoid unnecessary filler text.
- **Technical and Precise:** Focus on technical accuracy. Use precise terminology to ensure power users and students alike have a clear understanding of the system's state and requirements.

## Visual Identity (CLI & Prompt)
- **Minimalist and Functional:** The command-line interface and shell prompt (Starship) should prioritize functionality. Use colors and icons (e.g., Nerd Fonts) purposefully to highlight status, context (like Git branch or language version), and errors without creating visual clutter.

## Brand Messaging & Tone
- **Opinionated and Efficient:** The project should confidently recommend a specific, optimized "golden path" for terminal workflows. This reflects the goal of providing an ergonomic environment for AI coding.
- **Flexible and Modular:** While being opinionated, the setup should remain modular, allowing for personal customizations (e.g., via `shell/local.sh`) without breaking the core structure.
- **Educational and Guiding:** Documentation and setup interactions should briefly explain the benefits of specific choices, helping users (especially students) understand *why* a particular tool or configuration is being used.

## Error Handling & Feedback
- **Action-Oriented Feedback:** When a setup step or script fails, the output must clearly identify the failure and, whenever possible, provide a specific, actionable instruction or command to resolve the issue.
- **Progress Transparency:** During long-running tasks (like package installation), provide clear but non-verbose progress indicators to keep the user informed.
