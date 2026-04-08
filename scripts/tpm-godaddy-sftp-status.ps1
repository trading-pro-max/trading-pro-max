param([string]$ProjectPath="C:\Users\ahmad\Desktop\trading-pro-max-full")
Set-Location $ProjectPath

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

$envMap=Read-Env ".\.env.connectors"
$result=[pscustomobject]@{
  ok=$true
  mode="GODADDY_SFTP_AUTODEPLOY_READY"
  host=$envMap["GODADDY_SFTP_HOST"]
  port=$envMap["GODADDY_SFTP_PORT"]
  userReady=![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_USER"])
  passwordReady=![string]::IsNullOrWhiteSpace($envMap["GODADDY_SFTP_PASSWORD"])
  remotePath=$envMap["GODADDY_SFTP_REMOTE_PATH"]
  workflow=".github/workflows/tpm-godaddy-sftp-deploy.yml"
  time=(Get-Date).ToString("o")
}
$result | ConvertTo-Json -Depth 20 | Set-Content ".\.tpm\godaddy-sftp-status.json" -Encoding UTF8
Get-Content ".\.tpm\godaddy-sftp-status.json"
