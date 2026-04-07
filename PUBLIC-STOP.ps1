param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force-Process -Force-Process -Force -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  ($_.Name -ieq 'powershell.exe' -or $_.Name -ieq 'cmd.exe' -or $_.Name -ieq 'node.exe') -and
  $_.CommandLine -like '*wrangler*tunnel*quick-start*127.0.0.1:8787*'
} | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
}

Remove-Item -LiteralPath (Join-Path $RepoRoot 'runtime\public-tunnel.pid') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $RepoRoot 'runtime\public-url.txt') -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Public live tunnel stopped.' -ForegroundColor Yellow

