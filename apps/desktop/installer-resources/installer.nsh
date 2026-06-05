!include LogicLib.nsh
!include nsDialogs.nsh
!include WinMessages.nsh

!ifndef SW_HIDE
  !define SW_HIDE 0
!endif
!ifndef SW_SHOW
  !define SW_SHOW 5
!endif
!ifndef SW_MINIMIZE
  !define SW_MINIMIZE 6
!endif
!ifndef BST_UNCHECKED
  !define BST_UNCHECKED 0
!endif
!ifndef BST_CHECKED
  !define BST_CHECKED 1
!endif
!ifndef BM_GETCHECK
  !define BM_GETCHECK 0x00F0
!endif
!ifndef BM_SETCHECK
  !define BM_SETCHECK 0x00F1
!endif
!ifndef WM_COMMAND
  !define WM_COMMAND 0x0111
!endif
!ifndef WM_CLOSE
  !define WM_CLOSE 0x0010
!endif
!ifndef PBM_GETPOS
  !define PBM_GETPOS 0x0408
!endif
!ifndef GWL_STYLE
  !define GWL_STYLE -16
!endif
!ifndef SWP_NOZORDER
  !define SWP_NOZORDER 0x0004
!endif
!ifndef SWP_NOSIZE
  !define SWP_NOSIZE 0x0001
!endif
!ifndef SWP_NOMOVE
  !define SWP_NOMOVE 0x0002
!endif
!ifndef SWP_NOACTIVATE
  !define SWP_NOACTIVATE 0x0010
!endif
!ifndef SWP_FRAMECHANGED
  !define SWP_FRAMECHANGED 0x0020
!endif
!ifndef SWP_SHOWWINDOW
  !define SWP_SHOWWINDOW 0x0040
!endif
!ifndef SWP_HIDEWINDOW
  !define SWP_HIDEWINDOW 0x0080
!endif
!ifndef HWND_TOP
  !define HWND_TOP 0
!endif
!ifndef WS_CHILD
  !define WS_CHILD 0x40000000
!endif
!ifndef WS_VISIBLE
  !define WS_VISIBLE 0x10000000
!endif
!ifndef SS_CENTER
  !define SS_CENTER 0x00000001
!endif
!ifndef SS_BITMAP
  !define SS_BITMAP 0x0000000E
!endif

!define VOICE_WIN_W 780
!define VOICE_WIN_H 570
!define VOICE_WINDOW_STYLE 0x96000000
!define VOICE_TEXT_COLOR 0x111111
!define VOICE_MUTED_COLOR 0x5F6368
!define VOICE_BLUE_COLOR 0x2F80ED
!define VOICE_BG_COLOR 0xF2F3F5

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

!ifndef BUILD_UNINSTALLER
Var VoiceMode
Var VoiceAgreeState
Var VoiceDesktopState
Var VoiceQuickLaunchState
Var VoiceStartupState
Var VoicePage
Var VoiceProgressPage
Var VoiceFinishPage
Var VoiceBackground
Var VoiceBackgroundImage
Var VoiceLogo
Var VoiceLogoImage
Var VoiceTitleLabel
Var VoiceBrandLabel
Var VoiceMinimizeButton
Var VoiceCloseButton
Var VoiceSimpleInstallButton
Var VoiceSimpleInstallImage
Var VoiceSimpleAgreeCheckbox
Var VoiceCustomOpenButton
Var VoiceCustomArrowButton
Var VoiceCustomArrowImage
Var VoicePathInput
Var VoicePathRow
Var VoicePathRowImage
Var VoiceBrowseButton
Var VoiceDiskLabel
Var VoiceDesktopCheckbox
Var VoiceQuickLaunchCheckbox
Var VoiceStartupCheckbox
Var VoiceCustomAgreeCheckbox
Var VoiceCustomInstallButton
Var VoiceCustomInstallImage
Var VoiceBackButton
Var VoiceBackArrowButton
Var VoiceBackArrowImage
Var VoiceProgressStatus
Var VoiceProgressBar
Var VoiceProgressValue
Var VoiceProgressAdvanceRequested
Var VoiceProgressTrack
Var VoiceProgressTrackImage
Var VoiceProgressFill
Var VoiceFinishTitle
Var VoiceFinishButton
Var VoiceFinishButtonImage

!macro customHeader
  BrandingText " "
!macroend

