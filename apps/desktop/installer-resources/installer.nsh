!include LogicLib.nsh
!include MUI2.nsh
!include nsDialogs.nsh
!include FileFunc.nsh

!define MUI_FONT "Microsoft YaHei UI"
!define MUI_FONTSIZE "9"

SetFont "Microsoft YaHei UI" 9

!define VOICE_OPTIONS_PAGE_TITLE "安装选项"
!define VOICE_OPTIONS_PAGE_SUBTITLE "选择要启用的附加功能。"
!define VOICE_AGREEMENT_FILE "terms.txt"
!define VOICE_LICENSE_TOP_TEXT "閱讀協議內容。"
!define VOICE_LICENSE_BOTTOM_TEXT "必須接受協議才能繼續安裝 Voice Assistant。"
!define VOICE_DESKTOP_SHORTCUT_TEXT "创建桌面图标"
!define VOICE_LAUNCH_AT_LOGIN_TEXT "开机自动启动"
!define VOICE_INSTALL_DIR_REQUIRED_TEXT "请选择有效的安装位置。"
!define VOICE_DIR_NOT_WRITABLE_TEXT "当前安装位置不可写，请选择其他位置。"
!define VOICE_DISK_SPACE_UNKNOWN_TEXT "无法读取安装磁盘空间，请选择其他位置或检查磁盘状态。"
!define VOICE_DISK_SPACE_REQUIRED_TEXT "磁盘空间不足。请确保安装盘至少有 ${VOICE_MIN_FREE_SPACE_MB} MB 可用空间。"
!define VOICE_MIN_FREE_SPACE_MB 500

!define VOICE_UNINSTALL_REGISTRY_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
!define VOICE_UNINSTALL_FILENAME "Uninstall ${PRODUCT_FILENAME}.exe"

!ifndef BUILD_UNINSTALLER
Var VoiceCreateDesktopShortcut
Var VoiceLaunchAtLogin
Var VoiceDesktopShortcutCheckbox
Var VoiceLaunchAtLoginCheckbox
!endif

!macro customCheckAppRunning
  Push $0
  Push $1
  Push $2
  Push $3

  DetailPrint "Closing running ${PRODUCT_NAME}..."
  StrCpy $0 "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"
  IfFileExists "$0" 0 voice_check_taskkill

  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("VOICE_INSTALL_DIR", "$INSTDIR").r3'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("VOICE_EXE_NAME", "${APP_EXECUTABLE_FILENAME}").r3'
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
  System::Call 'Kernel32::SetEnvironmentVariable(t, p)i ("VOICE_INSTALL_DIR", 0).r3'
  System::Call 'Kernel32::SetEnvironmentVariable(t, p)i ("VOICE_EXE_NAME", 0).r3'
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend

!ifndef BUILD_UNINSTALLER
!macro customInit
  !ifndef INSTALL_MODE_PER_ALL_USERS
    !insertmacro setInstallModePerUser
  !endif
  Call VoiceReadShellOptions
  Call VoiceRepairLegacyUninstallRegistry
!macroend

!macro licensePage
  !define MUI_LICENSEPAGE_TEXT_TOP "${VOICE_LICENSE_TOP_TEXT}"
  !define MUI_LICENSEPAGE_TEXT_BOTTOM "${VOICE_LICENSE_BOTTOM_TEXT}"
  !insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\${VOICE_AGREEMENT_FILE}"
!macroend

!macro customPageAfterChangeDir
  Page custom VoiceInstallerOptionsPageCreate VoiceInstallerOptionsPageLeave
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW VoiceInstallProgressPageShow
!macroend

!macro customFinishPage
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "运行 Voice Assistant"
  !define MUI_FINISHPAGE_RUN_FUNCTION "VoiceStartAppAfterFinish"
  !insertmacro MUI_PAGE_FINISH
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

!macro customUnInstall
  Delete "$newDesktopLink"
  Delete "$SMSTARTUP\${SHORTCUT_NAME}.lnk"
  RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
  SetOutPath "$TEMP"
  RMDir "$INSTDIR"
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

Function VoiceStartAppAfterFinish
  ExecShell "open" "$INSTDIR\${PRODUCT_FILENAME}.exe"
FunctionEnd

