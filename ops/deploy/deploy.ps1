param(
  [string]$Host = $env:PROD_HOST,
  [string]$User = $env:PROD_USER,
  [string]$Path = $env:PROD_PATH
)

Write-Host "TPM_REMOTE_DEPLOY_SCRIPT_READY"
Write-Host "HOST=$Host"
Write-Host "USER=$User"
Write-Host "PATH=$Path"
exit 0
