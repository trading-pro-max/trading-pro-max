param([string]$ProjectPath="C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath
Write-Host "PWD: $(Get-Location)"
Write-Host "APP_EXISTS: $(Test-Path .\app)"
Write-Host "LAYOUT_EXISTS: $(Test-Path .\app\layout.js)"
Write-Host "PACKAGE_EXISTS: $(Test-Path .\package.json)"
Write-Host "NEXT_EXISTS: $(Test-Path .\.next)"
Write-Host "SCRIPTS:"
if (Test-Path .\package.json) { Get-Content .\package.json | Select-String '"dev"|"build"|"start"|"lint"' }
