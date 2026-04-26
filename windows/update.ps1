# windows/update.ps1 - Idempotent Windows update/apply flow

$ErrorActionPreference = "Stop"

$dotfilesDir = if ($env:DOTFILES_DIR) {
    $env:DOTFILES_DIR
} elseif (Test-Path (Join-Path $HOME ".config/dotfiles/path")) {
    Get-Content (Join-Path $HOME ".config/dotfiles/path") -Raw
} else {
    Join-Path $HOME "dotfiles"
}

$dotfilesDir = $dotfilesDir.Trim()

if (!(Test-Path $dotfilesDir)) {
    Write-Host "Dotfiles directory not found: $dotfilesDir" -ForegroundColor Red
    exit 1
}

Push-Location $dotfilesDir
try {
    git pull --rebase --autostash

    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm install --silent
    }

    . (Join-Path $dotfilesDir "windows/install.ps1")
} finally {
    Pop-Location
}
