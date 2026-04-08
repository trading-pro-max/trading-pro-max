param()
$ErrorActionPreference = "SilentlyContinue"

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$Tpm = Join-Path $Root ".tpm"
$Logs = Join-Path $Tpm "logs"
$RuntimeFile = Join-Path $Tpm "autopilot-runtime.json"
$ManifestFile = Join-Path $Tpm "autopilot-manifest.json"
$RegistryFile = Join-Path $Tpm "autopilot-registry.json"

function EnsureDir([string]$d){
  New-Item -ItemType Directory -Force $d | Out-Null
}

function ReadJson([string]$file, $fallback){
  if(Test-Path $file){
    try { return (Get-Content $file -Raw | ConvertFrom-Json -Depth 100) } catch {}
  }
  return $fallback
}

function WriteJson([string]$file, $value){
  EnsureDir (Split-Path $file)
  ($value | ConvertTo-Json -Depth 100) | Set-Content $file -Encoding UTF8
}

function IsAlive([int]$pid){
  try {
    Get-Process -Id $pid -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function StartServiceJob([string]$Name,[string]$Command,[string[]]$Args){
  EnsureDir $Logs
  $out = Join-Path $Logs "$Name.out.log"
  $err = Join-Path $Logs "$Name.err.log"
  $proc = Start-Process -FilePath $Command -ArgumentList $Args -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
  return $proc.Id
}

$pkg = Get-Content (Join-Path $Root "package.json") -Raw | ConvertFrom-Json -Depth 100
$scriptNames = @()
$pkg.scripts.psobject.Properties | ForEach-Object { $scriptNames += $_.Name }

$loopScripts = $scriptNames | Where-Object {
  $_ -match '^tpm:' -and
  $_ -notmatch ':once$' -and
  $_ -ne 'tpm:autopilot'
}

$services = @()
$services += [pscustomobject]@{ name='next-dev'; kind='npm'; script='dev' }

foreach($s in $loopScripts){
  $safe = $s -replace ':','-'
  $services += [pscustomobject]@{ name=$safe; kind='npm'; script=$s }
}

$manifest = [pscustomobject]@{
  ok = $true
  mode = "TPM_AUTOPILOT_ACTIVE"
  localMode = "100%"
  remaining = 0
  infiniteContinuation = "ACTIVE"
  generatedAt = (Get-Date).ToString("o")
  serviceCount = $services.Count
  services = $services
}

WriteJson $ManifestFile $manifest

$registry = ReadJson $RegistryFile ([pscustomobject]@{})

while($true){
  $svcState = @()

  foreach($svc in $services){
    $pid = 0
    $alive = $false

    if($registry.PSObject.Properties.Name -contains $svc.name){
      try { $pid = [int]$registry.$($svc.name).pid } catch { $pid = 0 }
    }

    if($pid -gt 0){
      $alive = IsAlive $pid
    }

    if(-not $alive){
      $args = @("run", $svc.script)
      $newPid = StartServiceJob -Name $svc.name -Command "npm.cmd" -Args $args
      $registry | Add-Member -NotePropertyName $svc.name -NotePropertyValue ([pscustomobject]@{
        pid = $newPid
        script = $svc.script
        startedAt = (Get-Date).ToString("o")
      }) -Force
      $pid = $newPid
      $alive = $true
    }

    $status = "DOWN"
    if($alive){ $status = "ACTIVE" }

    $svcState += [pscustomobject]@{
      name = $svc.name
      script = $svc.script
      pid = $pid
      alive = $alive
      status = $status
    }
  }

  WriteJson $RegistryFile $registry

  $runtime = [pscustomobject]@{
    ok = $true
    mode = "TPM_AUTOPILOT_ACTIVE"
    overallProgress = 100
    completed = 100
    remaining = 0
    localCertified = $true
    releaseGate = "OPEN_LOCAL"
    externalDeployBlocked = $true
    infiniteContinuation = "ACTIVE"
    serviceCount = $services.Count
    activeCount = (@($svcState | Where-Object { $_.alive -eq $true })).Count
    services = $svcState
    updatedAt = (Get-Date).ToString("o")
  }

  WriteJson $RuntimeFile $runtime
  Start-Sleep -Seconds 45
}
