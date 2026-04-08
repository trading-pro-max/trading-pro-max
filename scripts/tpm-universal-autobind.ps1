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
        $k=$matches[1].Trim()
        $v=$matches[2].Trim().Trim('"').Trim("'")
        $map[$k]=$v
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
function Has-Cmd([string]$Name){ return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }
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
$pidFile=".\.tpm\universal-autobind.pid"
Set-Content $pidFile $PID -Encoding UTF8

while($true){
  $envMap=Read-Env ".\.env.connectors"
  $prodMap=Read-Env ".\.env.production"

  $githubAuth=Test-GhAuth
  $vercelAuth=Test-VercelAuth
  $sshReady=(Test-Path "$HOME\.ssh\id_ed25519") -and (Test-Path "$HOME\.ssh\id_ed25519.pub")
  $godaddySftpReady=(![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_HOST"])) -and (![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_USER"])) -and (![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_PASSWORD"]))
  $telegramReady=(![string]::IsNullOrWhiteSpace($envMap["TELEGRAM_BOT_TOKEN"])) -and (![string]::IsNullOrWhiteSpace($envMap["TELEGRAM_CHAT_ID"]))
  $openaiReady=![string]::IsNullOrWhiteSpace($envMap["OPENAI_API_KEY"])
  $ibkrReady=![string]::IsNullOrWhiteSpace($envMap["IBKR_HOST"])
  $prodReady=(![string]::IsNullOrWhiteSpace($prodMap["PROD_HOST"])) -and (![string]::IsNullOrWhiteSpace($prodMap["PROD_USER"])) -and (![string]::IsNullOrWhiteSpace($prodMap["PROD_PATH"]))

  Run-NpmIfExists "tpm:master" | Out-Null
  Run-NpmIfExists "tpm:remote" | Out-Null
  Run-NpmIfExists "tpm:prodprep" | Out-Null

  $pushed=Git-Sync

  $state=[pscustomobject]@{
    ok=$true
    mode="FULL_AUTOMATIC_UNIVERSAL_AUTOBIND"
    project="Trading Pro Max"
    github=[pscustomobject]@{
      auth=$githubAuth
      pushReady=(Test-Path ".git")
    }
    vercel=[pscustomobject]@{
      auth=$vercelAuth
    }
    godaddy=[pscustomobject]@{
      sftpReady=$godaddySftpReady
      host=$envMap["GODADDY_SFTP_HOST"]
      user=$envMap["GODADDY_SFTP_USER"]
    }
    ssh=[pscustomobject]@{
      ready=$sshReady
    }
    production=[pscustomobject]@{
      ready=$prodReady
      host=$prodMap["PROD_HOST"]
      user=$prodMap["PROD_USER"]
      path=$prodMap["PROD_PATH"]
    }
    telegram=[pscustomobject]@{
      ready=$telegramReady
    }
    openai=[pscustomobject]@{
      ready=$openaiReady
    }
    ibkr=[pscustomobject]@{
      ready=$ibkrReady
      host=$envMap["IBKR_HOST"]
      port=$envMap["IBKR_PORT"]
    }
    pushed=$pushed
    cycleAt=(Get-Date).ToString("o")
  }

  Write-Json ".\.tpm\universal-autobind.json" $state
  Start-Sleep -Seconds ([Math]::Max(60,$IntervalSec))
}
