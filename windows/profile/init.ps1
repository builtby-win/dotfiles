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

# 5. PSReadLine Options (Better Autocomplete)
if (Get-Module -ListAvailable PSReadLine) {
    # History-based prediction (like zsh-autosuggestions)
    Set-PSReadLineOption -PredictionSource History
    # Better Tab completion (cycle through results)
    Set-PSReadLineKeyHandler -Chord Tab -Function MenuComplete
    # Colorize command prediction (dim gray)
    Set-PSReadLineOption -Colors @{ InlinePrediction = "$([char]0x1b)[38;5;238m" }
}

# 6. PNPM Tab Completion
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    # This just ensures completion is initialized if available
    # pnpm setup usually handles the bulk of this on Windows
}
