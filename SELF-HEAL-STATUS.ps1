param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

$pidPath = Join-Path $RepoRoot "runtime\watchdog.pid"
$logPath = Join-Path $RepoRoot "logs\watchdog.log"

Write-Host ''
if (Test-Path $pidPath) {
  $watchdogPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue
  Write-Host ("Watchdog PID : " + $watchdogPid) -ForegroundColor Green
} else {
  Write-Host "Watchdog PID : NOT RUNNING" -ForegroundColor Red
}

if (Test-Path $logPath) {
  Write-Host ''
  Write-Host 'Last watchdog lines:' -ForegroundColor Cyan
  Get-Content -LiteralPath $logPath -Tail 10
}