param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath $RepoRoot

$vaultPath = Join-Path $RepoRoot "secrets\vault.local.json"
if (-not (Test-Path $vaultPath)) {
  throw "Missing secrets vault."
}

notepad $vaultPath