!macro customInit
  InitPluginsDir
  File /oname=$PLUGINSDIR\installer-bg.bmp "${BUILD_RESOURCES_DIR}\installer-bg.bmp"
  File /oname=$PLUGINSDIR\installer-logo.bmp "${BUILD_RESOURCES_DIR}\installer-logo.bmp"
  File /oname=$PLUGINSDIR\button-one-install.bmp "${BUILD_RESOURCES_DIR}\button-one-install.bmp"
  File /oname=$PLUGINSDIR\button-install-now.bmp "${BUILD_RESOURCES_DIR}\button-install-now.bmp"
  File /oname=$PLUGINSDIR\button-experience.bmp "${BUILD_RESOURCES_DIR}\button-experience.bmp"
  File /oname=$PLUGINSDIR\path-row.bmp "${BUILD_RESOURCES_DIR}\path-row.bmp"
  File /oname=$PLUGINSDIR\arrow-down.bmp "${BUILD_RESOURCES_DIR}\arrow-down.bmp"
  File /oname=$PLUGINSDIR\arrow-up.bmp "${BUILD_RESOURCES_DIR}\arrow-up.bmp"
  File /oname=$PLUGINSDIR\progress-track.bmp "${BUILD_RESOURCES_DIR}\progress-track.bmp"
  File /oname=$PLUGINSDIR\progress-fill.bmp "${BUILD_RESOURCES_DIR}\progress-fill.bmp"

  !ifndef INSTALL_MODE_PER_ALL_USERS
    !insertmacro setInstallModePerUser
  !endif
  StrCpy $VoiceMode "simple"
  StrCpy $VoiceAgreeState ${BST_UNCHECKED}
  StrCpy $VoiceDesktopState ${BST_CHECKED}
  StrCpy $VoiceQuickLaunchState ${BST_UNCHECKED}
  StrCpy $VoiceStartupState ${BST_CHECKED}
  StrCpy $VoiceProgressValue 0
  StrCpy $VoiceProgressAdvanceRequested 0
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customWelcomePage
  Page custom VoiceInstallerPageCreate VoiceInstallerPageLeave
!macroend

!macro customPageAfterChangeDir
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW VoiceProgressPageShow
  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE VoiceProgressPageLeave
!macroend

!macro customFinishPage
  Page custom VoiceFinishPageCreate VoiceFinishPageLeave
!macroend

!macro customInstall
  ${If} $VoiceDesktopState == ${BST_CHECKED}
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${EndIf}

  ${If} $VoiceQuickLaunchState == ${BST_CHECKED}
    Push $0
    StrCpy $0 "$APPDATA\Microsoft\Internet Explorer\Quick Launch"
    CreateDirectory "$0"
    CreateShortCut "$0\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    Pop $0
  ${EndIf}

  ${If} $VoiceStartupState == ${BST_CHECKED}
    CreateShortCut "$SMSTARTUP\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
  ${EndIf}

  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString '"$appExe" --uninstall'
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
  Push $0
  StrCpy $0 "$APPDATA\Microsoft\Internet Explorer\Quick Launch\${SHORTCUT_NAME}.lnk"
  Delete "$0"
  Pop $0
!macroend

!ifndef BUILD_UNINSTALLER

Function VoiceInstallerPageCreate
  Call VoiceApplyWindowFrame
  nsDialogs::Create 1018
  Pop $VoicePage
  ${If} $VoicePage == error
    Abort
  ${EndIf}
  Call VoiceStretchPage
  Call VoiceCreateShell
  Call VoiceCreateWelcomeContent
  Call VoiceCreateCustomContent
  Call VoiceApplyInstallMode
  Call VoiceSendInstallerLayersToBack
  nsDialogs::Show
FunctionEnd

Function VoiceApplyWindowFrame
  System::Call "user32::GetSystemMetrics(i0)i.r0"
  System::Call "user32::GetSystemMetrics(i1)i.r1"
  IntOp $2 $0 - ${VOICE_WIN_W}
  IntOp $2 $2 / 2
  IntOp $3 $1 - ${VOICE_WIN_H}
  IntOp $3 $3 / 2
  System::Call "user32::SetWindowLong(p$HWNDPARENT,i${GWL_STYLE},p${VOICE_WINDOW_STYLE})"
  System::Call "user32::SetWindowPos(p$HWNDPARENT,p0,i$2,i$3,i${VOICE_WIN_W},i${VOICE_WIN_H},i${SWP_NOZORDER}|${SWP_FRAMECHANGED}|${SWP_SHOWWINDOW})"
  Call VoiceHideWizardChrome
