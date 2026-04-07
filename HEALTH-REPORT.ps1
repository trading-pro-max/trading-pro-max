param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "SilentlyContinue"
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

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$reportDir = Join-Path $RepoRoot "logs\reports"
$reportPath = Join-Path $reportDir ("health-report-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$lines = @()
$lines += "Trading Pro Max Health Report"
$lines += "Generated: $stamp"
$lines += ""
$lines += ("API 8787      : " + ($(if (Test-Port 8787) { "RUNNING" } else { "DOWN" })))
$lines += ("WEB 5173      : " + ($(if (Test-Port 5173) { "RUNNING" } else { "DOWN" })))
$lines += ("DESKTOP 5175  : " + ($(if (Test-Port 5175) { "RUNNING" } else { "DOWN" })))
$lines += ("DB file       : " + ($(if (Test-Path (Join-Path $RepoRoot 'packages\db\prisma\dev.db')) { "FOUND" } else { "MISSING" })))
$lines += ("Secrets vault : " + ($(if (Test-Path (Join-Path $RepoRoot 'secrets\vault.local.json')) { "FOUND" } else { "MISSING" })))
$lines += ("Root env      : " + ($(if (Test-Path (Join-Path $RepoRoot '.env')) { "FOUND" } else { "MISSING" })))

Set-Content -LiteralPath $reportPath -Value ($lines -join [Environment]::NewLine) -Encoding UTF8

Write-Host ''
Write-Host 'Health report created.' -ForegroundColor Green
Write-Host $reportPath -ForegroundColor Cyan