Function VoiceInstallProgressPageShow
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  Push $8
  Push $9

  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $1 $0 1004
  ${If} $1 == 0
    Goto voice_install_progress_done
  ${EndIf}

  System::Store "S"
  System::Call 'USER32::GetClientRect(p$0,@r2)'
  System::Call '*$2(i.r3,i.r4,i.r5,i.r9)'
  System::Call 'USER32::GetWindowRect(p$1,@r2)'
  System::Call 'USER32::MapWindowPoints(p0,p$0,pr2,i2)'
  System::Call '*$2(i.r3,i.r4,i.r5,i.r6)'
  IntOp $7 $6 - $4
  IntOp $8 $9 - $7
  IntOp $8 $8 / 2
  System::Call 'USER32::SetWindowPos(p$1,p0,i$3,i$8,i0,i0,i0x15)'
  System::Store "L"

voice_install_progress_done:
  Pop $9
  Pop $8
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

Function VoiceInstallerOptionsPageCreate
  ${If} ${Silent}
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "${VOICE_OPTIONS_PAGE_TITLE}" "${VOICE_OPTIONS_PAGE_SUBTITLE}"

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateCheckbox} 0 16u 100% 12u "${VOICE_DESKTOP_SHORTCUT_TEXT}"
  Pop $VoiceDesktopShortcutCheckbox
  ${If} $VoiceCreateDesktopShortcut == "1"
    ${NSD_Check} $VoiceDesktopShortcutCheckbox
  ${EndIf}

  ${NSD_CreateCheckbox} 0 36u 100% 12u "${VOICE_LAUNCH_AT_LOGIN_TEXT}"
  Pop $VoiceLaunchAtLoginCheckbox
  ${If} $VoiceLaunchAtLogin == "true"
    ${NSD_Check} $VoiceLaunchAtLoginCheckbox
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function VoiceInstallerOptionsPageLeave
  ${NSD_GetState} $VoiceDesktopShortcutCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $VoiceCreateDesktopShortcut "1"
  ${Else}
    StrCpy $VoiceCreateDesktopShortcut "0"
  ${EndIf}

  ${NSD_GetState} $VoiceLaunchAtLoginCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $VoiceLaunchAtLogin "true"
  ${Else}
    StrCpy $VoiceLaunchAtLogin "false"
  ${EndIf}

  Call VoicePreflightInstall
FunctionEnd

Function VoicePreflightInstall
  Call VoiceValidateInstallDir
  Call VoiceValidateInstallDirWritable
  Call VoiceValidateDiskSpace
FunctionEnd

Function VoiceValidateInstallDir
  ${If} $INSTDIR == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "${VOICE_INSTALL_DIR_REQUIRED_TEXT}"
    Abort
  ${EndIf}

  ${GetRoot} "$INSTDIR" $0
  ${If} $0 == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "${VOICE_INSTALL_DIR_REQUIRED_TEXT}"
    Abort
  ${EndIf}
FunctionEnd

Function VoiceValidateInstallDirWritable
  ClearErrors
  CreateDirectory "$INSTDIR"
  IfErrors voice_dir_writable_failed

  ClearErrors
  FileOpen $0 "$INSTDIR\.voice-install-write-test" w
  IfErrors voice_dir_writable_failed
  FileWrite $0 "ok"
  FileClose $0
  Delete "$INSTDIR\.voice-install-write-test"
  ClearErrors
  Return

voice_dir_writable_failed:
  MessageBox MB_ICONEXCLAMATION|MB_OK "${VOICE_DIR_NOT_WRITABLE_TEXT}"
  Abort
FunctionEnd

Function VoiceValidateDiskSpace
  ${GetRoot} "$INSTDIR" $0
  ${If} $0 == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "${VOICE_DISK_SPACE_UNKNOWN_TEXT}"
    Abort
  ${EndIf}

  ClearErrors
  ${DriveSpace} "$0" "/D=F /S=M" $1
  IfErrors voice_disk_space_unknown

  ${If} $1 < ${VOICE_MIN_FREE_SPACE_MB}
    MessageBox MB_ICONEXCLAMATION|MB_OK "${VOICE_DISK_SPACE_REQUIRED_TEXT}"
    Abort
  ${EndIf}
  Return

voice_disk_space_unknown:
  MessageBox MB_ICONEXCLAMATION|MB_OK "${VOICE_DISK_SPACE_UNKNOWN_TEXT}"
  Abort
FunctionEnd

Function VoiceWriteInstallOptions
  IfSilent 0 voice_write_install_options_continue
  ${GetParameters} $0
  ${GetOptions} "$0" "--updated" $1
  IfErrors voice_write_install_options_continue
  Goto voice_write_install_options_done

voice_write_install_options_continue:
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