FunctionEnd

Function VoiceStretchPage
  System::Call "user32::SetWindowPos(p$VoicePage,p0,i0,i0,i${VOICE_WIN_W},i${VOICE_WIN_H},i${SWP_NOZORDER}|${SWP_SHOWWINDOW})"
FunctionEnd

Function VoiceStretchProgressPage
  System::Call "user32::SetWindowPos(p$VoiceProgressPage,p0,i0,i0,i${VOICE_WIN_W},i${VOICE_WIN_H},i${SWP_NOZORDER}|${SWP_SHOWWINDOW})"
FunctionEnd

Function VoiceFindProgressPage
  StrCpy $VoiceProgressPage 0
  StrCpy $VoiceProgressBar 0
  StrCpy $0 0

  loop:
    System::Call 'user32::FindWindowEx(p$HWNDPARENT,p$0,t"#32770",p0)p.r0'
    ${If} $0 == 0
      Return
    ${EndIf}

    GetDlgItem $1 $0 1004
    ${If} $1 P<> 0
      StrCpy $VoiceProgressPage $0
      StrCpy $VoiceProgressBar $1
      Return
    ${EndIf}
    Goto loop
FunctionEnd

Function VoiceCreateShell
  ${NSD_CreateBitmap} 0 0 ${VOICE_WIN_W} ${VOICE_WIN_H} ""
  Pop $VoiceBackground
  ${NSD_SetStretchedImage} $VoiceBackground "$PLUGINSDIR\installer-bg.bmp" $VoiceBackgroundImage

  ${NSD_CreateLabel} 26 22 180 24 "Voice Assistant"
  Pop $VoiceBrandLabel
  CreateFont $0 "Microsoft YaHei UI" 10 600
  SendMessage $VoiceBrandLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceBrandLabel ${VOICE_MUTED_COLOR} transparent

  ${NSD_CreateLabel} 690 14 32 32 "−"
  Pop $VoiceMinimizeButton
  CreateFont $0 "Microsoft YaHei UI" 20 400
  SendMessage $VoiceMinimizeButton ${WM_SETFONT} $0 1
  SetCtlColors $VoiceMinimizeButton ${VOICE_MUTED_COLOR} transparent
  ${NSD_OnClick} $VoiceMinimizeButton VoiceMinimize

  ${NSD_CreateLabel} 744 13 32 32 "×"
  Pop $VoiceCloseButton
  CreateFont $0 "Microsoft YaHei UI" 22 400
  SendMessage $VoiceCloseButton ${WM_SETFONT} $0 1
  SetCtlColors $VoiceCloseButton ${VOICE_MUTED_COLOR} transparent
  ${NSD_OnClick} $VoiceCloseButton VoiceClose
FunctionEnd

Function VoiceSendBackgroundToBack
  System::Call "user32::SetWindowPos(p$VoiceBackground,p1,i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE})"
FunctionEnd

