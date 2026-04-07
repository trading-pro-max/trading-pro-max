param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path)

$ErrorActionPreference = "Stop"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
Set-Location -LiteralPath $RepoRoot

$sync = Join-Path $RepoRoot 'scripts\powershell\sync-secrets-to-env.ps1'
if (Test-Path $sync) {
  & $sync -RepoRoot $RepoRoot
}

Remove-Item -LiteralPath (Join-Path $RepoRoot 'apps\api\.env') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $RepoRoot 'packages\db\.env') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $RepoRoot 'packages\db\prisma\.env') -Force -ErrorAction SilentlyContinue

npm.cmd install --no-audit --no-fund --legacy-peer-deps
npx.cmd prisma generate --schema packages/db/prisma/schema.prisma
npx.cmd prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss
npx.cmd tsx packages/db/src/seed.ts

Write-Host ''
Write-Host 'Trading Pro Max bootstrap completed.' -ForegroundColor Green