param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "SilentlyContinue"
Set-Location -LiteralPath $RepoRoot

$logDir = Join-Path $RepoRoot "logs"
$pidDir = Join-Path $RepoRoot "runtime"
$logPath = Join-Path $logDir "watchdog.log"
$pidPath = Join-Path $pidDir "watchdog.pid"
$cooldownPath = Join-Path $pidDir "watchdog.lastrestart"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $pidDir | Out-Null
Set-Content -LiteralPath $pidPath -Value $PID -Encoding UTF8

function LogLine {
  param([string]$Text)
  $line = ('[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $Text)
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

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

function Can-Restart {
  if (-not (Test-Path $cooldownPath)) { return $true }
  try {
    $last = Get-Date (Get-Content -LiteralPath $cooldownPath -Raw)
    return (((Get-Date) - $last).TotalSeconds -ge 45)
  } catch {
    return $true
  }
}

function Mark-Restart {
  Set-Content -LiteralPath $cooldownPath -Value ((Get-Date).ToString("o")) -Encoding UTF8
}

LogLine "Watchdog started."

while ($true) {
  $apiOk = Test-Port 8787
  $webOk = Test-Port 5173
  $desktopOk = Test-Port 5175

  if (-not ($apiOk -and $webOk -and $desktopOk)) {
    if (Can-Restart) {
      LogLine "Health degraded. Restarting hidden stack. API=$apiOk WEB=$webOk DESKTOP=$desktopOk"
      Mark-Restart
      $runPath = Join-Path $RepoRoot 'RUN-TRADING-PRO-MAX.ps1'
      Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$runPath | Out-Null
    } else {
      LogLine "Health degraded but cooldown active."
    }
  }

  Start-Sleep -Seconds 15
}