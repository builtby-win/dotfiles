# Microsoft.PowerShell_profile.ps1 - Main entry point

# Get the directory of this script
$ConfigDir = Split-Path $MyInvocation.MyCommand.Path

# Source modular profile scripts
. (Join-Path $ConfigDir "profile/init.ps1")
. (Join-Path $ConfigDir "profile/aliases.ps1")
. (Join-Path $ConfigDir "profile/functions.ps1")
