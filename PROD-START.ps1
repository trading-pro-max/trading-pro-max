param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

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

$syncPath = Join-Path $RepoRoot "scripts\powershell\sync-secrets-to-env.ps1"
if (Test-Path $syncPath) {
  & $syncPath -RepoRoot $RepoRoot
}

$vaultPath = Join-Path $RepoRoot "secrets\vault.local.json"
$logDir = Join-Path $RepoRoot "logs\production"
$runtimeDir = Join-Path $RepoRoot "runtime"
$pidPath = Join-Path $runtimeDir "prod-api.pid"
$outLog = Join-Path $logDir "prod-api.out.log"
$errLog = Join-Path $logDir "prod-api.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

Stop-PortProcess 8787

$envLines = @()
if (Test-Path $vaultPath) {
  $vault = Get-Content -LiteralPath $vaultPath -Raw | ConvertFrom-Json
  foreach ($prop in $vault.PSObject.Properties) {
    $safeValue = ([string]$prop.Value).Replace("'", "''")
    $envLines += "`$env:$($prop.Name)='$safeValue'"
  }
}
$envLines += "`$env:NODE_ENV='production'"
$envBlock = ($envLines -join "`r`n")

$command = @"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath '$RepoRoot'
$envBlock
npx.cmd tsx apps/api/src/server.ts
"@

$process = Start-Process powershell -ArgumentList '-NoProfile','-NoExit','-ExecutionPolicy','Bypass','-Command',$command -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Set-Content -LiteralPath $pidPath -Value $process.Id -Encoding UTF8

Write-Host ""
Write-Host "Production server started." -ForegroundColor Green
Write-Host "URL => http://localhost:8787" -ForegroundColor Cyan
Write-Host "PID => $($process.Id)" -ForegroundColor Cyan
Write-Host "OUT => $outLog" -ForegroundColor Cyan
Write-Host "ERR => $errLog" -ForegroundColor Cyan