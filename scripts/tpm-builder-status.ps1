param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")

Set-Location $ProjectPath

$pidFile = ".\.tpm\builder.pid"
$statusFile = ".\.tpm\builder-status.json"

if (Test-Path $pidFile) {
  $pid = Get-Content $pidFile -ErrorAction SilentlyContinue
  Write-Host "PID=$pid"
} else {
  Write-Host "PID=NONE"
}

if (Test-Path $statusFile) {
  Get-Content $statusFile
} else {
  Write-Host "NO_STATUS_FILE"
}
