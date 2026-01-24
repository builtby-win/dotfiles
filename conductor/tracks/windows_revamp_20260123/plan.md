# Implementation Plan - Windows Dotfiles Revamp

## Phase 1: Foundation & Package Management
- [x] Task: Create windows/ directory structure for PowerShell scripts and configs 4e76b09
    - [x] Create windows/install.ps1 (Bootstrap)
    - [x] Create windows/packages.json (or similar list for Winget)
    - [x] Create windows/profile/ directory for modular profile scripts
- [ ] Task: Implement `windows/install.ps1` (Bootstrap Logic)
    - [ ] Check for and install Winget (if missing/outdated - usually built-in on Win11)
    - [ ] Check for Git; install via Winget if missing
    - [ ] Clone/Update dotfiles repo to `$HOME/dotfiles`
    - [ ] Symlink (or copy) `setup-windows.ts` if needed for the interactive part
- [ ] Task: Implement Package Installation Logic
    - [ ] Create function to install packages from a list using `winget install -e --id <id>`
    - [ ] Populate package list with: `Starship.Starship`, `ajeetdsouza.zoxide`, `junegunn.fzf`, `BurntSushi.ripgrep.MSVC`, `sharkdp.bat`, `eza-community.eza`, `Schniz.fnm`, `gerardog.gsudo`, `Git.Git`, `Neovim.Neovim`
    - [ ] Verify installation of all core CLI tools
- [ ] Task: Conductor - User Manual Verification 'Foundation & Package Management' (Protocol in workflow.md)

## Phase 2: PowerShell Profile & Shell Ergonomics
- [ ] Task: Initialize Modular PowerShell Profile
    - [ ] Create `Microsoft.PowerShell_profile.ps1` entry point that sources other files
    - [ ] Create `windows/profile/init.ps1` (Starship, Fnm, Zoxide init)
    - [ ] Create `windows/profile/aliases.ps1` (Unix aliases)
    - [ ] Create `windows/profile/functions.ps1` (Custom functions)
- [ ] Task: Implement Core Integrations
    - [ ] Configure `Invoke-Expression (&starship init powershell)`
    - [ ] Configure `Invoke-Expression (&zoxide init powershell)`
    - [ ] Configure `fnm env --use-on-cd | Out-String | Invoke-Expression`
- [ ] Task: Implement Unix-like Aliases & Tools
    - [ ] Map `ls` to `eza` (with arguments like `--icons --git`)
    - [ ] Map `cat` to `bat`
    - [ ] Map `grep` to `rg`
    - [ ] Map `sudo` to `gsudo`
    - [ ] Implement `which` equivalent (using `Get-Command`)
- [ ] Task: Implement FZF Integration
    - [ ] Install `PSFzf` module (via `Install-Module`) or configure raw FZF bindings
    - [ ] Bind `Ctrl+R` to history search
    - [ ] Bind `Ctrl+T` to file search
- [ ] Task: Conductor - User Manual Verification 'PowerShell Profile & Shell Ergonomics' (Protocol in workflow.md)

## Phase 3: AI Tools & Configuration
- [ ] Task: Install AI Tools via Winget
    - [ ] Add `Anysphere.Cursor` to package list
    - [ ] Add `Anthropic.Claude` (if available) or manual install step/instruction
- [ ] Task: Symlink/Copy Configurations
    - [ ] Create logic to copy/symlink `starship.toml` to `~/.config/starship.toml`
    - [ ] Create logic to copy/symlink `templates/claude/*` to Windows AppData path
    - [ ] Create logic to copy/symlink `templates/cursor/*` to Windows AppData path
- [ ] Task: Conductor - User Manual Verification 'AI Tools & Configuration' (Protocol in workflow.md)

## Phase 4: Interactive Setup & Polish
- [ ] Task: Update `setup-windows.ts` (Interactive CLI)
    - [ ] Ensure it calls the PowerShell functions correctly
    - [ ] Add prompts for optional installations (similar to the Mac setup)
- [ ] Task: Final Integration Test
    - [ ] Verify full end-to-end run of `bootstrap.ps1`
    - [ ] Verify new shell opens with Starship
    - [ ] Verify all aliases work
- [ ] Task: Documentation
    - [ ] Update `WINDOWS_README.md` with new installation instructions
- [ ] Task: Conductor - User Manual Verification 'Interactive Setup & Polish' (Protocol in workflow.md)
