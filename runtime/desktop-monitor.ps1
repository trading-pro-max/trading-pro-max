$ErrorActionPreference = 'SilentlyContinue'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath 'C:\Users\ahmad\Desktop\trading-pro-max\tpm9-updated'

function TailFile {
  param([string]$Path,[int]$Lines = 12)
  if (Test-Path $Path) {
    Get-Content -LiteralPath $Path -Tail $Lines
  } else {
    '[missing] ' + $Path
  }
}

while ($true) {
  Clear-Host
  Write-Host 'Trading Pro Max — Live Monitor' -ForegroundColor Cyan
  Write-Host ('Time      : ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray
  Write-Host ('Repo      : ' + 'C:\Users\ahmad\Desktop\trading-pro-max\tpm9-updated') -ForegroundColor Gray
  Write-Host ('Site URL  : ' + 'http://localhost:5173') -ForegroundColor Green
  Write-Host ''

  if (Test-Path '.\STATUS-TRADING-PRO-MAX.ps1') {
    & .\STATUS-TRADING-PRO-MAX.ps1
  } else {
    Write-Host 'STATUS-TRADING-PRO-MAX.ps1 not found' -ForegroundColor Yellow
  }

  Write-Host ''
  Write-Host '=== API OUT ===' -ForegroundColor Yellow
  TailFile '.\logs\runtime\api.out.log' 10

  Write-Host ''
  Write-Host '=== API ERR ===' -ForegroundColor Red
  TailFile '.\logs\runtime\api.err.log' 10

  Write-Host ''
  Write-Host '=== WEB OUT ===' -ForegroundColor Yellow
  TailFile '.\logs\runtime\web.out.log' 10

  Write-Host ''
  Write-Host '=== WATCHDOG ===' -ForegroundColor Magenta
  TailFile '.\logs\watchdog.log' 10

  Start-Sleep -Seconds 3
}