param([string]$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full")

Set-Location $ProjectPath

node .\scripts\tpm-self-heal.mjs

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }

npm run dev
