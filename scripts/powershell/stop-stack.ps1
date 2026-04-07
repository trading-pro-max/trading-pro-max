param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

function Stop-PortProcess {
  param([int]$Port)
  try {
    $pids = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($id in $pids) {
      if ($id -and $id -ne 0) {
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {}
}

Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force-Process -Force-Process -Force -ErrorAction SilentlyContinue
Stop-PortProcess 8787
Stop-PortProcess 5173
Stop-PortProcess 5175

Write-Host ''
Write-Host 'Trading Pro Max stopped.' -ForegroundColor Yellow