Function VoiceBringInstallerChromeToTop
  System::Call "user32::SetWindowPos(p$VoiceBrandLabel,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  System::Call "user32::SetWindowPos(p$VoiceMinimizeButton,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  System::Call "user32::SetWindowPos(p$VoiceCloseButton,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  System::Call "user32::SetWindowPos(p$VoiceLogo,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  System::Call "user32::SetWindowPos(p$VoiceTitleLabel,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
FunctionEnd

Function VoiceSendInstallerLayersToBack
  System::Call "user32::SetWindowPos(p$VoicePathRow,p1,i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE})"
  Call VoiceSendBackgroundToBack
FunctionEnd

Function VoiceCreateBrandHero
  ${NSD_CreateBitmap} 334 168 112 82 ""
  Pop $VoiceLogo
  ${NSD_SetImage} $VoiceLogo "$PLUGINSDIR\installer-logo.bmp" $VoiceLogoImage

  ${NSD_CreateLabel} 200 281 380 34 "欢迎使用 Voice Assistant Service"
  Pop $VoiceTitleLabel
  CreateFont $0 "Microsoft YaHei UI" 18 700
  SendMessage $VoiceTitleLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceTitleLabel ${VOICE_TEXT_COLOR} transparent
FunctionEnd

Function VoiceCreateProgressShell
  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"",i${WS_CHILD}|${WS_VISIBLE}|${SS_BITMAP},i0,i0,i${VOICE_WIN_W},i${VOICE_WIN_H},p$VoiceProgressPage,p0,p0,p0)p.r0'
  StrCpy $VoiceBackground $0
  ${NSD_SetImage} $VoiceBackground "$PLUGINSDIR\installer-bg.bmp" $VoiceBackgroundImage

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"Voice Assistant",i${WS_CHILD}|${WS_VISIBLE},i26,i22,i180,i24,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceBrandLabel $0
  CreateFont $0 "Microsoft YaHei UI" 10 600
  SendMessage $VoiceBrandLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceBrandLabel ${VOICE_MUTED_COLOR} transparent

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"−",i${WS_CHILD}|${WS_VISIBLE}|${SS_CENTER},i690,i14,i32,i32,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceMinimizeButton $0
  CreateFont $0 "Microsoft YaHei UI" 20 400
  SendMessage $VoiceMinimizeButton ${WM_SETFONT} $0 1
  SetCtlColors $VoiceMinimizeButton ${VOICE_MUTED_COLOR} transparent

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"×",i${WS_CHILD}|${WS_VISIBLE}|${SS_CENTER},i744,i13,i32,i32,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceCloseButton $0
  CreateFont $0 "Microsoft YaHei UI" 22 400
  SendMessage $VoiceCloseButton ${WM_SETFONT} $0 1
  SetCtlColors $VoiceCloseButton ${VOICE_MUTED_COLOR} transparent

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"",i${WS_CHILD}|${WS_VISIBLE}|${SS_BITMAP},i334,i168,i112,i82,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceLogo $0
  ${NSD_SetImage} $VoiceLogo "$PLUGINSDIR\installer-logo.bmp" $VoiceLogoImage

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"欢迎使用 Voice Assistant Service",i${WS_CHILD}|${WS_VISIBLE}|${SS_CENTER},i200,i281,i380,i34,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceTitleLabel $0
  CreateFont $0 "Microsoft YaHei UI" 18 700
  SendMessage $VoiceTitleLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceTitleLabel ${VOICE_TEXT_COLOR} transparent
FunctionEnd

Function VoiceCreateProgressControls
  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"",i${WS_CHILD}|${WS_VISIBLE}|${SS_BITMAP},i70,i426,i660,i16,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceProgressTrack $0
  ${NSD_SetImage} $VoiceProgressTrack "$PLUGINSDIR\progress-track.bmp" $VoiceProgressTrackImage

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t" ",i${WS_CHILD}|${WS_VISIBLE},i70,i426,i1,i16,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceProgressFill $0
  SetCtlColors $VoiceProgressFill ${VOICE_BLUE_COLOR} ${VOICE_BLUE_COLOR}
  ShowWindow $VoiceProgressFill ${SW_HIDE}

  System::Call 'user32::CreateWindowEx(i0,t"STATIC",t"正在安装...",i${WS_CHILD}|${WS_VISIBLE}|${SS_CENTER},i330,i474,i140,i28,p$VoiceBackground,p0,p0,p0)p.r0'
  StrCpy $VoiceProgressStatus $0
  CreateFont $0 "Microsoft YaHei UI" 11 400
  SendMessage $VoiceProgressStatus ${WM_SETFONT} $0 1
  SetCtlColors $VoiceProgressStatus ${VOICE_TEXT_COLOR} transparent
FunctionEnd

Function VoiceCreateWelcomeContent
  Call VoiceCreateBrandHero

  ${NSD_CreateBitmap} 283 399 214 64 ""
  Pop $VoiceSimpleInstallButton
  ${NSD_SetImage} $VoiceSimpleInstallButton "$PLUGINSDIR\button-one-install.bmp" $VoiceSimpleInstallImage
  ${NSD_OnClick} $VoiceSimpleInstallButton VoiceStartDefaultInstall

  ${NSD_CreateCheckbox} 68 516 220 24 "同意《用户使用协议》"
  Pop $VoiceSimpleAgreeCheckbox
  CreateFont $0 "Microsoft YaHei UI" 10 400
  SendMessage $VoiceSimpleAgreeCheckbox ${WM_SETFONT} $0 1
  SendMessage $VoiceSimpleAgreeCheckbox ${BM_SETCHECK} $VoiceAgreeState 0
  SetCtlColors $VoiceSimpleAgreeCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateLabel} 616 519 88 24 "自定义安装"
  Pop $VoiceCustomOpenButton
  CreateFont $0 "Microsoft YaHei UI" 10 400 /UNDERLINE
  SendMessage $VoiceCustomOpenButton ${WM_SETFONT} $0 1
  SetCtlColors $VoiceCustomOpenButton ${VOICE_TEXT_COLOR} transparent
  ${NSD_OnClick} $VoiceCustomOpenButton VoiceOpenCustomInstall

  ${NSD_CreateBitmap} 708 512 28 28 ""
  Pop $VoiceCustomArrowButton
  ${NSD_SetImage} $VoiceCustomArrowButton "$PLUGINSDIR\arrow-down.bmp" $VoiceCustomArrowImage
  ${NSD_OnClick} $VoiceCustomArrowButton VoiceOpenCustomInstall
