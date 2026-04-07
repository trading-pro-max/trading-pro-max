param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

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
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

$pidPath = Join-Path $RepoRoot "runtime\prod-api.pid"
$pidText = if (Test-Path $pidPath) { Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue } else { "NOT RUNNING" }

Write-Host ""
Write-Host ("PROD PID      : " + $pidText) -ForegroundColor Cyan
Write-Host ("PORT 8787     : " + ($(if (Test-Port 8787) { "RUNNING" } else { "DOWN" }))) -ForegroundColor Cyan
Write-Host ("API HEALTH    : " + ($(if (Test-Http "http://localhost:8787/api/health") { "RUNNING" } else { "DOWN" }))) -ForegroundColor Cyan
Write-Host ("ROOT          : " + ($(if (Test-Http "http://localhost:8787") { "RUNNING" } else { "DOWN" }))) -ForegroundColor Cyan
Write-Host ""