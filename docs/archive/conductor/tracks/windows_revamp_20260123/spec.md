# Specification: Revamp Windows Dotfiles Implementation

## 1. Overview
This track focuses on completely rebuilding the Windows dotfiles implementation. The current setup is broken and lacks the polish of the macOS/Linux version. The goal is to create a "Unix-like," highly ergonomic, and opinionated PowerShell environment that serves as a first-class platform for AI-assisted coding. This setup must be installable in under 5 minutes and function independently of the Unix scripts.

## 2. Functional Requirements

### 2.1 Bootstrap & Installation
- **Script:** A new, robust `bootstrap.ps1` script that serves as the single entry point.
- **Dependency Management:** Automatically install core dependencies using `winget` (Git, Node.js, etc.) if missing.
- **Idempotency:** The script must be safe to run multiple times without causing errors or duplicating configurations.
- **Repo Cloning:** Handle the cloning of the dotfiles repository to a standard location (e.g., `~/.dotfiles` or `~/dotfiles`) if not already present.

### 2.2 Package Management (Winget)
- **Manifest:** Define a curated list of Windows packages equivalent to the macOS Brewfile.
- **Core Tools:** Ensure installation of:
  - `starship` (Prompt)
  - `zoxide` (Directory navigation)
  - `fzf` (Fuzzy finder)
  - `ripgrep` (Search)
  - `bat` (Cat replacement)
  - `eza` (Ls replacement)
  - `neovim` (Editor)
  - `git`
  - `fnm` (Node version manager)
  - `gsudo` (Sudo for Windows)
  - AI Tools: `cursor`, `claude` (if available via winget or separate install), `gh` (GitHub CLI).

### 2.3 PowerShell Configuration
- **Profile Management:** Create a modular PowerShell profile (breaking up a monolithic `$PROFILE`).
- **Starship Integration:** Initialize Starship with the existing `starship.toml` configuration (ensuring cross-platform consistency).
- **Unix-like Experience:**
  - Implement standard Unix aliases (`ls` -> `eza`, `cat` -> `bat`, `grep` -> `rg`, `touch`, `which`, etc.).
  - Ensure `vi` mode or consistent keybindings where possible.
  - Configure `zoxide` for `cd`.
  - Configure `fzf` for history search and file navigation (`Ctrl+R`, `Ctrl+T` equivalents).

### 2.4 AI Tool Integration
- **Configuration:** Ensure AI tool configurations (Claude, Codex, Cursor) are correctly placed or linked in their respective Windows configuration directories (`$env:APPDATA`, etc.).
- **Hooks:** Verify that any necessary shell hooks for these tools are initialized in the PowerShell profile.

## 3. Non-Functional Requirements
- **Performance:** Shell startup time should be minimized.
- **Ergonomics:** The "feel" should match the Zsh setup on macOS as closely as possible within the constraints of PowerShell.
- **Isolation:** No dependencies on WSL for the core shell experience (this is a native PowerShell setup).
- **Code Style:** PowerShell scripts should follow standard formatting (PSSCriptAnalyzer compatible).

## 4. Out of Scope
- WSL configuration (this track is strictly for native PowerShell).
- modifying the existing Bash/Zsh scripts (unless for cleanup of shared assets).

## 5. Acceptance Criteria
- [ ] Running `irm .../bootstrap.ps1 | iex` on a fresh Windows 11 machine completes setup in < 5 mins.
- [ ] PowerShell starts with Starship prompt.
- [ ] `ls`, `cat`, `grep` run their modern equivalents (`eza`, `bat`, `rg`).
- [ ] `z` (zoxide) works for navigation.
- [ ] `Ctrl+R` invokes fzf history search.
- [ ] AI tools (Cursor, Claude) are installed and their config files are present.
