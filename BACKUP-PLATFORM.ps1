param([string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path))

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $RepoRoot "backups"
$tempDir = Join-Path $backupDir ("snapshot-" + $stamp)
$zipPath = Join-Path $backupDir ("trading-pro-max-backup-" + $stamp + ".zip")

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$pathsToCopy = @(
  "apps",
  "packages",
  "scripts",
  "docs",
  "platform",
  "runtime",
  "logs",
  "render.yaml",
  "package.json",
  "package-lock.json",
  "RUN-TRADING-PRO-MAX.ps1",
  "STOP-TRADING-PRO-MAX.ps1",
  "STATUS-TRADING-PRO-MAX.ps1",
  "ENABLE-SELF-HEAL.ps1",
  "DISABLE-SELF-HEAL.ps1",
  "SELF-HEAL-STATUS.ps1",
  "PROD-BUILD.ps1",
  "PROD-START.ps1",
  "PROD-STOP.ps1",
  "PROD-STATUS.ps1",
  "PROD-DEPLOY.ps1",
  "OPEN-SECRETS.ps1",
  "PUSH-GITHUB.ps1",
  ".gitignore",
  ".env",
  "secrets"
)

foreach ($item in $pathsToCopy) {
  $source = Join-Path $RepoRoot $item
  if (Test-Path $source) {
    $target = Join-Path $tempDir $item
    $parent = Split-Path -Parent $target
    if ($parent -and -not (Test-Path $parent)) {
      New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    if ((Get-Item $source).PSIsContainer) {
      Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
    } else {
      Copy-Item -LiteralPath $source -Destination $target -Force
    }
  }
}

Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Backup completed.' -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Cyan