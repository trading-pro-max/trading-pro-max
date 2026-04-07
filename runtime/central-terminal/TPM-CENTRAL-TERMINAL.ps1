$repo = "C:\Users\ahmad\Desktop\trading-pro-max-full"
$log  = Join-Path $repo "runtime\central-terminal\central.log"
Set-Location $repo

function W($m){
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m
  $line | Tee-Object -FilePath $log -Append
}

function Stop-Port($p){
  try{
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  }catch{}
}

function Start-TPM {
  W "START_TPM"
  Stop-Port 3000
  Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',"cd '$repo'; npm run dev" | Out-Null
  Start-Sleep 10
  try{
    $r = Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    W ("WEB=" + $r.StatusCode)
  }catch{
    W "WEB=DOWN"
  }
}

function Check-TPM {
  W "CHECK_TPM"
  $urls = @(
    "http://localhost:3000",
    "http://localhost:3000/api/health",
    "http://localhost:3000/api/auth/session",
    "http://localhost:3000/api/signals",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/launch"
  )
  foreach($u in $urls){
    try{
      $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 10
      W ("OK " + $r.StatusCode + " " + $u)
    }catch{
      $code = ""
      try{$code = $_.Exception.Response.StatusCode.value__}catch{}
      W ("FAIL " + $code + " " + $u)
    }
  }
}

function Build-TPM {
  W "BUILD_TPM"
  Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',"cd '$repo'; npm run build" -Wait
  W "BUILD_DONE"
}

function Open-TPM {
  W "OPEN_TPM"
  Start-Process "http://localhost:3000"
}

function Reset-TPM {
  W "RESET_TPM"
  Stop-Process -Name node -Force -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
  W "RESET_DONE"
}

function Status-TPM {
  W "STATUS_TPM"
  try{
    $r = Invoke-WebRequest "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
    $r.Content | Tee-Object -FilePath $log -Append
  }catch{
    W "STATUS_UNAVAILABLE"
  }
}

while($true){
  Clear-Host
  Write-Host "========================================="
  Write-Host "      TPM CENTRAL TERMINAL EMULATOR      "
  Write-Host "========================================="
  Write-Host "1  START PLATFORM"
  Write-Host "2  CHECK WORKFLOW"
  Write-Host "3  BUILD PROJECT"
  Write-Host "4  OPEN PLATFORM"
  Write-Host "5  RESET RUNTIME"
  Write-Host "6  STATUS"
  Write-Host "7  EXIT"
  Write-Host "========================================="
  $c = Read-Host "SELECT"
  switch($c){
    '1' { Start-TPM; Pause }
    '2' { Check-TPM; Pause }
    '3' { Build-TPM; Pause }
    '4' { Open-TPM; Pause }
    '5' { Reset-TPM; Pause }
    '6' { Status-TPM; Pause }
    '7' { break }
    default { W "INVALID_OPTION"; Start-Sleep 1 }
  }
}
