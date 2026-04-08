param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath

$pidFile = ".\.tpm\github-worker.pid"
if (!(Test-Path $pidFile)) {
  Write-Host "TPM_GITHUB_WORKER_NOT_RUNNING"
  exit
}

$workerPid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($workerPid) {
  try {
    Get-Process -Id $workerPid -ErrorAction Stop | Stop-Process -Force
    Write-Host "TPM_GITHUB_WORKER_STOPPED PID=$workerPid"
  } catch {
    Write-Host "TPM_GITHUB_WORKER_PID_STALE"
  }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