FunctionEnd

Function VoiceCreateCustomContent
  ${NSD_CreateBitmap} 68 357 660 40 ""
  Pop $VoicePathRow
  ${NSD_SetImage} $VoicePathRow "$PLUGINSDIR\path-row.bmp" $VoicePathRowImage

  ${NSD_CreateLabel} 88 365 490 24 "$INSTDIR"
  Pop $VoicePathInput
  CreateFont $0 "Microsoft YaHei UI" 11 400
  SendMessage $VoicePathInput ${WM_SETFONT} $0 1
  SetCtlColors $VoicePathInput ${VOICE_TEXT_COLOR} transparent

  ${NSD_CreateLabel} 598 357 130 40 " "
  Pop $VoiceBrowseButton
  SetCtlColors $VoiceBrowseButton ${VOICE_TEXT_COLOR} transparent
  ${NSD_OnClick} $VoiceBrowseButton VoiceBrowseInstallDir

  ${NSD_CreateLabel} 98 411 360 24 "需要至少 200MB 可用空间，硬盘可用空间 50GB。"
  Pop $VoiceDiskLabel
  CreateFont $0 "Microsoft YaHei UI" 10 400
  SendMessage $VoiceDiskLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceDiskLabel ${VOICE_MUTED_COLOR} transparent

  ${NSD_CreateCheckbox} 68 469 160 24 "创建桌面图标"
  Pop $VoiceDesktopCheckbox
  CreateFont $0 "Microsoft YaHei UI" 10 400
  SendMessage $VoiceDesktopCheckbox ${WM_SETFONT} $0 1
  SendMessage $VoiceDesktopCheckbox ${BM_SETCHECK} $VoiceDesktopState 0
  SetCtlColors $VoiceDesktopCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 263 469 190 24 "创建到快速启动栏"
  Pop $VoiceQuickLaunchCheckbox
  CreateFont $0 "Microsoft YaHei UI" 10 400
  SendMessage $VoiceQuickLaunchCheckbox ${WM_SETFONT} $0 1
  SendMessage $VoiceQuickLaunchCheckbox ${BM_SETCHECK} $VoiceQuickLaunchState 0
  SetCtlColors $VoiceQuickLaunchCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 491 469 160 24 "开机自启动"
  Pop $VoiceStartupCheckbox
  CreateFont $0 "Microsoft YaHei UI" 10 400
  SendMessage $VoiceStartupCheckbox ${WM_SETFONT} $0 1
  SendMessage $VoiceStartupCheckbox ${BM_SETCHECK} $VoiceStartupState 0
  SetCtlColors $VoiceStartupCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 68 528 220 24 "同意《用户使用协议》"
  Pop $VoiceCustomAgreeCheckbox
  CreateFont $0 "Microsoft YaHei UI" 10 400
  SendMessage $VoiceCustomAgreeCheckbox ${WM_SETFONT} $0 1
  SendMessage $VoiceCustomAgreeCheckbox ${BM_SETCHECK} $VoiceAgreeState 0
  SetCtlColors $VoiceCustomAgreeCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateBitmap} 490 514 128 46 ""
  Pop $VoiceCustomInstallButton
  ${NSD_SetImage} $VoiceCustomInstallButton "$PLUGINSDIR\button-install-now.bmp" $VoiceCustomInstallImage
  ${NSD_OnClick} $VoiceCustomInstallButton VoiceStartCustomInstall

  ${NSD_CreateLabel} 660 526 44 24 "返回"
  Pop $VoiceBackButton
  CreateFont $0 "Microsoft YaHei UI" 10 400 /UNDERLINE
  SendMessage $VoiceBackButton ${WM_SETFONT} $0 1
  SetCtlColors $VoiceBackButton ${VOICE_TEXT_COLOR} transparent
  ${NSD_OnClick} $VoiceBackButton VoiceBackToSimpleInstall

  ${NSD_CreateBitmap} 708 518 28 28 ""
  Pop $VoiceBackArrowButton
  ${NSD_SetImage} $VoiceBackArrowButton "$PLUGINSDIR\arrow-up.bmp" $VoiceBackArrowImage
  ${NSD_OnClick} $VoiceBackArrowButton VoiceBackToSimpleInstall
