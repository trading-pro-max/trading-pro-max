$ErrorActionPreference = "SilentlyContinue"

function Test-Url($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    return @{
      ok = $true
      code = $r.StatusCode
      url = $url
      body = $r.Content
    }
  } catch {
    $code = $null
    try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
    return @{
      ok = $false
      code = $code
      url = $url
      body = $_.Exception.Message
    }
  }
}

function Start-App {
  Stop-Process -Name node -Force -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  $p = Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command',"cd '$PWD'; npm run dev" -PassThru
  Start-Sleep -Seconds 12
  return $p
}

$p = Start-App

$checks = @(
  Test-Url "http://localhost:3000"
  Test-Url "http://localhost:3000/api/health"
  Test-Url "http://localhost:3000/api/auth/session"
  Test-Url "http://localhost:3000/api/signals"
  Test-Url "http://localhost:3000/dashboard"
  Test-Url "http://localhost:3000/launch"
)

"================ WORKFLOW CHECK ================"
foreach ($c in $checks) {
  $status = if ($c.ok) { "OK" } else { "FAIL" }
  "$status | $($c.code) | $($c.url)"
}

"================ CONTENT CHECK ================"
$home = $checks[0].body
$health = $checks[1].body
$auth = $checks[2].body
$signals = $checks[3].body
$dashboard = $checks[4].body

"HOME_HAS_TPM=" + [bool]($home -match "Trading Pro Max")
"HEALTH_JSON=" + [bool]($health -match "LIVE_READY|ok|status")
"AUTH_ENDPOINT_EXISTS=" + [bool]($checks[2].code -ne 404)
"SIGNALS_ENDPOINT_EXISTS=" + [bool]($checks[3].code -ne 404)
"DASHBOARD_REACHABLE=" + [bool]($checks[4].code -ne 404)

"================ RAW FAIL DETAILS ================"
foreach ($c in $checks | Where-Object { -not $_.ok }) {
  "URL: $($c.url)"
  "CODE: $($c.code)"
  "ERROR: $($c.body)"
  "-----------------------------------------------"
}
