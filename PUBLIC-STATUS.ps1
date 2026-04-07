param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

function Test-Http {
  param([string]$Url)
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
  } catch {
    return $false
  }
}

$urlFile = Join-Path $RepoRoot 'runtime\public-url.txt'
$pidFile = Join-Path $RepoRoot 'runtime\public-tunnel.pid'
$outLog = Join-Path $RepoRoot 'logs\public\public-tunnel.out.log'
$errLog = Join-Path $RepoRoot 'logs\public\public-tunnel.err.log'

$url = if (Test-Path $urlFile) { Get-Content -LiteralPath $urlFile -Raw } else { '' }
$pidText = if (Test-Path $pidFile) { Get-Content -LiteralPath $pidFile -Raw } else { 'NOT RUNNING' }

Write-Host ''
Write-Host ('Tunnel PID : ' + $pidText) -ForegroundColor Cyan
Write-Host ('Public URL : ' + ($(if ($url) { $url } else { 'NOT READY' }))) -ForegroundColor Cyan
if ($url) {
  Write-Host ('Public Root: ' + ($(if (Test-Http $url) { 'RUNNING' } else { 'DOWN' }))) -ForegroundColor Cyan
  Write-Host ('API Health : ' + ($(if (Test-Http ($url.Trim() + '/api/health')) { 'RUNNING' } else { 'DOWN' }))) -ForegroundColor Cyan
}

Write-Host ''
if (Test-Path $outLog) {
  Write-Host '=== TUNNEL OUT ===' -ForegroundColor Yellow
  Get-Content -LiteralPath $outLog -Tail 20
}
Write-Host ''
if (Test-Path $errLog) {
  Write-Host '=== TUNNEL ERR ===' -ForegroundColor Red
  Get-Content -LiteralPath $errLog -Tail 20
}