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

# 4. Vibe shortcuts
function vibe { back2vibing @args }
function vb { back2vibing @args }
