# windows/profile/functions.ps1 - Custom PowerShell functions

# 1. Ship it! (Boat art)
function shipit {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    Write-Host "       _~"
    Write-Host "    _~ )_)_~"
    Write-Host "    )_))_))_)"
    Write-Host "    _!__!__!_"
    Write-Host "    \______t/"
    Write-Host "  ~~~~~~~~~~~~~"
    if ($branch) {
        git push origin $branch @args
    } else {
        git push @args
    }
}

function SHIPIT {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    Write-Host "       _~"
    Write-Host "    _~ )_)_~"
    Write-Host "    )_))_))_)"
    Write-Host "    _!__!__!_"
    Write-Host "    \______t/"
    Write-Host "  ~~~~~~~~~~~~~"
    if ($branch) {
        git push --force-with-lease origin $branch @args
    } else {
        git push --force-with-lease @args
    }
}

# 2. Redo (Sudo last command)
function redo {
    $history = Get-History -Count 1
    if ($history) {
        if (Get-Command gsudo -ErrorAction SilentlyContinue) {
            gsudo powershell -Command $history.CommandLine
        } else {
            Write-Host "gsudo not found. Run 'winget install gerardog.gsudo' first." -ForegroundColor Red
        }
    }
}

# 3. Fuck (rm -rf)
function fuck {
    Remove-Item -Recurse -Force @args
}

# 4. Unix-like helpers
function mkcd {
    param([Parameter(Mandatory = $true)][string]$Path)
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
    Set-Location $Path
}

function extract {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (!(Test-Path $Path)) {
        Write-Host "$Path is not a valid file" -ForegroundColor Red
        return 1
    }

    switch -Regex ($Path) {
        '\.zip$' { Expand-Archive -Path $Path -DestinationPath . -Force; break }
        '\.(tar|tar\.gz|tgz|tar\.bz2|tbz2)$' { tar -xf $Path; break }
        '\.7z$' {
            if (Get-Command 7z -ErrorAction SilentlyContinue) {
                7z x $Path
            } else {
                Write-Host "7z not found. Install 7-Zip first." -ForegroundColor Red
                return 1
            }
            break
        }
        default {
            Write-Host "$Path cannot be extracted by this helper" -ForegroundColor Yellow
            return 1
        }
    }
}

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

function Initialize-NodeSession {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    if (Get-Command fnm -ErrorAction SilentlyContinue) {
        fnm env --use-on-cd | Out-String | Invoke-Expression
    }
}

function Get-PnpmCommand {
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) { return $pnpm }

    Initialize-NodeSession
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) { return $pnpm }

    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install -g pnpm
        Initialize-NodeSession
    }

    return Get-Command pnpm -ErrorAction SilentlyContinue
}

function bbup {
    $dotfilesDir = Get-DotfilesDir
    if (!$dotfilesDir) {
        Write-Host "Dotfiles directory not found. Re-run the bootstrap." -ForegroundColor Red
        return 1
    }

    $updateScript = Join-Path $dotfilesDir "windows/update.ps1"
    . $updateScript
}

function bb {
    param([string]$Command = "help")

    $dotfilesDir = Get-DotfilesDir

    switch ($Command) {
        "help" {
            Write-Host "bb - dotfiles helper"
            Write-Host ""
            Write-Host "Usage: bb <command>"
            Write-Host ""
            Write-Host "Commands:"
            Write-Host "  bb update         Pull updates and reapply Windows setup"
            Write-Host "  bb setup          Run the interactive Windows setup"
            Write-Host "  bb status         Show Windows setup status"
            Write-Host "  bb kanata         Run Kanata with the shared config"
            Write-Host "  bb kanata-debug   Run Kanata with debug output"
            Write-Host "  bb kanata-install Install Kanata login autostart task"
            Write-Host "  bb kanata-uninstall Remove Kanata login autostart task"
            Write-Host "  bb kanata-status  Show Kanata autostart task status"
            Write-Host "  bb help           Show this help"
        }
        "update" { bbup }
        "setup" {
            if (!$dotfilesDir) { Write-Host "Dotfiles directory not found." -ForegroundColor Red; return 1 }
            Push-Location $dotfilesDir
            try {
                $pnpm = Get-PnpmCommand
                if (!$pnpm) { Write-Host "pnpm not found. Run: bb update" -ForegroundColor Red; return 1 }
                & $pnpm.Source exec tsx setup-windows.ts
            } finally { Pop-Location }
        }
        "status" {
            Initialize-NodeSession
            Write-Host "Dotfiles: $dotfilesDir"
            Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
            foreach ($cmd in @("git", "pwsh", "pnpm", "starship", "zoxide", "fzf", "rg", "bat", "eza", "tmux", "psmux", "kanata")) {
                $found = Get-Command $cmd -ErrorAction SilentlyContinue
                if ($found) { Write-Host "OK: $cmd -> $($found.Source)" -ForegroundColor Green }
                else { Write-Host "MISS: $cmd" -ForegroundColor Yellow }
            }
        }
        "kanata" { kanata-start }
        "kanata-debug" { kanata-debug }
        "kanata-install" { kanata-autostart install }
        "kanata-uninstall" { kanata-autostart uninstall }
        "kanata-status" { kanata-autostart status }
        default { Write-Host "Unknown bb command: $Command" -ForegroundColor Red; bb help; return 1 }
    }
}

function kanata-start {
    $config = Join-Path $HOME ".config/kanata/kanata.kbd"
    if (!(Test-Path $config)) {
        Write-Host "Kanata config not found: $config" -ForegroundColor Red
        return 1
    }
    kanata --cfg $config
}

function kanata-debug {
    $config = Join-Path $HOME ".config/kanata/kanata.kbd"
    if (!(Test-Path $config)) {
        Write-Host "Kanata config not found: $config" -ForegroundColor Red
        return 1
    }
    kanata --debug --cfg $config
}

function kanata-autostart {
    param([ValidateSet("install", "uninstall", "status")][string]$Action = "install")

    $dotfilesDir = Get-DotfilesDir
    if (!$dotfilesDir) {
        Write-Host "Dotfiles directory not found. Re-run the bootstrap." -ForegroundColor Red
        return 1
    }

    $script = Join-Path $dotfilesDir "windows/kanata-autostart.ps1"
    powershell -NoProfile -ExecutionPolicy Bypass -File $script -Action $Action
}

# 5. Vibe shortcuts
function vibe { back2vibing @args }
function vb { back2vibing @args }
