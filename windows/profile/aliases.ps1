# windows/profile/aliases.ps1 - Unix-like aliases for PowerShell

# 1. Modern CLI replacements
if (Get-Command eza -ErrorAction SilentlyContinue) {
    function ls { eza --icons --git @args }
    function ll { eza -l --icons --git @args }
    function la { eza -a --icons --git @args }
    function lt { eza --tree --icons --git @args }
}

if (Get-Command bat -ErrorAction SilentlyContinue) {
    Set-Alias -Name cat -Value bat -Option AllScope -Force
}

if (Get-Command rg -ErrorAction SilentlyContinue) {
    Set-Alias -Name grep -Value rg -Force
}

if (Get-Command gsudo -ErrorAction SilentlyContinue) {
    Set-Alias -Name sudo -Value gsudo -Force
}

if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    Set-Alias -Name cd -Value z -Option AllScope -Force
}

# 2. Directory Navigation
function .. { Set-Location .. }
function ... { Set-Location ..\.. }
function .... { Set-Location ..\..\.. }
function ..... { Set-Location ..\..\..\.. }
function ...... { Set-Location ..\..\..\..\.. }

# 3. Quick shortcuts
Set-Alias -Name d -Value z -ErrorAction SilentlyContinue
Set-Alias -Name - -Value 'Pop-Location' -ErrorAction SilentlyContinue # Close enough to cd -
function rc { . $PROFILE }

# 3.1 AI CLI shortcuts
function claude { Invoke-CliCommand claude @('--dangerously-skip-permissions') @args }
function c { claude @args }
function o { Invoke-CliCommand opencode @() @args }
function gemini { Invoke-CliCommand gemini @('--yolo') @args }
function g { gemini @args }
function codex {
    $previousBypassAgentWizard = $env:B2V_BYPASS_AGENT_WIZARD
    $env:B2V_BYPASS_AGENT_WIZARD = '1'
    try {
        Invoke-CliCommand codex @('--dangerously-bypass-approvals-and-sandbox') @args
    } finally {
        if ($null -eq $previousBypassAgentWizard) {
            Remove-Item Env:\B2V_BYPASS_AGENT_WIZARD -ErrorAction SilentlyContinue
        } else {
            $env:B2V_BYPASS_AGENT_WIZARD = $previousBypassAgentWizard
        }
    }
}

# 4. Package managers (pnpm)
function pnpm {
    $command = Get-PnpmCommand
    if (!$command) {
        Write-Host "pnpm not found. Run: bb update" -ForegroundColor Red
        return 1
    }
    & $command.Source @args
}
function pp { pnpm @args }
function po { pnpm run @args }
function ppr { pnpm run @args }

# 5. Git Shortcuts (mirroring aliases.sh)
function gco { git checkout @args }
function gst { git status @args }
function gb { git branch @args }
function gl { git log --oneline --graph --decorate @args }
function ga { git add @args }
function gc { git commit @args }
function gp { git push @args }
function gd { git diff @args }
function p { git add -p @args }
function co- { git checkout - @args }
function gc- { git checkout - @args }
function bname { git rev-parse --abbrev-ref HEAD }
function ggwip { git add . ; git commit -m "wip" --no-verify @args }
function unwip { git reset --soft HEAD~1 @args }
function amend { git commit --amend --no-verify @args }
function rename { git branch -m @args }

# 6. Standard Unix utilities missing or different in PS
function which { Get-Command @args }
