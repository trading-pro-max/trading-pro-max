param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))
& (Join-Path $RepoRoot 'scripts\powershell\stop-stack.ps1') -RepoRoot $RepoRoot