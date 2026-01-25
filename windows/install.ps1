# windows/install.ps1 - Bootstrap script for Windows dotfiles

$ErrorActionPreference = "Stop"

Write-Host "Starting Windows Dotfiles Bootstrap..." -ForegroundColor Cyan
Write-Host "This will:" -ForegroundColor Cyan
Write-Host " - ensure winget and git are available" -ForegroundColor Cyan
Write-Host " - clone or update the dotfiles repo" -ForegroundColor Cyan
Write-Host " - link starship config and copy AI tool templates" -ForegroundColor Cyan
Write-Host " - leave optional apps for the interactive setup" -ForegroundColor Cyan

# 1. Check for Winget
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "Winget not found. Please install App Installer from the Microsoft Store." -ForegroundColor Red
    return
}
Write-Host "OK: Winget found." -ForegroundColor Green

# 2. Check for Git
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget
}
Write-Host "OK: Git found." -ForegroundColor Green

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

# 4. Configure Tools
Write-Host "Configuring tools..." -ForegroundColor Cyan

# 4.1 Starship
$starshipConfigDir = Join-Path $HOME ".config"
if (!(Test-Path $starshipConfigDir)) { New-Item -ItemType Directory $starshipConfigDir }
$starshipSource = Join-Path $dotfilesDir "stow-packages/zsh/.config/starship.toml"
$starshipDest = Join-Path $starshipConfigDir "starship.toml"
Write-Host "Linking starship.toml..." -ForegroundColor Yellow
if (Test-Path $starshipDest) { Remove-Item $starshipDest }
New-Item -ItemType HardLink -Path $starshipDest -Value $starshipSource

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
Write-Host "OK: Bootstrap complete." -ForegroundColor Green
Write-Host "Next: Run pnpm run setup after Node/pnpm are installed (Phase 2)." -ForegroundColor Cyan
