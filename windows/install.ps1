# windows/install.ps1 - Bootstrap script for Windows dotfiles

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK: $Message" -ForegroundColor Green
}

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

function Add-UserPath {
    param([string]$PathToAdd)

    if (!(Test-Path $PathToAdd)) { return }

    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $parts = @($userPath -split ';' | Where-Object { $_ })
    if ($parts -notcontains $PathToAdd) {
        $newPath = if ($userPath) { "$userPath;$PathToAdd" } else { $PathToAdd }
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    }

    Refresh-Path
}

function Install-WingetPackage {
    param([string]$Id)

    Write-Step "Ensuring $Id"
    winget install --id $Id -e --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity
    Refresh-Path
}

function Install-PackageManifest {
    param([string]$ManifestPath)

    if (!(Test-Path $ManifestPath)) {
        Write-Host "Package manifest not found: $ManifestPath" -ForegroundColor Yellow
        return
    }

    $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    foreach ($packageId in $manifest.packages) {
        try {
            Install-WingetPackage $packageId
        } catch {
            Write-Host "WARN: Failed to install $packageId. Continuing so config can still apply." -ForegroundColor Yellow
        }
    }
}

function Set-DotfileLink {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (!(Test-Path $Source)) {
        Write-Host "WARN: Missing source, skipping link: $Source" -ForegroundColor Yellow
        return
    }

    $destinationDir = Split-Path $Destination
    if (!(Test-Path $destinationDir)) {
        New-Item -ItemType Directory $destinationDir -Force | Out-Null
    }

    if (Test-Path $Destination) {
        Remove-Item $Destination -Force
    }

    try {
        New-Item -ItemType HardLink -Path $Destination -Value $Source | Out-Null
    } catch {
        Copy-Item -Path $Source -Destination $Destination -Force
    }
}

function Link-PowerShellProfile {
    param([string]$ProfilePath)

    $profileDir = Split-Path $ProfilePath
    $profileModuleDir = Join-Path $profileDir "profile"
    if (!(Test-Path $profileModuleDir)) { New-Item -ItemType Directory $profileModuleDir -Force | Out-Null }

    Set-DotfileLink (Join-Path $dotfilesDir "windows/Microsoft.PowerShell_profile.ps1") $ProfilePath
    Set-DotfileLink (Join-Path $dotfilesDir "windows/profile/init.ps1") (Join-Path $profileModuleDir "init.ps1")
    Set-DotfileLink (Join-Path $dotfilesDir "windows/profile/aliases.ps1") (Join-Path $profileModuleDir "aliases.ps1")
    Set-DotfileLink (Join-Path $dotfilesDir "windows/profile/functions.ps1") (Join-Path $profileModuleDir "functions.ps1")
}

Write-Host "Starting Windows Dotfiles Bootstrap..." -ForegroundColor Cyan
Write-Host "This will:" -ForegroundColor Cyan
Write-Host " - ensure winget, git, and core CLI packages are available" -ForegroundColor Cyan
Write-Host " - clone or update the dotfiles repo" -ForegroundColor Cyan
Write-Host " - link PowerShell, Starship, and Kanata configs" -ForegroundColor Cyan
Write-Host " - copy AI tool templates" -ForegroundColor Cyan
Write-Host " - leave optional apps for the interactive setup" -ForegroundColor Cyan

# 1. Check for Winget
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "Winget not found. Please install App Installer from the Microsoft Store." -ForegroundColor Red
    return
}
Write-Ok "Winget found."

# 2. Check for Git
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity
    Refresh-Path
}
Write-Ok "Git found."

# 3. Clone/Update Dotfiles Repository
$dotfilesDir = Join-Path $HOME "dotfiles"
if (!(Test-Path $dotfilesDir)) {
    Write-Host "Cloning dotfiles repository..." -ForegroundColor Yellow
    git clone https://github.com/builtby-win/dotfiles.git $dotfilesDir
} else {
    Write-Host "Dotfiles repository already exists at $dotfilesDir. Updating..." -ForegroundColor Yellow
    Push-Location $dotfilesDir
    git pull --rebase --autostash
    Pop-Location
}

# 3.1 Install core packages from manifest
Install-PackageManifest (Join-Path $dotfilesDir "windows/packages.json")

# 4. Configure Tools
Write-Host "Configuring tools..." -ForegroundColor Cyan

# 4.0 Dotfiles path marker
$dotfilesConfigDir = Join-Path $HOME ".config/dotfiles"
if (!(Test-Path $dotfilesConfigDir)) { New-Item -ItemType Directory $dotfilesConfigDir -Force | Out-Null }
Set-Content -Path (Join-Path $dotfilesConfigDir "path") -Value $dotfilesDir -NoNewline

