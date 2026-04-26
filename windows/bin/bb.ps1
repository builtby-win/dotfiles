# windows/bin/bb.ps1 - PATH-safe Windows dotfiles helper

$ErrorActionPreference = "Stop"

param(
    [string]$Command = "help",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)

function Get-DotfilesDir {
    if ($env:DOTFILES_DIR -and (Test-Path $env:DOTFILES_DIR)) {
        return $env:DOTFILES_DIR
    }

    $pathFile = Join-Path $HOME ".config/dotfiles/path"
    if (Test-Path $pathFile) {
        $path = (Get-Content $pathFile -Raw).Trim()
        if (Test-Path $path) { return $path }
    }

    $defaultPath = Join-Path $HOME "dotfiles"
    if (Test-Path $defaultPath) { return $defaultPath }

    return $null
}

function Invoke-Kanata {
    param([switch]$Debug)

    $config = Join-Path $HOME ".config/kanata/kanata.kbd"
    if (!(Test-Path $config)) {
        Write-Host "Kanata config not found: $config" -ForegroundColor Red
        exit 1
    }

    if ($Debug) {
        kanata --debug --cfg $config
    } else {
        kanata --cfg $config
    }
}

$dotfilesDir = Get-DotfilesDir

switch ($Command) {
    "help" {
        Write-Host "bb - dotfiles helper"
        Write-Host ""
        Write-Host "Usage: bb <command>"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  bb update           Pull updates and reapply Windows setup"
        Write-Host "  bb setup            Run the interactive Windows setup"
        Write-Host "  bb status           Show Windows setup status"
        Write-Host "  bb kanata           Run Kanata with the shared config"
        Write-Host "  bb kanata-debug     Run Kanata with debug output"
        Write-Host "  bb kanata-install   Install Kanata login autostart task"
        Write-Host "  bb kanata-uninstall Remove Kanata login autostart task"
        Write-Host "  bb kanata-status    Show Kanata autostart task status"
        Write-Host "  bb help             Show this help"
    }
    "update" {
        if (!$dotfilesDir) { Write-Host "Dotfiles directory not found." -ForegroundColor Red; exit 1 }
        . (Join-Path $dotfilesDir "windows/update.ps1")
    }
    "setup" {
        if (!$dotfilesDir) { Write-Host "Dotfiles directory not found." -ForegroundColor Red; exit 1 }
        Push-Location $dotfilesDir
        try { pnpm exec tsx setup-windows.ts @Rest } finally { Pop-Location }
    }
    "status" {
        Write-Host "Dotfiles: $dotfilesDir"
        Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
        foreach ($cmd in @("git", "pwsh", "pnpm", "starship", "zoxide", "fzf", "rg", "bat", "eza", "tmux", "psmux", "kanata")) {
            $found = Get-Command $cmd -ErrorAction SilentlyContinue
            if ($found) { Write-Host "OK: $cmd -> $($found.Source)" -ForegroundColor Green }
            else { Write-Host "MISS: $cmd" -ForegroundColor Yellow }
        }
    }
    "kanata" { Invoke-Kanata }
    "kanata-debug" { Invoke-Kanata -Debug }
    "kanata-install" {
        if (!$dotfilesDir) { Write-Host "Dotfiles directory not found." -ForegroundColor Red; exit 1 }
        powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dotfilesDir "windows/kanata-autostart.ps1") -Action install
    }
    "kanata-uninstall" {
        if (!$dotfilesDir) { Write-Host "Dotfiles directory not found." -ForegroundColor Red; exit 1 }
        powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dotfilesDir "windows/kanata-autostart.ps1") -Action uninstall
    }
    "kanata-status" {
        if (!$dotfilesDir) { Write-Host "Dotfiles directory not found." -ForegroundColor Red; exit 1 }
        powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dotfilesDir "windows/kanata-autostart.ps1") -Action status
    }
    default {
        Write-Host "Unknown bb command: $Command" -ForegroundColor Red
        exit 1
    }
}
