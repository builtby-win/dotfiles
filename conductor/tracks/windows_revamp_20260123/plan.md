# Implementation Plan - Windows Dotfiles Revamp

## Phase 1: Foundation & Package Management [checkpoint: 4f93c89]
- [x] Task: Create windows/ directory structure for PowerShell scripts and configs 4e76b09
    - [x] Create windows/install.ps1 (Bootstrap)
    - [x] Create windows/packages.json (or similar list for Winget)
    - [x] Create windows/profile/ directory for modular profile scripts
- [x] Task: Implement windows/install.ps1 (Bootstrap Logic) 7001c95
    - [x] Check for and install Winget (if missing/outdated - usually built-in on Win11)
    - [x] Check for Git; install via Winget if missing
    - [x] Clone/Update dotfiles repo to $HOME/dotfiles
    - [x] Symlink (or copy) setup-windows.ts if needed for the interactive part
- [x] Task: Implement Package Installation Logic b066698
    - [x] Create function to install packages from a list using winget install -e --id <id>
    - [x] Populate package list with: Starship.Starship, ajeetdsouza.zoxide, junegunn.fzf, BurntSushi.ripgrep.MSVC, sharkdp.bat, eza-community.eza, Schniz.fnm, gerardog.gsudo, Git.Git, Neovim.Neovim
    - [x] Verify installation of all core CLI tools
- [x] Task: Conductor - User Manual Verification 'Foundation & Package Management' (Protocol in workflow.md)

## Phase 2: PowerShell Profile & Shell Ergonomics [checkpoint: c1a905e]
- [x] Task: Initialize Modular PowerShell Profile bac5b50
    - [x] Create Microsoft.PowerShell_profile.ps1 entry point that sources other files
    - [x] Create windows/profile/init.ps1 (Starship, Fnm, Zoxide init)
    - [x] Create windows/profile/aliases.ps1 (Unix aliases)
    - [x] Create windows/profile/functions.ps1 (Custom functions)
- [x] Task: Implement Core Integrations fd758d6
    - [x] Configure Invoke-Expression (&starship init powershell)
    - [x] Configure Invoke-Expression (&zoxide init powershell)
    - [x] Configure fnm env --use-on-cd | Out-String | Invoke-Expression
- [x] Task: Implement Unix-like Aliases & Tools efa1d8e
    - [x] Map ls to eza (with arguments like --icons --git)
    - [x] Map cat to bat
    - [x] Map grep to rg
    - [x] Map sudo to gsudo
    - [x] Implement which equivalent (using Get-Command)
- [x] Task: Implement FZF Integration e0ecad9
    - [x] Install PSFzf module (via Install-Module) or configure raw FZF bindings
    - [x] Bind Ctrl+R to history search
    - [x] Bind Ctrl+T to file search
- [x] Task: Conductor - User Manual Verification 'PowerShell Profile & Shell Ergonomics' (Protocol in workflow.md)

## Phase 3: AI Tools & Configuration [checkpoint: 434a506]
- [x] Task: Install AI Tools via Winget 63861b6
    - [x] Add Anysphere.Cursor to package list
    - [x] Add Anthropic.Claude (if available) or manual install step/instruction
- [x] Task: Symlink/Copy Configurations 57338f9
    - [x] Create logic to copy/symlink starship.toml to ~/.config/starship.toml
    - [x] Create logic to copy/symlink templates/claude/* to Windows AppData path
    - [x] Create logic to copy/symlink templates/cursor/* to Windows AppData path
- [x] Task: Conductor - User Manual Verification 'AI Tools & Configuration' (Protocol in workflow.md)

## Phase 4: Interactive Setup & Polish
- [x] Task: Update setup-windows.ts (Interactive CLI) 7c87221
    - [x] Ensure it calls the PowerShell functions correctly
    - [x] Add prompts for optional installations (similar to the Mac setup)
- [x] Task: Final Integration Test a18b8b4
    - [x] Verify full end-to-end run of bootstrap.ps1
    - [x] Verify new shell opens with Starship
    - [x] Verify all aliases work
- [ ] Task: Documentation
    - [ ] Update `WINDOWS_README.md` with new installation instructions
- [ ] Task: Conductor - User Manual Verification 'Interactive Setup & Polish' (Protocol in workflow.md)
