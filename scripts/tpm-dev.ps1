param(
  [string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

Set-Location $ProjectPath

Get-Process node | Stop-Process -Force
if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }

$env:NODE_OPTIONS="--no-deprecation"
npm run dev
