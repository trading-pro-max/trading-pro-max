$ErrorActionPreference = "SilentlyContinue"
Set-Location "C:\Users\ahmad\Desktop\trading-pro-max-full"

git config credential.helper manager-core
git config pull.rebase false
git branch -M main

function Sync-GitHub {
  git add .
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { return }

  $msg = "AI auto sync " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  git commit -m $msg | Out-Null

  git fetch origin main | Out-Null
  git pull origin main --allow-unrelated-histories | Out-Null

  if ($LASTEXITCODE -ne 0) {
    git push -u origin main --force | Out-Null
  } else {
    git push -u origin main | Out-Null
  }
}

while ($true) {
  Sync-GitHub
  Start-Sleep -Seconds 20
}
