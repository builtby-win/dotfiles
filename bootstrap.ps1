$ErrorActionPreference = 'Stop'

function Print-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║         builtby.win/dotfiles              ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Print-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

Print-Banner

# 1. Install Directory
$DefaultDir = "$HOME\dotfiles"
Write-Host "Where should we install the dotfiles? (default: $DefaultDir)" -ForegroundColor Cyan
$DotfilesDir = Read-Host "> "
if ([string]::IsNullOrWhiteSpace($DotfilesDir)) {
    $DotfilesDir = $DefaultDir
}
if ($DotfilesDir.StartsWith("~")) {
    $DotfilesDir = $DotfilesDir.Replace("~", $HOME)
}

Write-Host ""

# 2. Check/Install Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Print-Step "Git not found. Installing via Winget..."
    try {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
        
        # Refresh Path
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
             # Try common install path
             $GitPath = "C:\Program Files\Git\cmd\git.exe"
             if (Test-Path $GitPath) {
                 $env:Path += ";C:\Program Files\Git\cmd"
             } else {
                 throw "Git installed but not found in PATH."
             }
        }
        Print-Success "Git installed"
    } catch {
        Print-Error "Failed to install Git. Please install it manually."
        exit 1
    }
}

# 3. Clone/Update Repo
if (Test-Path "$DotfilesDir\.git") {
    Print-Step "Updating existing dotfiles..."
    Set-Location $DotfilesDir
    git pull
    Print-Success "Dotfiles updated"
} elseif (Test-Path $DotfilesDir -PathType Container) {
     if ((Get-ChildItem $DotfilesDir).Count -gt 0) {
        Print-Error "Directory $DotfilesDir exists and is not empty."
        exit 1
     }
     Print-Step "Cloning dotfiles..."
     git clone https://github.com/builtby-win/dotfiles.git $DotfilesDir
     Print-Success "Cloned to $DotfilesDir"
     Set-Location $DotfilesDir
} else {
    Print-Step "Cloning dotfiles..."
    git clone https://github.com/builtby-win/dotfiles.git $DotfilesDir
    Print-Success "Cloned to $DotfilesDir"
    Set-Location $DotfilesDir
}

# 4. Check/Install fnm
if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
    Print-Step "Installing fnm (Fast Node Manager)..."
    try {
        winget install --id Schniz.fnm -e --source winget --accept-package-agreements --accept-source-agreements
        
        # Refresh Path
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Fallback check for user install
        if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
            $fnmUserPath = "$env:LOCALAPPDATA\Programs\fnm"
            if (Test-Path "$fnmUserPath\fnm.exe") {
                $env:Path += ";$fnmUserPath"
            }
        }

        if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
            throw "fnm installed but not found in PATH."
        }
        Print-Success "fnm installed"
    } catch {
        Print-Error "Failed to install fnm via Winget. Trying Chocolatey if available..."
        if (Get-Command choco -ErrorAction SilentlyContinue) {
             choco install fnm -y
        } else {
             Print-Error "Could not install fnm."
             exit 1
        }
    }
}

# 5. Setup Node & pnpm
Print-Step "Setting up Node.js environment..."
try {
    # Initialize fnm for this session
    fnm env --use-on-cd | Out-String | Invoke-Expression
    
    # Install LTS
    fnm install --lts
    fnm use lts-latest
    
    # Install pnpm
    npm install -g pnpm
    Print-Success "Node.js and pnpm installed"
} catch {
    Print-Error "Failed to setup Node/pnpm: $_"
    exit 1
}

# 6. Install Dependencies
Print-Step "Installing dependencies..."
pnpm install --silent
Print-Success "Dependencies installed"

# 7. Run Setup
Print-Step "Running Windows setup..."
Write-Host ""
pnpm exec tsx setup-windows.ts
