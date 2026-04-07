param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))
& (Join-Path $RepoRoot 'scripts\powershell\status.ps1') -RepoRoot $RepoRoot