FunctionEnd

Function VoiceStartDefaultInstall
  StrCpy $VoiceMode "simple"
  Call VoiceReadControlState
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

Function VoiceStartCustomInstall
  StrCpy $VoiceMode "custom"
  Call VoiceReadControlState
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

Function VoiceOpenCustomInstall
  Call VoiceReadControlState
  StrCpy $VoiceMode "custom"
  SendMessage $VoiceCustomAgreeCheckbox ${BM_SETCHECK} $VoiceAgreeState 0
  ${NSD_SetText} $VoicePathInput "$INSTDIR"
  Call VoiceApplyInstallMode
FunctionEnd

Function VoiceBackToSimpleInstall
  Call VoiceReadControlState
  StrCpy $VoiceMode "simple"
  SendMessage $VoiceSimpleAgreeCheckbox ${BM_SETCHECK} $VoiceAgreeState 0
  Call VoiceApplyInstallMode
FunctionEnd

Function VoiceBrowseInstallDir
  ${NSD_GetText} $VoicePathInput $0
  nsDialogs::SelectFolderDialog "选择安装位置" "$0"
  Pop $0
  ${If} $0 != error
  ${AndIf} $0 != ""
    StrCpy $INSTDIR "$0"
    ${NSD_SetText} $VoicePathInput "$INSTDIR"
  ${EndIf}
FunctionEnd

Function VoiceInstallerPageLeave
  Call VoiceReadControlState

  ${If} $VoiceAgreeState != ${BST_CHECKED}
    MessageBox MB_ICONEXCLAMATION|MB_OK "请先同意《用户使用协议》。"
    Abort
  ${EndIf}

  ${If} $VoiceMode == "custom"
    ${NSD_GetText} $VoicePathInput $INSTDIR
    ${If} $INSTDIR == ""
      MessageBox MB_ICONEXCLAMATION|MB_OK "请选择安装位置。"
      Abort
    ${EndIf}
  ${EndIf}
FunctionEnd

Function VoiceReadControlState
  ${If} $VoiceMode == "custom"
    SendMessage $VoiceCustomAgreeCheckbox ${BM_GETCHECK} 0 0 $VoiceAgreeState
    SendMessage $VoiceDesktopCheckbox ${BM_GETCHECK} 0 0 $VoiceDesktopState
    SendMessage $VoiceQuickLaunchCheckbox ${BM_GETCHECK} 0 0 $VoiceQuickLaunchState
    SendMessage $VoiceStartupCheckbox ${BM_GETCHECK} 0 0 $VoiceStartupState
  ${Else}
    SendMessage $VoiceSimpleAgreeCheckbox ${BM_GETCHECK} 0 0 $VoiceAgreeState
    StrCpy $VoiceDesktopState ${BST_CHECKED}
    StrCpy $VoiceQuickLaunchState ${BST_UNCHECKED}
    StrCpy $VoiceStartupState ${BST_CHECKED}
  ${EndIf}
FunctionEnd

