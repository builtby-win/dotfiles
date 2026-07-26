# Dotfiles agent guidance

This repository distributes shell, application, and AI-agent configuration. Keep shared templates portable and preserve existing backup/revert behavior in setup flows.

Match the repository's conventions and keep changes focused. When changing setup or templates, verify the affected configuration and installation mapping.

When adding or changing shared templates, keep machine-specific paths, permissions, integrations, and secrets in local configuration. Existing application templates may contain user-specific integrations; migrate them only when the target tool supports a safe merge.

Publishing is explicit. Use the shipping workflow when the user asks to commit, push, open a PR, or clean up branches. Reviews and investigations may remain read-only.
