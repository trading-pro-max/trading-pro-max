param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")

Set-Location $ProjectPath
$pidFile = ".\.tpm\builder.pid"

if (!(Test-Path $pidFile)) {
  Write-Host "TPM_BUILDER_NOT_RUNNING"
  exit
}

$pid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($pid) {
  try {
    Get-Process -Id $pid -ErrorAction Stop | Stop-Process -Force
    Write-Host "TPM_BUILDER_STOPPED PID=$pid"
  } catch {
    Write-Host "TPM_BUILDER_PID_STALE"
  }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
