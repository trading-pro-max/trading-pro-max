param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath

$pidFile = ".\.tpm\master.worker.pid"
$runtimeFile = ".\.tpm\master.worker.runtime.json"
$globalFile = ".\.tpm\global-progress.json"

if (Test-Path $pidFile) {
  Write-Host "PID=$(Get-Content $pidFile -ErrorAction SilentlyContinue)"
} else {
  Write-Host "PID=NONE"
}

if (Test-Path $runtimeFile) {
  Get-Content $runtimeFile
} else {
  Write-Host "NO_RUNTIME_FILE"
}

if (Test-Path $globalFile) {
  Get-Content $globalFile
} else {
  Write-Host "NO_GLOBAL_PROGRESS_FILE"
}
