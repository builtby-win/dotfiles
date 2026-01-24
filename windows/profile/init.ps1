# windows/profile/init.ps1 - Core integrations

# 1. Initialize Starship Prompt
if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
}

# 2. Initialize Zoxide (Smarter cd)
if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    Invoke-Expression (&zoxide init powershell)
}

# 3. Initialize Fnm (Fast Node Manager)
if (Get-Command fnm -ErrorAction SilentlyContinue) {
    fnm env --use-on-cd | Out-String | Invoke-Expression
}

# 4. FZF Integration (Fuzzy Finder)
if (Get-Command fzf -ErrorAction SilentlyContinue) {
    # CTRL-R - Paste the selected command from history into the command line
    Set-PSReadLineKeyHandler -Chord 'Ctrl+r' -ScriptBlock {
        $res = history | Select-Object -ExpandProperty CommandLine | fzf --tac --no-sort --exact
        if ($res) {
            [Microsoft.PowerShell.PSConsoleReadLine]::Insert($res)
        }
    }

    # CTRL-T - Paste the selected file path into the command line
    Set-PSReadLineKeyHandler -Chord 'Ctrl+t' -ScriptBlock {
        $res = fzf
        if ($res) {
            [Microsoft.PowerShell.PSConsoleReadLine]::Insert($res)
        }
    }
}
