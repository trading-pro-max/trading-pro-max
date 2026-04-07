param([string]$ProjectPath="C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath
Write-Host "PWD: $(Get-Location)"
Write-Host "APP_EXISTS: $(Test-Path .\app)"
Write-Host "PACKAGE_EXISTS: $(Test-Path .\package.json)"
Write-Host "LAYOUT_EXISTS: $(Test-Path .\app\layout.js)"
Write-Host "NEXT_EXISTS: $(Test-Path .\.next)"
Write-Host "SCRIPTS_DIR: $(Test-Path .\scripts)"
Write-Host "JUMPS_DIR: $(Test-Path .\scripts\jumps)"
Write-Host "GIT: $(Test-Path .\.git)"
Write-Host "AUTO_PUSH_PID: $(Test-Path .\logs\auto-push.pid)"
if (Test-Path .\package.json) {
  Write-Host "SCRIPTS:"
  Get-Content .\package.json | Select-String '"dev"|"build"|"start"|"lint"'
}
