# windows/install.ps1 - Bootstrap script for Windows dotfiles

$ErrorActionPreference = "Stop"

Write-Host "Starting Windows Dotfiles Bootstrap..." -ForegroundColor Cyan

# 1. Check for Winget
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "Winget not found. Please install App Installer from the Microsoft Store." -ForegroundColor Red
    return
}
Write-Host "✓ Winget found." -ForegroundColor Green

# 2. Check for Git
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget
}
Write-Host "✓ Git found." -ForegroundColor Green

# 3. Clone/Update Dotfiles Repository
$dotfilesDir = Join-Path $HOME "dotfiles"
if (!(Test-Path $dotfilesDir)) {
    Write-Host "Cloning dotfiles repository..." -ForegroundColor Yellow
    git clone https://github.com/builtby-win/dotfiles.git $dotfilesDir
} else {
    Write-Host "Dotfiles repository already exists at $dotfilesDir. Updating..." -ForegroundColor Yellow
    Push-Location $dotfilesDir
    git pull
    Pop-Location
}

# 4. Install Packages
Write-Host "Installing core packages via winget..." -ForegroundColor Cyan
$manifestPath = Join-Path $dotfilesDir "windows/packages.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath | ConvertFrom-Json
    foreach ($pkg in $manifest.packages) {
        Write-Host "Installing $pkg..." -ForegroundColor Yellow
        winget install --id $pkg -e --source winget --silent --accept-package-agreements --accept-source-agreements
    }
}

# 5. Configure Tools
Write-Host "Configuring tools..." -ForegroundColor Cyan

# 5.1 Starship
$starshipConfigDir = Join-Path $HOME ".config"
if (!(Test-Path $starshipConfigDir)) { New-Item -ItemType Directory $starshipConfigDir }
$starshipSource = Join-Path $dotfilesDir "stow-packages/zsh/.config/starship.toml"
$starshipDest = Join-Path $starshipConfigDir "starship.toml"
Write-Host "Linking starship.toml..." -ForegroundColor Yellow
if (Test-Path $starshipDest) { Remove-Item $starshipDest }
New-Item -ItemType HardLink -Path $starshipDest -Value $starshipSource

# 5.2 AI Tools (Claude & Cursor)
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

# 6. Finalizing
Write-Host "✓ Bootstrap complete." -ForegroundColor Green
Write-Host "Next: Run 'pnpm run setup' (once Node/pnpm are installed in Phase 2)." -ForegroundColor Cyan
