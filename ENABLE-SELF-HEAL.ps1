param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath $RepoRoot

$pidPath = Join-Path $RepoRoot "runtime\watchdog.pid"
$watchdogPath = Join-Path $RepoRoot "scripts\powershell\watchdog.ps1"
$runPath = Join-Path $RepoRoot "RUN-TRADING-PRO-MAX.ps1"

if (Test-Path $pidPath) {
  $oldPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue
  if ($oldPid) {
    try { Stop-Process -Id ([int]$oldPid) -Force -ErrorAction SilentlyContinue } catch {}
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$runPath | Out-Null
Start-Sleep -Seconds 8
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$watchdogPath | Out-Null

Write-Host ''
Write-Host 'Trading Pro Max self-heal enabled in hidden mode.' -ForegroundColor Green