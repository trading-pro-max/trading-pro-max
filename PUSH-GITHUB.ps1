param(
  [string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$Message = "chore: update Trading Pro Max backbone"
)

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath $RepoRoot
git add .
git commit -m $Message 2>$null
git push