# Technology Stack

## Core Shell & Scripting
- **Zsh:** The primary shell for macOS and Linux, managed with `zinit` for high performance.
- **PowerShell:** The target shell for native Windows support, focused on ergonomics and Unix-like functionality.
- **Node.js:** used for the interactive setup script (`setup.ts`) and managed via `fnm`.
- **TypeScript:** Used for development and maintenance of setup logic, ensuring type safety and reliability.

## CLI Utilities
- **Starship:** A fast, cross-shell prompt that provides consistent visual feedback across Zsh and PowerShell.
- **Tmux:** Used for terminal multiplexing and session management on macOS and Linux.
- **GNU Stow:** Manages symlinks for dotfile distribution on Unix-based systems.
- **Zinit:** A flexible and fast plugin manager for Zsh.

## AI Development Tools
- **Claude Code:** Integrated AI coding assistant for the terminal.
- **Codex CLI:** OpenAI-powered CLI assistant.
- **Cursor:** AI-first code editor used as the primary IDE.

## Package & Environment Management
- **pnpm:** A fast, disk space-efficient package manager for Node.js projects.
- **Homebrew:** The primary package manager for macOS and Linux.
- **winget:** The primary package manager for Windows native applications.
- **fnm:** A fast Node.js version manager.
