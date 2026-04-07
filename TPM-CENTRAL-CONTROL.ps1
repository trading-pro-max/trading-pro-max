Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$Repo = 'C:\Users\ahmad\Desktop\trading-pro-max\tpm9-updated'
Set-Location $Repo

function Port($p){
  try{
    $c=New-Object Net.Sockets.TcpClient
    $a=$c.BeginConnect('127.0.0.1',$p,$null,$null)
    $ok=$a.AsyncWaitHandle.WaitOne(1200,$false) -and $c.Connected
    $c.Close()
    $ok
  }catch{$false}
}

function RunFile($f){
  if(Test-Path $f){ powershell -ExecutionPolicy Bypass -File $f }
}

function Status{
  $pub = if(Test-Path '.\runtime\public-url.txt'){(Get-Content '.\runtime\public-url.txt' -Raw).Trim()}else{'NOT READY'}
  ''
  'API     : ' + $(if(Port 8787){'RUNNING'}else{'DOWN'})
  'WEB     : ' + $(if(Port 5173){'RUNNING'}else{'DOWN'})
  'DESKTOP : ' + $(if(Port 5175){'RUNNING'}else{'DOWN'})
  'PUBLIC  : ' + $pub
  ''
}

function Fix{
  if(-not (Port 8787)){
    RunFile '.\STOP-TRADING-PRO-MAX.ps1'
    Start-Sleep 2
    RunFile '.\RUN-TRADING-PRO-MAX.ps1'
    Start-Sleep 8
  }
  if(-not (Port 5173)){
    Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command',"cd '$Repo'; npm.cmd run dev -w apps/web"
    Start-Sleep 3
  }
  Status
}

function ApiDirect{
  powershell -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '$Repo'; & .\scripts\powershell\sync-secrets-to-env.ps1; npx.cmd tsx .\apps\api\src\server.ts"
}

function WebDirect{
  cd $Repo
  npm.cmd run dev -w apps/web
}

function PublicDeploy{
  RunFile '.\PUBLIC-DEPLOY.ps1'
}

function AuthCheck{
  $body=@{email='admin@tradingpromax.local';password='admin123'}|ConvertTo-Json
  Invoke-RestMethod http://localhost:8787/api/auth/login -Method POST -ContentType 'application/json' -Body $body -SessionVariable s
  Invoke-RestMethod http://localhost:8787/api/rbac/admin-check -WebSession $s
}

function BillingCheck{
  try{ Invoke-RestMethod http://localhost:8787/api/billing/readiness | ConvertTo-Json -Depth 10 }
  catch{
    $r=$_.Exception.Response
    if($r){
      $sr=New-Object IO.StreamReader($r.GetResponseStream())
      'STATUS=' + [int]$r.StatusCode
      $sr.ReadToEnd()
    }else{
      $_.Exception.Message
    }
  }
}

function TelegramCheck{
  $body=@{email='admin@tradingpromax.local';password='admin123'}|ConvertTo-Json
  Invoke-RestMethod http://localhost:8787/api/auth/login -Method POST -ContentType 'application/json' -Body $body -SessionVariable s | Out-Null
  Invoke-RestMethod http://localhost:8787/api/notify/status -WebSession $s
}

function Push{
  git add .
  git commit -m "chore: control center update" 2>$null
  git push
}

while($true){
  Clear-Host
  '========================================'
  'TRADING PRO MAX - CENTRAL CONTROL'
  '========================================'
  Status
  '1  Status'
  '2  Fix Stack'
  '3  Run API Direct'
  '4  Run Web Direct'
  '5  Public Deploy'
  '6  Auth Check'
  '7  Billing Check'
  '8  Telegram Check'
  '9  Git Push'
  '0  Exit'
  ''
  $x = Read-Host 'Choose'
  switch($x){
    '1'{ Status; Read-Host 'Enter' }
    '2'{ Fix; Read-Host 'Enter' }
    '3'{ ApiDirect; Read-Host 'Enter' }
    '4'{ WebDirect; Read-Host 'Enter' }
    '5'{ PublicDeploy; Read-Host 'Enter' }
    '6'{ AuthCheck; Read-Host 'Enter' }
    '7'{ BillingCheck; Read-Host 'Enter' }
    '8'{ TelegramCheck; Read-Host 'Enter' }
    '9'{ Push; Read-Host 'Enter' }
    '0'{ break }
    default{ 'Invalid choice'; Start-Sleep 1 }
  }
}
