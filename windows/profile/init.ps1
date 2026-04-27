# windows/profile/init.ps1 - Core integrations

# 1. Initialize Starship Prompt
if (Get-Command starship -ErrorAction SilentlyContinue) {
    & starship init powershell | Out-String | Invoke-Expression
}

# 2. Initialize Zoxide (Smarter cd)
if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    & zoxide init powershell | Out-String | Invoke-Expression
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
    try {
        # History-based prediction (like zsh-autosuggestions)
        if ((Get-Command Set-PSReadLineOption).Parameters.ContainsKey('PredictionSource')) {
            Set-PSReadLineOption -PredictionSource History -ErrorAction Stop
        }
        # Better Tab completion (cycle through results)
        Set-PSReadLineKeyHandler -Chord Tab -Function MenuComplete -ErrorAction Stop
        # Colorize command prediction (dim gray)
        Set-PSReadLineOption -Colors @{ InlinePrediction = "$([char]0x1b)[38;5;238m" } -ErrorAction Stop
    } catch {
        # Some hosts or older PSReadLine versions do not support prediction options.
    }
}

# 6. PNPM Tab Completion
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    # This just ensures completion is initialized if available
    # pnpm setup usually handles the bulk of this on Windows
}
