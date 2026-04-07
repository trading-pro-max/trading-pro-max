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

function Stop-PublicTunnel {
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force-Process -Force -ErrorAction SilentlyContinue

  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $PID -and (
      ($_.Name -ieq 'powershell.exe' -or $_.Name -ieq 'cmd.exe' -or $_.Name -ieq 'node.exe') -and
      $_.CommandLine -like '*wrangler*tunnel*quick-start*127.0.0.1:8787*'
    )
  } | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
}

function Wait-UrlInLog {
  param(
    [string]$LogPath,
    [int]$TimeoutSec = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $pattern = 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com'

  while ((Get-Date) -lt $deadline) {
    if (Test-Path $LogPath) {
      $raw = Get-Content -LiteralPath $LogPath -Raw -ErrorAction SilentlyContinue
      if ($raw -match $pattern) {
        return $Matches[0]
      }
    }
    Start-Sleep -Seconds 2
  }

  return $null
}

$runtimeDir = Join-Path $RepoRoot 'runtime'
$logDir = Join-Path $RepoRoot 'logs\public'
$urlFile = Join-Path $runtimeDir 'public-url.txt'
$outLog = Join-Path $logDir 'public-tunnel.out.log'
$errLog = Join-Path $logDir 'public-tunnel.err.log'
$pidFile = Join-Path $runtimeDir 'public-tunnel.pid'

Remove-Item -LiteralPath $urlFile -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $outLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $errLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue

Stop-PublicTunnel
& (Join-Path $RepoRoot 'PROD-STOP.ps1')
Start-Sleep -Seconds 2
& (Join-Path $RepoRoot 'PROD-DEPLOY.ps1')

$cmd = @"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath '$RepoRoot'
npx.cmd wrangler tunnel quick-start http://127.0.0.1:8787
"@

$proc = Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',$cmd -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Set-Content -LiteralPath $pidFile -Value $proc.Id -Encoding UTF8

$url = Wait-UrlInLog -LogPath $outLog -TimeoutSec 120
if (-not $url) {
  throw 'Public tunnel URL was not captured.'
}

Set-Content -LiteralPath $urlFile -Value $url -Encoding UTF8

$vaultPath = Join-Path $RepoRoot 'secrets\vault.local.json'
if (Test-Path $vaultPath) {
  $vault = Get-Content -LiteralPath $vaultPath -Raw | ConvertFrom-Json
  $vault.PUBLIC_BASE_URL = $url
  $vault.API_BASE_URL = $url
  $vault.WEBHOOK_PUBLIC_URL = "$url/api/payments/webhook"
  $vault.CLOUDFLARE_TUNNEL_URL = $url
  $vault.APP_ENV = 'public-live'
  [System.IO.File]::WriteAllText($vaultPath, ($vault | ConvertTo-Json -Depth 40), (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host ''
Write-Host 'Public live URL ready:' -ForegroundColor Green
Write-Host $url -ForegroundColor Cyan

$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
$chrome86 = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$edge2 = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"

if (Test-Path $chrome) {
  Start-Process $chrome "--new-window $url"
} elseif (Test-Path $chrome86) {
  Start-Process $chrome86 "--new-window $url"
} elseif (Test-Path $edge) {
  Start-Process $edge "--new-window $url"
} elseif (Test-Path $edge2) {
  Start-Process $edge2 "--new-window $url"
} else {
  Start-Process $url
}
