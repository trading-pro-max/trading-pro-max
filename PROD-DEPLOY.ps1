param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))
& (Join-Path $RepoRoot "PROD-BUILD.ps1") -RepoRoot $RepoRoot
& (Join-Path $RepoRoot "PROD-STOP.ps1") -RepoRoot $RepoRoot
Start-Sleep -Seconds 2
& (Join-Path $RepoRoot "PROD-START.ps1") -RepoRoot $RepoRoot
Start-Sleep -Seconds 8
& (Join-Path $RepoRoot "PROD-STATUS.ps1") -RepoRoot $RepoRoot