# 4.0.1 PATH-safe bb helper
Add-UserPath (Join-Path $dotfilesDir "windows/bin")
Add-UserPath (Join-Path $HOME ".cargo/bin")
$env:DOTFILES_DIR = $dotfilesDir

# 4.0.2 Kanata CLI
if (!(Get-Command kanata -ErrorAction SilentlyContinue)) {
    Refresh-Path
    if (Get-Command cargo -ErrorAction SilentlyContinue) {
        Write-Step "Installing Kanata CLI with cargo"
        cargo install kanata
        Refresh-Path
    } else {
        Write-Host "WARN: cargo not found; Kanata GUI is installed, but bb kanata needs the kanata CLI." -ForegroundColor Yellow
    }
}

# 4.1 Starship
$starshipConfigDir = Join-Path $HOME ".config"
if (!(Test-Path $starshipConfigDir)) { New-Item -ItemType Directory $starshipConfigDir }
$starshipSource = Join-Path $dotfilesDir "stow-packages/zsh/.config/starship.toml"
$starshipDest = Join-Path $starshipConfigDir "starship.toml"
Write-Host "Linking starship.toml..." -ForegroundColor Yellow
Set-DotfileLink $starshipSource $starshipDest

# 4.1.1 Kanata
$kanataConfigDir = Join-Path $starshipConfigDir "kanata"
if (!(Test-Path $kanataConfigDir)) { New-Item -ItemType Directory $kanataConfigDir }
$kanataSource = Join-Path $dotfilesDir "stow-packages/kanata/.config/kanata/kanata.kbd"
$kanataDest = Join-Path $kanataConfigDir "kanata.kbd"
if (Test-Path $kanataSource) {
    Write-Host "Linking kanata.kbd..." -ForegroundColor Yellow
    Set-DotfileLink $kanataSource $kanataDest
}

# 4.1.2 PowerShell profile
Write-Host "Linking PowerShell profile..." -ForegroundColor Yellow
$documentsDir = [Environment]::GetFolderPath("MyDocuments")
Link-PowerShellProfile $PROFILE.CurrentUserCurrentHost
Link-PowerShellProfile (Join-Path $documentsDir "PowerShell/Microsoft.PowerShell_profile.ps1")
Link-PowerShellProfile (Join-Path $documentsDir "WindowsPowerShell/Microsoft.PowerShell_profile.ps1")

# 4.1.3 tmux/psmux config
$tmuxSourceDir = Join-Path $dotfilesDir "stow-packages/tmux/.config/tmux"
$tmuxDestDir = Join-Path $starshipConfigDir "tmux"
$tmuxBootstrapSource = Join-Path $tmuxSourceDir "builtby/bootstrap.basic.conf"
$tmuxBootstrapDest = Join-Path $HOME ".tmux.conf"
if (Test-Path $tmuxSourceDir) {
    Write-Host "Syncing tmux/psmux config..." -ForegroundColor Yellow
    if (Test-Path $tmuxDestDir) { Remove-Item $tmuxDestDir -Recurse -Force }
    Copy-Item -Path $tmuxSourceDir -Destination $tmuxDestDir -Recurse -Force
    Set-DotfileLink $tmuxBootstrapSource $tmuxBootstrapDest
}

# 4.2 AI Tools (Claude & Cursor)
$appData = $env:APPDATA
$localAppData = $env:LOCALAPPDATA

# Claude (typically in %APPDATA%/claude-code)
$claudeConfigDir = Join-Path $appData "claude-code"
if (!(Test-Path $claudeConfigDir)) { New-Item -ItemType Directory $claudeConfigDir }
Write-Host "Copying Claude templates..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $dotfilesDir "templates/claude/*") -Destination $claudeConfigDir -Recurse -Force

# Cursor (typically in %APPDATA%/Cursor/User)
$cursorConfigDir = Join-Path $appData "Cursor/User"
if (!(Test-Path $cursorConfigDir)) { 
    # Try to create the parent directories if they don't exist
    New-Item -ItemType Directory (Join-Path $appData "Cursor") -ErrorAction SilentlyContinue
    New-Item -ItemType Directory $cursorConfigDir -ErrorAction SilentlyContinue 
}
if (Test-Path $cursorConfigDir) {
    Write-Host "Copying Cursor templates..." -ForegroundColor Yellow
    Copy-Item -Path (Join-Path $dotfilesDir "templates/cursor/*") -Destination $cursorConfigDir -Recurse -Force
}

# 5. Finalizing
Write-Ok "Bootstrap complete."
Write-Host "PATH refreshed for this process. New terminals can run 'bb status'." -ForegroundColor Cyan
if (Test-Path (Join-Path $dotfilesDir "windows/bin/bb.ps1")) {
    Write-Host "Running setup status check..." -ForegroundColor Cyan
    & (Join-Path $dotfilesDir "windows/bin/bb.ps1") status
}
