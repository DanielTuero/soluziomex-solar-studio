$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$appUrl = "http://localhost:3100"
$databasePath = Join-Path $projectRoot "data\solar-studio.db"
$standardLog = Join-Path $projectRoot ".solar-studio-launch.log"
$errorLog = Join-Path $projectRoot ".solar-studio-launch.err.log"

function Test-SolarStudio {
  try {
    $response = Invoke-WebRequest -Uri "$appUrl/api/security/status" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
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

  if (-not (Test-Path -LiteralPath $databasePath)) {
    & npm.cmd run db:setup
    if ($LASTEXITCODE -ne 0) { throw "The Solar Studio database could not be prepared." }
  }

  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot ".next\BUILD_ID"))) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Solar Studio could not prepare its local application files." }
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
