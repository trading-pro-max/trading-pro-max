param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

function Test-Port {
  param([int]$Port)
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(1000, $false) -and $client.Connected
    $client.Close()
    return $ok
  } catch {
    return $false
  }
}

Write-Host ''
Write-Host ('API 8787   : ' + ($(if (Test-Port 8787) { 'RUNNING' } else { 'DOWN' }))) -ForegroundColor Cyan
Write-Host ('WEB 5173   : ' + ($(if (Test-Port 5173) { 'RUNNING' } else { 'DOWN' }))) -ForegroundColor Cyan
Write-Host ('DESKTOP 5175: ' + ($(if (Test-Port 5175) { 'RUNNING' } else { 'DOWN' }))) -ForegroundColor Cyan
Write-Host ''