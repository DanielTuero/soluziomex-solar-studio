param([switch]$OpenApp)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$appUrl = "http://localhost:3100"
$databasePath = Join-Path $projectRoot "data\solar-studio.db"
$standardLog = Join-Path $projectRoot ".solar-studio-launch.log"
$errorLog = Join-Path $projectRoot ".solar-studio-launch.err.log"
$buildIdPath = Join-Path $projectRoot ".next\BUILD_ID"
$buildVersionPath = Join-Path $projectRoot ".next\solar-studio-commit"
$appProfilePath = Join-Path $env:LOCALAPPDATA "Soluziomex\Solar Studio\Chrome Profile"
$appPidPath = Join-Path $env:LOCALAPPDATA "Soluziomex\Solar Studio\solar-studio.pid"

function Get-ChromePath {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
  )
  return $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
}

function Get-SolarStudioAppProcess {
  if (-not (Test-Path -LiteralPath $appPidPath)) { return $null }
  $storedPid = (Get-Content -LiteralPath $appPidPath -Raw).Trim()
  if ($storedPid -notmatch '^\d+$') { return $null }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$storedPid" -ErrorAction SilentlyContinue
  if ($process -and $process.Name -eq "chrome.exe" -and $process.CommandLine -like "*$appProfilePath*") { return $process }
  return $null
}

function Stop-ProcessTree([int]$RootProcessId) {
  $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $RootProcessId }
  foreach ($child in $children) { Stop-ProcessTree -RootProcessId $child.ProcessId }
  Stop-Process -Id $RootProcessId -Force -ErrorAction SilentlyContinue
}

function Focus-SolarStudioApp([int]$ProcessId) {
  $shell = New-Object -ComObject WScript.Shell
  if ($shell.AppActivate($ProcessId)) { return $true }
  return $shell.AppActivate("Solar Studio")
}

function Resolve-ExistingApp {
  $process = Get-SolarStudioAppProcess
  if (-not $process) {
    Remove-Item -LiteralPath $appPidPath -Force -ErrorAction SilentlyContinue
    return $true
  }

  Add-Type -AssemblyName PresentationFramework
  $choice = [System.Windows.MessageBox]::Show(
    "Solar Studio is already running.`n`nYes - open the existing window`nNo - close it and continue in a new window`nCancel - leave the existing window running",
    "Solar Studio is already open",
    "YesNoCancel",
    "Information"
  )
  if ($choice -eq "Yes") {
    if (-not (Focus-SolarStudioApp -ProcessId $process.ProcessId)) {
      Stop-ProcessTree -RootProcessId $process.ProcessId
      Remove-Item -LiteralPath $appPidPath -Force -ErrorAction SilentlyContinue
      return $true
    }
    return $false
  }
  if ($choice -eq "No") {
    Stop-ProcessTree -RootProcessId $process.ProcessId
    Remove-Item -LiteralPath $appPidPath -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    return $true
  }
  return $false
}

function Start-SolarStudioApp {
  $chromePath = Get-ChromePath
  if (-not $chromePath) { throw "Google Chrome is required to open the Solar Studio desktop app." }
  New-Item -ItemType Directory -Path $appProfilePath -Force | Out-Null
  $arguments = @(
    "--user-data-dir=`"$appProfilePath`"",
    "--app=`"$appUrl/api/security/launch`"",
    "--start-maximized",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode"
  )
  $launched = Start-Process -FilePath $chromePath -ArgumentList $arguments -PassThru
  Start-Sleep -Milliseconds 750
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($launched.Id)" -ErrorAction SilentlyContinue
  if (-not $process) {
    $process = Get-CimInstance Win32_Process |
      Where-Object { $_.Name -eq "chrome.exe" -and $_.CommandLine -like "*$appProfilePath*" -and $_.CommandLine -like "*--app=*" } |
      Select-Object -First 1
  }
  if (-not $process) { throw "Solar Studio could not open its app window." }
  New-Item -ItemType Directory -Path (Split-Path -Parent $appPidPath) -Force | Out-Null
  Set-Content -LiteralPath $appPidPath -Value $process.ProcessId -NoNewline
}

function Test-SolarStudio {
  try {
    $response = Invoke-WebRequest -Uri "$appUrl/api/security/status" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Stop-SolarStudio {
  $listener = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalAddress -eq "::" } |
    Select-Object -First 1
  if (-not $listener) { return }

  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  if ($process.Name -ne "node.exe" -or $process.CommandLine -notlike "*$projectRoot*next*start*3100*") {
    throw "Port 3100 is being used by another application. Solar Studio will not stop it."
  }
  Stop-Process -Id $listener.OwningProcess -Force
  Start-Sleep -Milliseconds 750
}

try {
  Set-Location $projectRoot

  if ($OpenApp -and -not (Resolve-ExistingApp)) { return }

  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js and npm are required to launch Solar Studio."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "Solar Studio dependencies could not be installed." }
  }

  & npm.cmd run db:setup
  if ($LASTEXITCODE -ne 0) { throw "The Solar Studio database could not be prepared." }

  $currentCommit = & git rev-parse HEAD 2>$null | Select-Object -First 1
  $currentCommit = if ($currentCommit) { $currentCommit.Trim() } else { "" }
  $builtCommit = if (Test-Path -LiteralPath $buildVersionPath) { (Get-Content -LiteralPath $buildVersionPath -Raw).Trim() } else { "" }
  $needsBuild = -not (Test-Path -LiteralPath $buildIdPath) -or -not $currentCommit -or $builtCommit -ne $currentCommit

  if ($needsBuild) {
    if (Test-SolarStudio) { Stop-SolarStudio }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Solar Studio could not prepare its local application files." }
    if ($currentCommit) { Set-Content -LiteralPath $buildVersionPath -Value $currentCommit -NoNewline }
  }

  if (-not (Test-SolarStudio)) {
    Remove-Item -LiteralPath $standardLog, $errorLog -Force -ErrorAction SilentlyContinue
    Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "start") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $standardLog -RedirectStandardError $errorLog

    $ready = $false
    foreach ($attempt in 1..45) {
      Start-Sleep -Seconds 1
      if (Test-SolarStudio) { $ready = $true; break }
    }
    if (-not $ready) { throw "Solar Studio did not finish starting. Please check .solar-studio-launch.err.log in the Solar Studio folder." }
  }

  if ($OpenApp) { Start-SolarStudioApp }

} catch {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($_.Exception.Message, "Solar Studio", "OK", "Error") | Out-Null
}
