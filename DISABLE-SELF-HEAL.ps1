param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath $RepoRoot

$pidPath = Join-Path $RepoRoot "runtime\watchdog.pid"

if (Test-Path $pidPath) {
  $watchdogPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue
  if ($watchdogPid) {
    try {
      Stop-Process -Id ([int]$watchdogPid) -Force -ErrorAction SilentlyContinue
    } catch {}
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Trading Pro Max self-heal disabled.' -ForegroundColor Yellow