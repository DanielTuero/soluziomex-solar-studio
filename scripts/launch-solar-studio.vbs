Option Explicit

Dim shell, files, scriptDirectory, projectRoot, powerShellScript, startingPage, command
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")

scriptDirectory = files.GetParentFolderName(WScript.ScriptFullName)
projectRoot = files.GetParentFolderName(scriptDirectory)
powerShellScript = files.BuildPath(scriptDirectory, "launch-solar-studio.ps1")
startingPage = files.BuildPath(scriptDirectory, "solar-studio-starting.html")

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & powerShellScript & Chr(34)
shell.Run command, 0, False
shell.Run Chr(34) & startingPage & Chr(34), 1, False
