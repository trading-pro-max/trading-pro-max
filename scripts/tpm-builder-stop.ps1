param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")

Set-Location $ProjectPath
$pidFile = ".\.tpm\builder.pid"

if (!(Test-Path $pidFile)) {
  Write-Host "TPM_BUILDER_NOT_RUNNING"
  exit
}

$builderPid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($builderPid) {
  try {
    Get-Process -Id $builderPid -ErrorAction Stop | Stop-Process -Force
    Write-Host "TPM_BUILDER_STOPPED PID=$builderPid"
  } catch {
    Write-Host "TPM_BUILDER_PID_STALE"
  }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
