param([string]$ProjectPath="C:\Users\ahmad\Desktop\trading-pro-max-full",[int]$IntervalSec=120)
$ErrorActionPreference="SilentlyContinue"
Set-Location $ProjectPath

function Ensure-Dir([string]$Path){ New-Item -ItemType Directory -Force $Path | Out-Null }
function Read-Env([string]$File){
  $map=@{}
  if(Test-Path $File){
    Get-Content $File | ForEach-Object {
      $line=$_.Trim()
      if($line -and -not $line.StartsWith("#") -and $line -match '^\s*([^=]+?)\s*=\s*(.*)\s*$'){
        $map[$matches[1].Trim()]=$matches[2].Trim().Trim('"').Trim("'")
      }
    }
  }
  return $map
}
function Write-Json([string]$File,$Value){
  $dir=Split-Path $File
  if($dir){ Ensure-Dir $dir }
  $Value | ConvertTo-Json -Depth 30 | Set-Content $File -Encoding UTF8
}
function Has-Cmd([string]$Name){ [bool](Get-Command $Name -ErrorAction SilentlyContinue) }
function Test-GhAuth(){ if(Has-Cmd 'gh'){ try{ gh auth status *> $null; return $true }catch{} }; return $false }
function Test-VercelAuth(){ if(Has-Cmd 'vercel'){ try{ vercel whoami *> $null; return $true }catch{} }; return $false }
function Run-NpmIfExists([string]$ScriptName){
  try{
    $pkg=Get-Content ".\package.json" -Raw | ConvertFrom-Json
    if($pkg.scripts.$ScriptName){ npm run $ScriptName | Out-Null; return $true }
  }catch{}
  return $false
}
function Git-Sync{
  if(Test-Path ".git"){
    try{
      git add -A | Out-Null
      $changed=$true
      try{ git diff --cached --quiet; $changed=$false }catch{ $changed=$true }
      if($changed){
        try{ git commit -m "tpm: universal autobind sync" 2>$null | Out-Null }catch{}
        if(Test-GhAuth()){ try{ git push origin main 2>$null | Out-Null }catch{} }
      }
      return $changed
    }catch{}
  }
  return $false
}

Ensure-Dir ".\.tpm"
Set-Content ".\.tpm\universal-autobind.pid" $PID -Encoding UTF8

$envMap=Read-Env ".\.env.connectors"
$prodMap=Read-Env ".\.env.production"

$state=[pscustomobject]@{
  ok=$true
  mode="FULL_AUTOMATIC_UNIVERSAL_AUTOBIND"
  project="Trading Pro Max"
  github=[pscustomobject]@{
    auth=(Test-GhAuth)
    pushReady=(Test-Path ".git")
  }
  vercel=[pscustomobject]@{
    auth=(Test-VercelAuth)
  }
  godaddy=[pscustomobject]@{
    sftpReady=(![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_HOST"])) -and (![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_USER"])) -and (![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_PASSWORD"]))
    host=$envMap["GODADDY_SFTP_HOST"]
    user=$envMap["GODADDY_SFTP_USER"]
  }
  ssh=[pscustomobject]@{
    ready=(Test-Path "$HOME\.ssh\id_ed25519") -and (Test-Path "$HOME\.ssh\id_ed25519.pub")
  }
  production=[pscustomobject]@{
    ready=(![string]::IsNullOrWhiteSpace($prodMap["PROD_HOST"])) -and (![string]::IsNullOrWhiteSpace($prodMap["PROD_USER"])) -and (![string]::IsNullOrWhiteSpace($prodMap["PROD_PATH"]))
    host=$prodMap["PROD_HOST"]
    user=$prodMap["PROD_USER"]
    path=$prodMap["PROD_PATH"]
  }
  telegram=[pscustomobject]@{
    ready=(![string]::IsNullOrWhiteSpace($envMap["TELEGRAM_BOT_TOKEN"])) -and (![string]::IsNullOrWhiteSpace($envMap["TELEGRAM_CHAT_ID"]))
  }
  openai=[pscustomobject]@{
    ready=![string]::IsNullOrWhiteSpace($envMap["OPENAI_API_KEY"])
  }
  ibkr=[pscustomobject]@{
    ready=![string]::IsNullOrWhiteSpace($envMap["IBKR_HOST"])
    host=$envMap["IBKR_HOST"]
    port=$envMap["IBKR_PORT"]
  }
  pushed=$false
  cycleAt=(Get-Date).ToString("o")
}
Write-Json ".\.tpm\universal-autobind.json" $state

while($true){
  Run-NpmIfExists "tpm:master" | Out-Null
  Run-NpmIfExists "tpm:remote" | Out-Null
  Run-NpmIfExists "tpm:prodprep" | Out-Null

  $envMap=Read-Env ".\.env.connectors"
  $prodMap=Read-Env ".\.env.production"

  $state.github.auth=Test-GhAuth
  $state.github.pushReady=(Test-Path ".git")
  $state.vercel.auth=Test-VercelAuth
  $state.godaddy.sftpReady=(![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_HOST"])) -and (![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_USER"])) -and (![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_PASSWORD"]))
  $state.godaddy.host=$envMap["GODADDY_SFTP_HOST"]
  $state.godaddy.user=$envMap["GODADDY_SFTP_USER"]
  $state.ssh.ready=(Test-Path "$HOME\.ssh\id_ed25519") -and (Test-Path "$HOME\.ssh\id_ed25519.pub")
  $state.production.ready=(![string]::IsNullOrWhiteSpace($prodMap["PROD_HOST"])) -and (![string]::IsNullOrWhiteSpace($prodMap["PROD_USER"])) -and (![string]::IsNullOrWhiteSpace($prodMap["PROD_PATH"]))
  $state.production.host=$prodMap["PROD_HOST"]
  $state.production.user=$prodMap["PROD_USER"]
  $state.production.path=$prodMap["PROD_PATH"]
  $state.telegram.ready=(![string]::IsNullOrWhiteSpace($envMap["TELEGRAM_BOT_TOKEN"])) -and (![string]::IsNullOrWhiteSpace($envMap["TELEGRAM_CHAT_ID"]))
  $state.openai.ready=![string]::IsNullOrWhiteSpace($envMap["OPENAI_API_KEY"])
  $state.ibkr.ready=![string]::IsNullOrWhiteSpace($envMap["IBKR_HOST"])
  $state.ibkr.host=$envMap["IBKR_HOST"]
  $state.ibkr.port=$envMap["IBKR_PORT"]
  $state.pushed=Git-Sync
  $state.cycleAt=(Get-Date).ToString("o")

  Write-Json ".\.tpm\universal-autobind.json" $state
  Start-Sleep -Seconds ([Math]::Max(60,$IntervalSec))
}
