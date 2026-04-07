param([string]$Cmd="run",[string]$Msg="chore: auto control run")

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $RepoRoot

function Test-Port([int]$Port){
  try{
    $c=New-Object System.Net.Sockets.TcpClient
    $a=$c.BeginConnect("127.0.0.1",$Port,$null,$null)
    $ok=$a.AsyncWaitHandle.WaitOne(1000,$false) -and $c.Connected
    $c.Close()
    return $ok
  }catch{
    return $false
  }
}

function Run-File([string]$Path){
  if(Test-Path $Path){
    powershell -ExecutionPolicy Bypass -File $Path
  }
}

function Status {
  $api=Test-Port 8787
  $web=Test-Port 5173
  $desktop=Test-Port 5175
  $url=""
  if(Test-Path ".\runtime\public-url.txt"){ $url=(Get-Content ".\runtime\public-url.txt" -Raw).Trim() }

  Write-Host ""
  Write-Host ("API      : " + $(if($api){"RUNNING"}else{"DOWN"}))
  Write-Host ("WEB      : " + $(if($web){"RUNNING"}else{"DOWN"}))
  Write-Host ("DESKTOP  : " + $(if($desktop){"RUNNING"}else{"DOWN"}))
  Write-Host ("PUBLIC   : " + $(if($url){$url}else{"NOT READY"}))
  Write-Host ""
}

function Fix {
  if(-not (Test-Port 8787)){
    Run-File ".\STOP-TRADING-PRO-MAX.ps1"
    Start-Sleep -Seconds 2
    Run-File ".\RUN-TRADING-PRO-MAX.ps1"
    Start-Sleep -Seconds 10
  }

  if(-not (Test-Port 5173)){
    Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',"Set-Location -LiteralPath '$RepoRoot'; npm.cmd run dev -w apps/web" | Out-Null
    Start-Sleep -Seconds 8
  }

  if(-not (Test-Path ".\runtime\public-url.txt")){
    if(Test-Path ".\PUBLIC-DEPLOY.ps1"){
      Run-File ".\PUBLIC-DEPLOY.ps1"
    }
  }

  Status
}

function Push([string]$Message){
  git add .
  git commit -m $Message 2>$null
  git push
}

switch($Cmd.ToLower()){
  "status" { Status }
  "fix"    { Fix }
  "push"   { Push $Msg }
  "run"    { Fix; Push $Msg }
  default  { Write-Host "use: status | fix | push | run" }
}