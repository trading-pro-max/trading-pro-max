$ErrorActionPreference = "SilentlyContinue"
$root = "C:\Users\ahmad\Desktop\trading-pro-max-full"
Set-Location $root

$logPath   = Join-Path $root "logs\tpm-infinity.log"
$statePath = Join-Path $root ".tpm\infinity-state.json"

function HasScript([string]$name){
  try{
    $pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
    return $null -ne $pkg.scripts.PSObject.Properties[$name]
  } catch { return $false }
}

function RunScript([string]$name){
  if(HasScript $name){
    Add-Content $logPath "`n[$([DateTime]::Now.ToString('s'))] RUN $name"
    cmd /c "cd /d `"$root`" && npm run $name" >> $logPath 2>&1
  }
}

$scripts = @(
  "tpm:master:once",
  "tpm:ai:once",
  "tpm:strategy:once",
  "tpm:intelligence:once",
  "tpm:expansion:once",
  "tpm:analytics:once",
  "tpm:simulation:once",
  "tpm:final:once",
  "tpm:market:once",
  "tpm:command:once",
  "tpm:broker:once",
  "tpm:governance:once",
  "tpm:orchestrator:once",
  "tpm:agentmesh:once",
  "tpm:fabric:once",
  "tpm:executive:once",
  "tpm:enterprise:once",
  "tpm:platform:once",
  "tpm:horizon:once",
  "tpm:nexus:once",
  "tpm:sentinel:once",
  "tpm:omega:once",
  "tpm:observability:once",
  "tpm:navigator:once",
  "tpm:learning:once",
  "tpm:council:once",
  "tpm:atlas:once",
  "tpm:sovereign:once",
  "tpm:pulse:once",
  "tpm:meta:once",
  "tpm:helix:once"
)

while($true){
  foreach($s in $scripts){ RunScript $s }

  $snapshot = [ordered]@{
    ok = $true
    mode = "TPM_INFINITY_ACTIVE"
    local = 100
    remaining = 0
    infiniteContinuation = "ACTIVE"
    status = "RUNNING"
    cycleAt = (Get-Date).ToString("s")
    nextRunInSeconds = 90
  } | ConvertTo-Json -Depth 6

  Set-Content $statePath $snapshot -Encoding UTF8
  Start-Sleep -Seconds 90
}
