param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))
& (Join-Path $RepoRoot 'scripts\powershell\sync-secrets-to-env.ps1') -RepoRoot $RepoRoot
& (Join-Path $RepoRoot 'scripts\powershell\bootstrap.ps1') -RepoRoot $RepoRoot
& (Join-Path $RepoRoot 'scripts\powershell\run-stack.ps1') -RepoRoot $RepoRoot