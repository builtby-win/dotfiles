# windows/profile/aliases.ps1 - Unix-like aliases for PowerShell

# 1. Modern CLI replacements
if (Get-Command eza -ErrorAction SilentlyContinue) {
    function ls { eza --icons --git @args }
    function ll { eza -l --icons --git @args }
    function la { eza -a --icons --git @args }
}

if (Get-Command bat -ErrorAction SilentlyContinue) {
    Set-Alias cat bat
}

if (Get-Command rg -ErrorAction SilentlyContinue) {
    Set-Alias grep rg
}

if (Get-Command gsudo -ErrorAction SilentlyContinue) {
    Set-Alias sudo gsudo
}

if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    Set-Alias cd z
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

# 4. Package managers (pnpm)
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
function bname { git rev-parse --abbrev-ref HEAD }
function ggwip { git add . ; git commit -m "wip" --no-verify @args }
function unwip { git reset --soft HEAD~1 @args }
function amend { git commit --amend --no-verify @args }
function rename { git branch -m @args }

# 6. Standard Unix utilities missing or different in PS
