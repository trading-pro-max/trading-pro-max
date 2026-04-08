param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath

$pidFile = ".\.tpm\github-worker.pid"
if (Test-Path $pidFile) {
  $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($oldPid) {
    try {
      Get-Process -Id $oldPid -ErrorAction Stop | Out-Null
      Write-Host "TPM_GITHUB_WORKER_ALREADY_RUNNING PID=$oldPid"
      exit
    } catch {}
  }
}

$p = Start-Process node -ArgumentList ".\scripts\tpm-github-worker.mjs" -WindowStyle Hidden -PassThru
Set-Content $pidFile $p.Id -Encoding UTF8
Write-Host "TPM_GITHUB_WORKER_RUNNING PID=$($p.Id)"
