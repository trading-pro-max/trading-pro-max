param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

$ErrorActionPreference = "Stop"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
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

function Wait-Port {
  param([int]$Port,[int]$TimeoutSec = 120)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
      if ($async.AsyncWaitHandle.WaitOne(1000, $false) -and $client.Connected) {
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

$sync = Join-Path $RepoRoot 'scripts\powershell\sync-secrets-to-env.ps1'
if (Test-Path $sync) {
  & $sync -RepoRoot $RepoRoot
}

$vaultPath = Join-Path $RepoRoot 'secrets\vault.local.json'
$commonEnvLines = @()
if (Test-Path $vaultPath) {
  $vault = Get-Content -LiteralPath $vaultPath -Raw | ConvertFrom-Json
  foreach ($prop in $vault.PSObject.Properties) {
    $safeValue = ([string]$prop.Value).Replace("'", "''")
    $commonEnvLines += "`$env:$($prop.Name)='$safeValue'"
  }
}
$commonEnv = ($commonEnvLines -join "`r`n")

$logDir = Join-Path $RepoRoot 'logs\runtime'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$apiOut = Join-Path $logDir 'api.out.log'
$apiErr = Join-Path $logDir 'api.err.log'
$webOut = Join-Path $logDir 'web.out.log'
$webErr = Join-Path $logDir 'web.err.log'
$desktopOut = Join-Path $logDir 'desktop.out.log'
$desktopErr = Join-Path $logDir 'desktop.err.log'

Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Stop-PortProcess 8787
Stop-PortProcess 5173
Stop-PortProcess 5175

$apiCmd = @"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath '$RepoRoot'
$commonEnv
npm.cmd run dev -w apps/api
"@

$webCmd = @"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath '$RepoRoot'
$commonEnv
npm.cmd run dev -w apps/web
"@

$desktopCmd = @"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath '$RepoRoot'
$commonEnv
npm.cmd run dev -w apps/desktop
"@

Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',$apiCmd -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr | Out-Null
if (-not (Wait-Port -Port 8787 -TimeoutSec 120)) {
  throw 'API failed to open port 8787'
}

Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',$webCmd -RedirectStandardOutput $webOut -RedirectStandardError $webErr | Out-Null
if (-not (Wait-Port -Port 5173 -TimeoutSec 120)) {
  throw 'Web failed to open port 5173'
}

Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',$desktopCmd -RedirectStandardOutput $desktopOut -RedirectStandardError $desktopErr | Out-Null
[void](Wait-Port -Port 5175 -TimeoutSec 60)

Write-Host ''
Write-Host 'Trading Pro Max stack is running in background.' -ForegroundColor Green
Write-Host 'API     => http://localhost:8787' -ForegroundColor Cyan
Write-Host 'Web     => http://localhost:5173' -ForegroundColor Cyan
Write-Host 'Desktop => app launched' -ForegroundColor Cyan
Write-Host 'Logs    => logs/runtime' -ForegroundColor Cyan