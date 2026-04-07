param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

function Test-Port {
  param([int]$Port)
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(1000, $false) -and $client.Connected
    $client.Close()
    return $ok
  } catch {
    return $false
  }
}

function Test-Http {
  param([string]$Url)
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500)
  } catch {
    return $false
  }
}

$checks = [ordered]@{
  "Repo root" = (Test-Path $RepoRoot)
  "Secrets vault" = (Test-Path (Join-Path $RepoRoot "secrets\vault.local.json"))
  "Root env" = (Test-Path (Join-Path $RepoRoot ".env"))
  "DB file" = (Test-Path (Join-Path $RepoRoot "packages\db\prisma\dev.db"))
  "API port 8787" = (Test-Port 8787)
  "WEB port 5173" = (Test-Port 5173)
  "API health" = (Test-Http "http://localhost:8787/api/health")
  "WEB health" = (Test-Http "http://localhost:5173")
}

Write-Host ""
Write-Host "Trading Pro Max Doctor" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

$failed = $false
foreach ($item in $checks.GetEnumerator()) {
  $state = if ($item.Value) { "OK" } else { "FAIL" }
  $color = if ($item.Value) { "Green" } else { "Red" }
  if (-not $item.Value) { $failed = $true }
  Write-Host ($item.Key.PadRight(18) + ": " + $state) -ForegroundColor $color
}

Write-Host ""

if ($failed) {
  Write-Host "Doctor found issues." -ForegroundColor Yellow
  exit 1
} else {
  Write-Host "Doctor passed. Backbone is healthy." -ForegroundColor Green
}