Set-Location "C:\Users\ahmad\Desktop\trading-pro-max-full"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$script:TPMLog = Join-Path (Get-Location) "logs\session_$stamp.log"
Start-Transcript -Path $script:TPMLog -Append | Out-Null

function prompt {
  "TPM-BRIDGE PS $((Get-Location).Path)> "
}

function tpm-status {
  Write-Host ""
  Write-Host "=== TPM STATUS ===" -ForegroundColor Cyan
  Write-Host ("PWD: " + (Get-Location).Path)
  Write-Host ("package.json: " + (Test-Path ".\package.json"))
  Write-Host ("next.config.js: " + (Test-Path ".\next.config.js"))
  Write-Host ("src\app: " + (Test-Path ".\src\app"))
  Write-Host ("src\app\control\page.tsx: " + (Test-Path ".\src\app\control\page.tsx"))
  Write-Host ("src\app\control\page.js: " + (Test-Path ".\src\app\control\page.js"))
  Write-Host ("src\app\api\control\state\route.ts: " + (Test-Path ".\src\app\api\control\state\route.ts"))
  Write-Host ("src\app\api\control\state\route.js: " + (Test-Path ".\src\app\api\control\state\route.js"))
  Write-Host ""
  if (Test-Path ".\package.json") {
    Write-Host "Scripts:" -ForegroundColor Yellow
    (Get-Content ".\package.json" -Raw | ConvertFrom-Json).scripts | Format-List | Out-String | Write-Host
  }
}

function tpm-tree {
  if (Test-Path ".\src") {
    Get-ChildItem ".\src" -Recurse -File | Select-Object -ExpandProperty FullName
  } else {
    Write-Host "src missing" -ForegroundColor Red
  }
}

function tpm-build {
  npm run build
}

function tpm-dev {
  npm run dev
}

function tpm-health {
  try {
    (Invoke-WebRequest "http://localhost:3000/api/health" -UseBasicParsing).Content
  } catch {
    $_.Exception.Message
  }
}

function tpm-control {
  try {
    (Invoke-WebRequest "http://localhost:3000/api/control/state" -UseBasicParsing).Content
  } catch {
    $_.Exception.Message
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " TPM AI BRIDGE READY" -ForegroundColor Green
Write-Host (" Session Log: " + $script:TPMLog) -ForegroundColor Green
Write-Host " Commands: tpm-status | tpm-tree | tpm-build | tpm-dev | tpm-health | tpm-control" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
