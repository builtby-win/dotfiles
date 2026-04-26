# windows/kanata-start.ps1 - Start Kanata with the shared dotfiles config

$ErrorActionPreference = "Stop"

$config = Join-Path $HOME ".config/kanata/kanata.kbd"
if (!(Test-Path $config)) {
    Write-Host "Kanata config not found: $config" -ForegroundColor Red
    exit 1
}

$kanata = Get-Command kanata -ErrorAction SilentlyContinue
if (!$kanata) {
    Write-Host "kanata executable not found. Install Kanata first." -ForegroundColor Red
    exit 1
}

& $kanata.Source --cfg $config
