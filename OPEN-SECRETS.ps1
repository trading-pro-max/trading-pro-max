param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))
$vaultPath = Join-Path $RepoRoot 'secrets\vault.local.json'
notepad $vaultPath