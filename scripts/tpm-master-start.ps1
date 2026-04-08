param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath

$pidFile = ".\.tpm\master.worker.pid"
if (Test-Path $pidFile) {
  $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($oldPid) {
    try {
      Get-Process -Id $oldPid -ErrorAction Stop | Out-Null
      Write-Host "TPM_MASTER_ALREADY_RUNNING PID=$oldPid"
      exit
    } catch {}
  }
}

$p = Start-Process node -ArgumentList ".\scripts\tpm-master-worker.mjs" -WindowStyle Hidden -PassThru
Set-Content $pidFile $p.Id -Encoding UTF8
Write-Host "TPM_MASTER_RUNNING PID=$($p.Id)"
