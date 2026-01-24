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

# 2. Standard Unix utilities missing or different in PS
function which ($name) {
    Get-Command $name -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
}

# 3. Git Shortcuts (mirroring aliases.sh)
function p { git add -p @args }
function ggwip { git commit -m "wip" @args }
function unwip { git reset HEAD~1 @args }
function shipit { git push @args }
function amend { git commit --amend @args }
