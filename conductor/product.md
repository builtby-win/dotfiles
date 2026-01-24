# Initial Concept

My personal dotfiles with a fast shell setup, AI tool configs, and curated app list.

# Product Definition

## Target Audience
- **Myself:** Personal use for maintaining a highly efficient development environment.
- **Developers:** Those seeking a fast, optimized shell setup.
- **AI Tool Users:** Developers leveraging tools like Claude and Codex who need pre-configured, best-practice setups.
- **Course Students:** Students learning about AI coding who need a quick and reliable environment setup.

## Product Goals
- **Terminal Efficiency:** Prioritize speed and workflow efficiency in the terminal.
- **AI Integration:** Ensure seamless integration with AI-powered development tools.
- **Ergonomics & Usability:** Create a functional and ergonomic environment that is a joy to use.
- **Cross-Platform Accessibility:** Provide a top-tier experience for both macOS and Windows users, ensuring the setup is robust on both platforms.
- **Rapid Onboarding:** Enable users to set up their entire AI coding environment in under 5 minutes.

## Core Features
- **Automated Setup:** Robust scripts (`bootstrap.sh`, `setup.ts`) to handle installation and configuration automatically.
- **Advanced Zsh Config:** A curated Zsh setup featuring `zinit` for plugin management and `starship` for a fast, informative prompt.
- **Tmux Optimization:** An optimized Tmux configuration designed for effective session management and multitasking.
- **AI Tooling:** Pre-configured settings and hooks for Claude, Codex, and Cursor to enhance AI-assisted workflows.
- **Windows Support:** A dedicated, high-quality setup for Windows users that matches the ergonomics and functionality of the macOS experience, acknowledging the distinct nature of the two environments.

## Constraints & Requirements
- **Platform Specificity:** While supporting both macOS and Windows, the implementations should be distinct and optimized for their respective shells (Zsh vs. PowerShell) rather than forced into a shared logic.
- **Setup Speed:** The entire setup process must be completable within 5 minutes.
- **Reliability:** The setup must be reliable and "work well" on Windows, addressing current deficiencies.
