param(
  [string]$RepoPath = "C:\Users\ahmad\Desktop\trading-pro-max-full",
  [int]$IntervalSec = 120
)

Set-Location $RepoPath

$ignoreItems = @(
  ".env",
  ".env.*",
  "node_modules",
  ".next",
  "logs",
  "tmp_stripe_secret",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx"
)

if (-not (Test-Path ".gitignore")) {
  New-Item ".gitignore" -ItemType File | Out-Null
}

$existing = Get-Content ".gitignore" -ErrorAction SilentlyContinue
foreach ($item in $ignoreItems) {
  if ($existing -notcontains $item) {
    Add-Content ".gitignore" $item
  }
}

while ($true) {
  try {
    Set-Location $RepoPath
    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      $msg = "auto-sync " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
      git commit -m $msg | Out-Null
      git push origin main | Out-Null
      Add-Content ".\logs\auto-push.log" ("[" + (Get-Date -Format "s") + "] PUSH OK -> " + $msg)
    }
  } catch {
    Add-Content ".\logs\auto-push.log" ("[" + (Get-Date -Format "s") + "] ERROR -> " + $_.Exception.Message)
  }
  Start-Sleep -Seconds $IntervalSec
}
