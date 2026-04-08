param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath

$pidFile = ".\.tpm\master.worker.pid"
if (!(Test-Path $pidFile)) {
  Write-Host "TPM_MASTER_NOT_RUNNING"
  exit
}

$workerPid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($workerPid) {
  try {
    Get-Process -Id $workerPid -ErrorAction Stop | Stop-Process -Force
    Write-Host "TPM_MASTER_STOPPED PID=$workerPid"
  } catch {
    Write-Host "TPM_MASTER_PID_STALE"
  }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
