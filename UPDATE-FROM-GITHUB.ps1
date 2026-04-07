param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

git pull --rebase
Write-Host ''
Write-Host 'Repository updated from GitHub.' -ForegroundColor Green