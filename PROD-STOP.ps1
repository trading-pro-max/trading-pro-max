param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

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

$pidPath = Join-Path $RepoRoot "runtime\prod-api.pid"
if (Test-Path $pidPath) {
  $prodPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue
  if ($prodPid) {
    try {
      Stop-Process -Id ([int]$prodPid) -Force -ErrorAction SilentlyContinue
    } catch {}
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

Stop-PortProcess 8787

Write-Host ""
Write-Host "Production server stopped." -ForegroundColor Yellow