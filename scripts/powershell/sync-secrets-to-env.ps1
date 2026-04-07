param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

$ErrorActionPreference = "Stop"

$vaultPath = Join-Path $RepoRoot 'secrets\vault.local.json'
if (-not (Test-Path $vaultPath)) {
  throw "Missing secrets vault: $vaultPath"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$vault = Get-Content -LiteralPath $vaultPath -Raw | ConvertFrom-Json

$lines = New-Object System.Collections.Generic.List[string]

foreach ($prop in $vault.PSObject.Properties) {
  $name = $prop.Name
  $value = [string]$prop.Value
  $lines.Add("$name=$value")
}

[System.IO.File]::WriteAllText((Join-Path $RepoRoot '.env'), ($lines -join [Environment]::NewLine), $utf8NoBom)

Write-Host 'Secrets synced to .env' -ForegroundColor Green
