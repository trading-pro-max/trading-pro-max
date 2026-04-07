param(
  [string]$Message = "auto-sync"
)

Set-Location "C:\Users\ahmad\Desktop\trading-pro-max-full"

git add .

git commit -m $Message 2>$null

git branch -M main

git pull origin main --allow-unrelated-histories 2>$null

if ($LASTEXITCODE -ne 0) {
  git push -u origin main --force
} else {
  git push -u origin main
}
