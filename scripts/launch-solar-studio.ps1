$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$appUrl = "http://localhost:3100"
$databasePath = Join-Path $projectRoot "data\solar-studio.db"
$standardLog = Join-Path $projectRoot ".solar-studio-launch.log"
$errorLog = Join-Path $projectRoot ".solar-studio-launch.err.log"
$buildIdPath = Join-Path $projectRoot ".next\BUILD_ID"
$buildVersionPath = Join-Path $projectRoot ".next\solar-studio-commit"

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

} catch {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($_.Exception.Message, "Solar Studio", "OK", "Error") | Out-Null
}
