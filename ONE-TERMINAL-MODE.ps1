Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
cd C:\Users\ahmad\Desktop\trading-pro-max\tpm9-updated

while ($true) {
  Clear-Host
  Write-Host "Trading Pro Max - One Terminal Mode" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Press Enter = diagnose + fix + run + status" -ForegroundColor Yellow
  Write-Host "Type exit = close" -ForegroundColor Yellow
  Write-Host ""

  $x = Read-Host
  if ($x -eq 'exit') { break }

  powershell -ExecutionPolicy Bypass -File .\TPM-CONTROL.ps1 fix
  Start-Sleep -Seconds 2
  powershell -ExecutionPolicy Bypass -File .\TPM-CONTROL.ps1 status

  Write-Host ""
  Write-Host "Done. Press Enter again for next cycle." -ForegroundColor Green
}
