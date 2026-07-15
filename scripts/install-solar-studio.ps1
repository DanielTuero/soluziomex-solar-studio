$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  throw "The Solar Studio desktop installer currently supports Windows only."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "launch-solar-studio.vbs"
$icon = Join-Path $projectRoot "public\solar-studio.ico"
$wscript = Join-Path $env:WINDIR "System32\wscript.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"

foreach ($requiredPath in @($launcher, $icon, $wscript)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Solar Studio installation is missing: $requiredPath"
  }
}

$shortcutPaths = @(
  (Join-Path $desktop "Solar Studio.lnk"),
  (Join-Path $startMenu "Solar Studio.lnk")
)

$shell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in $shortcutPaths) {
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $wscript
  $shortcut.Arguments = "`"$launcher`""
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.IconLocation = "$icon,0"
  $shortcut.Description = "Open Solar Studio"
  $shortcut.Save()
}

$iconRefresh = Join-Path $env:WINDIR "System32\ie4uinit.exe"
if (Test-Path -LiteralPath $iconRefresh) {
  Start-Process -FilePath $iconRefresh -ArgumentList "-show" -WindowStyle Hidden -Wait
}

Write-Output "Solar Studio was added to the Desktop and Start menu."
Write-Output "Open it from the Solar Studio icon; no browser tab is required."
