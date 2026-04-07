param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

$syncPath = Join-Path $RepoRoot "scripts\powershell\sync-secrets-to-env.ps1"
if (Test-Path $syncPath) {
  & $syncPath -RepoRoot $RepoRoot
}

npm.cmd install --no-audit --no-fund --legacy-peer-deps
npx.cmd prisma generate --schema packages/db/prisma/schema.prisma
npx.cmd prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss
npx.cmd tsx packages/db/src/seed.ts
npm.cmd run build -w apps/web

Write-Host ""
Write-Host "Production build completed." -ForegroundColor Green
Write-Host "Web dist => apps/web/dist" -ForegroundColor Cyan