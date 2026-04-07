param(
  [ValidateSet("STATUS","CLEAN","DEV","REBOOT","JUMP")]
  [string]$Command = "STATUS",
  [string]$Name = ""
)

$ProjectPath = "C:\Users\ahmad\Desktop\trading-pro-max-full"
Set-Location $ProjectPath

switch ($Command) {
  "STATUS" {
    & "$PSScriptRoot\tpm-status.ps1" -ProjectPath $ProjectPath
    break
  }

  "CLEAN" {
    & "$PSScriptRoot\tpm-clean.ps1" -ProjectPath $ProjectPath
    break
  }

  "DEV" {
    & "$PSScriptRoot\tpm-dev.ps1" -ProjectPath $ProjectPath
    break
  }

  "REBOOT" {
    & "$PSScriptRoot\tpm-clean.ps1" -ProjectPath $ProjectPath
    & "$PSScriptRoot\tpm-dev.ps1" -ProjectPath $ProjectPath
    break
  }

  "JUMP" {
    if ([string]::IsNullOrWhiteSpace($Name)) {
      Write-Host "JUMP_NAME_REQUIRED"
      exit 1
    }

    $candidates = @(
      (Join-Path $PSScriptRoot ("jump-" + $Name + ".ps1")),
      (Join-Path $PSScriptRoot ($Name + ".ps1")),
      (Join-Path (Join-Path $PSScriptRoot "jumps") ("jump-" + $Name + ".ps1")),
      (Join-Path (Join-Path $PSScriptRoot "jumps") ($Name + ".ps1"))
    )

    $file = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $file) {
      Write-Host "JUMP_NOT_FOUND: $Name"
      exit 1
    }

    & $file
    break
  }
}
