# Windows Setup Guide 🪟

This repository supports Windows in two ways:
1. **Native Windows:** Using PowerShell, Chocolatey, and Winget for a powerful native development environment.
2. **WSL (Windows Subsystem for Linux):** Running a full Linux kernel inside Windows for a complete Unix-like experience.

---

## Quick Start (Native Windows)

We provide a dedicated setup script for Windows that handles everything.

1. **Open PowerShell as Administrator**
   (Right-click Start Menu -> Terminal (Admin) / PowerShell (Admin))

2. **Install Git** (if missing)
   ```powershell
   winget install --id Git.Git -e --source winget
   ```

3. **Clone the repository**
   ```powershell
   git clone https://github.com/builtbywin/dotfiles.git
   cd dotfiles
   ```

4. **Run the Windows Setup**
   ```powershell
   npx tsx setup-windows.ts
   ```

### What does the script do?
* **Installs Package Managers:** Checks for Chocolatey and installs it if missing.
* **Installs Apps:**
  * **Dev:** `git`, `node`, `fnm`, `vscode`, `cursor`
  * **Tools:** `ripgrep`, `bat`, `eza`, `zoxide`, `fzf`
  * **Terminal:** `Windows Terminal`, `Warp`, `Zellij` (tmux alternative)
  * **System:** `PowerToys`
* **Configures Shell:**
  * Sets up your PowerShell `$PROFILE`.
  * Installs and configures **Starship** prompt.
  * Links config files (dotfiles) to their correct Windows locations (`%USERPROFILE%` and `%APPDATA%`).

---

## WSL Setup (Linux on Windows)

If you prefer a standard Unix environment (bash/zsh, standard file paths), use WSL.

1. **Run the Windows Setup Script** (as shown above).
   * Select **"Yes"** when asked if you want to install WSL.
   * This runs `wsl --install` which sets up Ubuntu by default.

2. **Reboot your Computer.**

3. **Open "Ubuntu"** from your Start Menu.
   * This opens a Linux terminal. Create your username/password.

4. **Clone & Setup inside WSL:**
   * Run the *standard* setup script (not the windows one):
   ```bash
   git clone https://github.com/builtbywin/dotfiles.git
   cd dotfiles
   ./setup.ts
   ```

This gives you the best of both worlds: native Windows tools for desktop apps, and a real Linux environment for backend/server development.

---

## Manual Steps & Troubleshooting

### Execution Policy
If you get permission errors running scripts, you might need to relax the execution policy:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### PowerShell Profile
The setup script automatically edits your profile. You can verify it by running `code $PROFILE`. It should load our custom init script:
```powershell
if (Test-Path "$env:USERPROFILE\.config\dotfiles") {
    Invoke-Expression (Get-Content "$env:USERPROFILE\.config\dotfiles\shell\init.ps1" -Raw)
}
```

### Font Issues
If icons in the terminal look weird (rectangles):
1. Install a **Nerd Font** (e.g., [JetBrainsMono Nerd Font](https://www.nerdfonts.com/font-downloads)).
2. Open Windows Terminal Settings -> Defaults -> Appearance.
3. Set the font to "JetBrainsMono NF".
