# windows/kanata-autostart.ps1 - Register or remove Kanata login autostart

$ErrorActionPreference = "Stop"

param(
    [ValidateSet("install", "uninstall", "status")]
    [string]$Action = "install"
)

$taskName = "BuiltBy Kanata"

$dotfilesDir = if ($env:DOTFILES_DIR) {
    $env:DOTFILES_DIR
} elseif (Test-Path (Join-Path $HOME ".config/dotfiles/path")) {
    (Get-Content (Join-Path $HOME ".config/dotfiles/path") -Raw).Trim()
} else {
    Join-Path $HOME "dotfiles"
}

$startScript = Join-Path $dotfilesDir "windows/kanata-start.ps1"

function Get-KanataTask {
    Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}

switch ($Action) {
    "install" {
        if (!(Test-Path $startScript)) {
            Write-Host "Kanata start script not found: $startScript" -ForegroundColor Red
            exit 1
        }

        $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
        $powershellExe = if ($pwsh) { $pwsh.Source } else { "powershell.exe" }
        $argument = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""

        $actionSpec = New-ScheduledTaskAction -Execute $powershellExe -Argument $argument
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
        $task = New-ScheduledTask -Action $actionSpec -Trigger $trigger -Principal $principal -Settings $settings

        Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
        Write-Host "Installed Kanata autostart task: $taskName" -ForegroundColor Green
        Write-Host "It will run at login with highest privileges." -ForegroundColor Cyan
    }
    "uninstall" {
        if (Get-KanataTask) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Host "Removed Kanata autostart task: $taskName" -ForegroundColor Green
        } else {
            Write-Host "Kanata autostart task is not installed." -ForegroundColor Yellow
        }
    }
    "status" {
        $task = Get-KanataTask
        if ($task) {
            Write-Host "Kanata autostart is installed: $taskName" -ForegroundColor Green
            Get-ScheduledTaskInfo -TaskName $taskName
        } else {
            Write-Host "Kanata autostart is not installed." -ForegroundColor Yellow
        }
    }
}