Function VoiceApplyInstallMode
  ${If} $VoiceMode == "custom"
    ShowWindow $VoiceSimpleInstallButton ${SW_HIDE}
    ShowWindow $VoiceSimpleAgreeCheckbox ${SW_HIDE}
    ShowWindow $VoiceCustomOpenButton ${SW_HIDE}
    ShowWindow $VoiceCustomArrowButton ${SW_HIDE}
    ShowWindow $VoicePathRow ${SW_SHOW}
    ShowWindow $VoicePathInput ${SW_SHOW}
    ShowWindow $VoiceBrowseButton ${SW_SHOW}
    ShowWindow $VoiceDiskLabel ${SW_SHOW}
    ShowWindow $VoiceDesktopCheckbox ${SW_SHOW}
    ShowWindow $VoiceQuickLaunchCheckbox ${SW_SHOW}
    ShowWindow $VoiceStartupCheckbox ${SW_SHOW}
    ShowWindow $VoiceCustomAgreeCheckbox ${SW_SHOW}
    ShowWindow $VoiceCustomInstallButton ${SW_SHOW}
    ShowWindow $VoiceBackButton ${SW_SHOW}
    ShowWindow $VoiceBackArrowButton ${SW_SHOW}
  ${Else}
    ShowWindow $VoiceSimpleInstallButton ${SW_SHOW}
    ShowWindow $VoiceSimpleAgreeCheckbox ${SW_SHOW}
    ShowWindow $VoiceCustomOpenButton ${SW_SHOW}
    ShowWindow $VoiceCustomArrowButton ${SW_SHOW}
    ShowWindow $VoicePathRow ${SW_HIDE}
    ShowWindow $VoicePathInput ${SW_HIDE}
    ShowWindow $VoiceBrowseButton ${SW_HIDE}
    ShowWindow $VoiceDiskLabel ${SW_HIDE}
    ShowWindow $VoiceDesktopCheckbox ${SW_HIDE}
    ShowWindow $VoiceQuickLaunchCheckbox ${SW_HIDE}
    ShowWindow $VoiceStartupCheckbox ${SW_HIDE}
    ShowWindow $VoiceCustomAgreeCheckbox ${SW_HIDE}
    ShowWindow $VoiceCustomInstallButton ${SW_HIDE}
    ShowWindow $VoiceBackButton ${SW_HIDE}
    ShowWindow $VoiceBackArrowButton ${SW_HIDE}
  ${EndIf}
FunctionEnd

Function VoiceHideWizardChrome
  GetDlgItem $0 $HWNDPARENT 1
  ShowWindow $0 ${SW_HIDE}
  System::Call "user32::SetWindowPos(p$0,p0,i-2000,i-2000,i1,i1,i${SWP_NOZORDER}|${SWP_NOACTIVATE})"
  GetDlgItem $0 $HWNDPARENT 2
  ShowWindow $0 ${SW_HIDE}
  System::Call "user32::SetWindowPos(p$0,p0,i-2000,i-2000,i1,i1,i${SWP_NOZORDER}|${SWP_NOACTIVATE})"
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}
  System::Call "user32::SetWindowPos(p$0,p0,i-2000,i-2000,i1,i1,i${SWP_NOZORDER}|${SWP_NOACTIVATE})"
  GetDlgItem $0 $HWNDPARENT 1028
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1034
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1035
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1036
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1037
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1038
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1039
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1045
  ShowWindow $0 ${SW_HIDE}
FunctionEnd

Function VoiceHideProgressNativeChrome
  Call VoiceHideWizardChrome

  ${If} $VoiceProgressPage == 0
  ${OrIf} $VoiceProgressPage == ""
    Call VoiceFindProgressPage
  ${EndIf}

  GetDlgItem $0 $VoiceProgressPage 1006
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $VoiceProgressPage 1016
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $VoiceProgressPage 1027
  ShowWindow $0 ${SW_HIDE}
  ${If} $VoiceProgressBar != ""
  ${AndIf} $VoiceProgressBar != 0
    System::Call "user32::SetWindowPos(p$VoiceProgressBar,p${HWND_TOP},i70,i426,i660,i16,i${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
    ShowWindow $VoiceProgressBar ${SW_SHOW}
  ${EndIf}
FunctionEnd

Function VoiceProgressPageShow
  Call VoiceApplyWindowFrame
  Call VoiceFindProgressPage
  Call VoiceStretchProgressPage
  Call VoiceHideProgressNativeChrome
  StrCpy $VoiceProgressValue 0
  StrCpy $VoiceProgressAdvanceRequested 0

  Call VoiceCreateProgressShell
  Call VoiceCreateProgressControls

  ${NSD_CreateTimer} VoiceProgressTick 250
  Call VoiceProgressTick
  Call VoiceBringInstallerChromeToTop
  SetDetailsPrint none
