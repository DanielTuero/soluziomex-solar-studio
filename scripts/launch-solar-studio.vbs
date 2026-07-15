Option Explicit

Dim shell, files, scriptDirectory, projectRoot, powerShellScript, command
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")

scriptDirectory = files.GetParentFolderName(WScript.ScriptFullName)
projectRoot = files.GetParentFolderName(scriptDirectory)
powerShellScript = files.BuildPath(scriptDirectory, "launch-solar-studio.ps1")

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & powerShellScript & Chr(34) & " -OpenApp"
shell.Run command, 0, False
