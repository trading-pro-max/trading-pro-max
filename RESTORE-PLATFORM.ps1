param(
  [string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$ZipPath = ""
)

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

if (-not $ZipPath) {
  $latest = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "backups") -Filter "*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) {
    throw "No backup zip found."
  }
  $ZipPath = $latest.FullName
}

$tempRestore = Join-Path $RepoRoot ("restore-temp-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRestore | Out-Null

Expand-Archive -LiteralPath $ZipPath -DestinationPath $tempRestore -Force

Get-ChildItem -LiteralPath $tempRestore | ForEach-Object {
  $target = Join-Path $RepoRoot $_.Name
  if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue
  }
  Move-Item -LiteralPath $_.FullName -Destination $target -Force
}

Remove-Item -LiteralPath $tempRestore -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Restore completed.' -ForegroundColor Green
Write-Host $ZipPath -ForegroundColor Cyan