FunctionEnd

Function VoiceProgressTick
  Call VoiceHideProgressNativeChrome

  ${If} $VoiceProgressBar != ""
  ${AndIf} $VoiceProgressStatus != ""
    SendMessage $VoiceProgressBar ${PBM_GETPOS} 0 0 $0
    ${If} $0 > 100
      IntOp $0 $0 / 300
    ${EndIf}
    ${If} $0 > 100
      StrCpy $0 "100"
    ${EndIf}

    ${If} $0 > $VoiceProgressValue
      StrCpy $VoiceProgressValue $0
    ${EndIf}

    StrCpy $0 $VoiceProgressValue
    IntOp $1 $0 * 660
    IntOp $1 $1 / 100
    ${If} $0 == 0
      StrCpy $1 0
    ${ElseIf} $1 < 6
      StrCpy $1 6
    ${EndIf}
    System::Call "user32::SetWindowPos(p$VoiceProgressFill,p0,i70,i426,i$1,i16,i${SWP_NOZORDER}|${SWP_SHOWWINDOW})"
    ${If} $0 > 0
      SendMessage $VoiceProgressStatus ${WM_SETTEXT} 0 "STR:正在安装 $0%"
    ${Else}
      SendMessage $VoiceProgressStatus ${WM_SETTEXT} 0 "STR:正在安装..."
    ${EndIf}

    ${If} $0 >= 100
    ${AndIf} $VoiceProgressAdvanceRequested == 0
      StrCpy $VoiceProgressAdvanceRequested 1
      SendMessage $VoiceProgressStatus ${WM_SETTEXT} 0 "STR:安装完成"
      ${NSD_CreateTimer} VoiceProgressAdvance 500
    ${EndIf}
  ${EndIf}

  System::Call "user32::SetWindowPos(p$VoiceBackground,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  System::Call "user32::SetWindowPos(p$VoiceProgressTrack,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  System::Call "user32::SetWindowPos(p$VoiceProgressFill,p0,i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE})"
  ${If} $VoiceProgressBar != ""
  ${AndIf} $VoiceProgressBar != 0
    System::Call "user32::SetWindowPos(p$VoiceProgressBar,p${HWND_TOP},i70,i426,i660,i16,i${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  ${EndIf}
  System::Call "user32::SetWindowPos(p$VoiceProgressStatus,p${HWND_TOP},i0,i0,i0,i0,i${SWP_NOMOVE}|${SWP_NOSIZE}|${SWP_NOACTIVATE}|${SWP_SHOWWINDOW})"
  Call VoiceBringInstallerChromeToTop
FunctionEnd

Function VoiceProgressPageLeave
  ${NSD_KillTimer} VoiceProgressTick
  ${NSD_KillTimer} VoiceProgressAdvance
FunctionEnd

Function VoiceProgressAdvance
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

Function VoiceFinishPageCreate
  Call VoiceApplyWindowFrame
  nsDialogs::Create 1018
  Pop $VoiceFinishPage
  ${If} $VoiceFinishPage == error
    Abort
  ${EndIf}
  StrCpy $VoicePage $VoiceFinishPage
  Call VoiceStretchPage
  Call VoiceCreateShell

  ${NSD_CreateLabel} 273 242 236 70 "安装完成"
  Pop $VoiceFinishTitle
  CreateFont $0 "Microsoft YaHei UI" 40 300
  SendMessage $VoiceFinishTitle ${WM_SETFONT} $0 1
  SetCtlColors $VoiceFinishTitle ${VOICE_TEXT_COLOR} transparent

  ${NSD_CreateBitmap} 283 398 214 64 ""
  Pop $VoiceFinishButton
  ${NSD_SetImage} $VoiceFinishButton "$PLUGINSDIR\button-experience.bmp" $VoiceFinishButtonImage
  ${NSD_OnClick} $VoiceFinishButton VoiceLaunchAndClose
  Call VoiceSendBackgroundToBack

  nsDialogs::Show
FunctionEnd

Function VoiceLaunchAndClose
  HideWindow
  ExecShell "open" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

Function VoiceFinishPageLeave
FunctionEnd

Function VoiceMinimize
  ShowWindow $HWNDPARENT ${SW_MINIMIZE}
FunctionEnd

Function VoiceClose
  SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
FunctionEnd

!endif
