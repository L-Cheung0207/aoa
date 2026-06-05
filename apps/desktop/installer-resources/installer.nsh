!include LogicLib.nsh

!define VOICE_UNINSTALL_REGISTRY_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
!define VOICE_UNINSTALL_FILENAME "Uninstall ${PRODUCT_FILENAME}.exe"

!ifndef BUILD_UNINSTALLER
Var VoiceCreateDesktopShortcut
Var VoiceLaunchAtLogin

!macro customCheckAppRunning
  Push $0
  Push $1
  Push $2
  Push $3

  DetailPrint "Closing running ${PRODUCT_NAME}..."
  StrCpy $0 "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"
  IfFileExists "$0" 0 voice_check_taskkill

  System::Call 'kernel32::SetEnvironmentVariable(t"VOICE_INSTALL_DIR", t"$INSTDIR")'
  System::Call 'kernel32::SetEnvironmentVariable(t"VOICE_EXE_NAME", t"${APP_EXECUTABLE_FILENAME}")'
  nsExec::ExecToStack `"$0" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$$ErrorActionPreference='SilentlyContinue'; $$d=[IO.Path]::GetFullPath($$env:VOICE_INSTALL_DIR).TrimEnd('\'); $$n=$$env:VOICE_EXE_NAME; function vp { @(Get-CimInstance Win32_Process | Where-Object { $$_.ProcessId -ne $$PID -and (($$_.Name -ieq $$n) -or ($$_.ExecutablePath -and [IO.Path]::GetFullPath($$_.ExecutablePath).StartsWith($$d,[StringComparison]::OrdinalIgnoreCase))) }) }; $$deadline=(Get-Date).AddSeconds(8); while((Get-Date) -lt $$deadline){ $$ps=vp; if($$ps.Count -eq 0){ exit 0 }; foreach($$proc in $$ps){ $$p=Get-Process -Id $$proc.ProcessId; if($$p -and $$p.MainWindowHandle -ne 0){ [void]$$p.CloseMainWindow() } }; Start-Sleep -Milliseconds 500 }; $$deadline=(Get-Date).AddSeconds(25); while((Get-Date) -lt $$deadline){ $$ps=vp; if($$ps.Count -eq 0){ exit 0 }; foreach($$proc in $$ps){ Stop-Process -Id $$proc.ProcessId -Force }; Start-Sleep -Milliseconds 500 }; if((vp).Count -eq 0){ exit 0 }; exit 1"`
  Pop $1
  Pop $2
  ${If} $1 == 0
    Goto voice_check_done
  ${EndIf}

voice_check_taskkill:
  StrCpy $3 0

voice_check_taskkill_loop:
  IntOp $3 $3 + 1
  nsExec::ExecToStack `"$SYSDIR\cmd.exe" /C taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $1
  Pop $2
  Sleep 1000
  nsExec::ExecToStack `"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO CSV | "$SYSDIR\find.exe" "${APP_EXECUTABLE_FILENAME}"`
  Pop $1
  Pop $2
  ${If} $1 != 0
    Goto voice_check_done
  ${EndIf}
  ${If} $3 < 20
    Goto voice_check_taskkill_loop
  ${EndIf}

  ${If} $1 == 0
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Voice Assistant could not be closed automatically. Exit it from the tray or Task Manager, then click Retry." IDRETRY voice_check_taskkill
    Quit
  ${EndIf}

voice_check_done:
  System::Call 'kernel32::SetEnvironmentVariable(t"VOICE_INSTALL_DIR", p0)'
  System::Call 'kernel32::SetEnvironmentVariable(t"VOICE_EXE_NAME", p0)'
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend

!macro customInit
  !ifndef INSTALL_MODE_PER_ALL_USERS
    !insertmacro setInstallModePerUser
  !endif
  Call VoiceReadShellOptions
  Call VoiceRepairLegacyUninstallRegistry
!macroend

!macro customInstall
  ${If} $VoiceCreateDesktopShortcut == "1"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${EndIf}
  Call VoiceWriteInstallOptions
!macroend
!endif

!macro customUnInit
  ${IfNot} ${Silent}
    IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 +3
      Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall'
      Quit
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$newDesktopLink"
  Delete "$SMSTARTUP\${SHORTCUT_NAME}.lnk"
!macroend

!ifndef BUILD_UNINSTALLER
Function VoiceReadShellOptions
  ReadEnvStr $0 "VOICE_CREATE_DESKTOP_SHORTCUT"
  ${If} $0 == "0"
    StrCpy $VoiceCreateDesktopShortcut "0"
  ${Else}
    StrCpy $VoiceCreateDesktopShortcut "1"
  ${EndIf}

  ReadEnvStr $0 "VOICE_LAUNCH_AT_LOGIN"
  ${If} $0 == "0"
    StrCpy $VoiceLaunchAtLogin "false"
  ${Else}
    StrCpy $VoiceLaunchAtLogin "true"
  ${EndIf}
FunctionEnd

Function VoiceWriteInstallOptions
  CreateDirectory "$INSTDIR\resources"
  ClearErrors
  FileOpen $0 "$INSTDIR\resources\install-options.json" w
  IfErrors voice_write_install_options_done
  FileWrite $0 '{"appBehavior":{"launchAtLogin":'
  FileWrite $0 "$VoiceLaunchAtLogin"
  FileWrite $0 '}}'
  FileClose $0

voice_write_install_options_done:
FunctionEnd
!endif

!ifndef BUILD_UNINSTALLER
Function VoiceRepairLegacyUninstallRegistry
  Push $0
  Push $1
  Push $2

  ReadRegStr $0 SHELL_CONTEXT "${VOICE_UNINSTALL_REGISTRY_KEY}" UninstallString
  StrCpy $1 '"$INSTDIR\${PRODUCT_FILENAME}.exe" --uninstall'
  ${If} $0 == $1
    StrCpy $2 "$INSTDIR\${VOICE_UNINSTALL_FILENAME}"
    IfFileExists "$2" 0 voice_repair_done
    DetailPrint "Repairing legacy ${PRODUCT_NAME} uninstall registry entry..."
    WriteRegStr SHELL_CONTEXT "${VOICE_UNINSTALL_REGISTRY_KEY}" UninstallString '"$2" /currentuser'
    WriteRegStr SHELL_CONTEXT "${VOICE_UNINSTALL_REGISTRY_KEY}" QuietUninstallString '"$2" /currentuser /S'
  ${EndIf}

voice_repair_done:
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
!endif
