!include LogicLib.nsh
!include nsDialogs.nsh
!include WinMessages.nsh

!ifndef SW_HIDE
  !define SW_HIDE 0
!endif
!ifndef SW_SHOW
  !define SW_SHOW 5
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

!define VOICE_TEXT_COLOR 0x111111
!define VOICE_MUTED_COLOR 0x5F6368
!define VOICE_BLUE_COLOR 0x2F80ED
!define VOICE_BG_COLOR 0xF2F3F5
!define VOICE_DISABLED_BG 0xD8D8D8

!ifndef BUILD_UNINSTALLER
Var VoiceMode
Var VoiceAgreeState
Var VoiceDesktopState
Var VoiceQuickLaunchState
Var VoiceStartupState
Var VoicePage
Var VoiceBrandLabel
Var VoiceLogoLabel
Var VoiceTitleLabel
Var VoiceSimpleInstallButton
Var VoiceSimpleAgreeCheckbox
Var VoiceCustomOpenButton
Var VoicePathInput
Var VoiceBrowseButton
Var VoiceDiskLabel
Var VoiceDesktopCheckbox
Var VoiceQuickLaunchCheckbox
Var VoiceStartupCheckbox
Var VoiceCustomAgreeCheckbox
Var VoiceCustomInstallButton
Var VoiceBackButton
Var VoiceFinishPage
Var VoiceFinishTitle
Var VoiceFinishButton
Var VoiceProgressPage
Var VoiceProgressLogo
Var VoiceProgressTitle
Var VoiceProgressStatus
Var VoiceProgressBar

!macro customInit
  StrCpy $VoiceMode "simple"
  StrCpy $VoiceAgreeState ${BST_UNCHECKED}
  StrCpy $VoiceDesktopState ${BST_CHECKED}
  StrCpy $VoiceQuickLaunchState ${BST_UNCHECKED}
  StrCpy $VoiceStartupState ${BST_CHECKED}
!macroend

!macro customWelcomePage
  Page custom VoiceInstallerPageCreate VoiceInstallerPageLeave
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
!macroend

!endif

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
  nsDialogs::Create 1018
  Pop $VoicePage
  ${If} $VoicePage == error
    Abort
  ${EndIf}

  Call VoiceHideWizardButtons
  Call VoiceCreateCommonHeader
  Call VoiceCreateSimpleControls
  Call VoiceCreateCustomControls
  Call VoiceApplyInstallMode

  nsDialogs::Show
FunctionEnd

Function VoiceCreateCommonHeader
  ${NSD_CreateLabel} 0u 0u 100u 12u "Voice Assistant"
  Pop $VoiceBrandLabel
  SetCtlColors $VoiceBrandLabel ${VOICE_MUTED_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateLabel} 126u 30u 48u 20u "●   ●"
  Pop $VoiceLogoLabel
  CreateFont $0 "Microsoft YaHei UI" 18 700
  SendMessage $VoiceLogoLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceLogoLabel ${VOICE_BLUE_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateLabel} 54u 66u 230u 20u "欢迎使用 Voice Assistant Service"
  Pop $VoiceTitleLabel
  CreateFont $0 "Microsoft YaHei UI" 14 700
  SendMessage $VoiceTitleLabel ${WM_SETFONT} $0 1
  SetCtlColors $VoiceTitleLabel ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}
FunctionEnd

Function VoiceCreateSimpleControls
  ${NSD_CreateButton} 108u 112u 84u 22u "一键安装"
  Pop $VoiceSimpleInstallButton
  ${NSD_OnClick} $VoiceSimpleInstallButton VoiceStartDefaultInstall

  ${NSD_CreateCheckbox} 18u 178u 118u 12u "同意《用户使用协议》"
  Pop $VoiceSimpleAgreeCheckbox
  SendMessage $VoiceSimpleAgreeCheckbox ${BM_SETCHECK} $VoiceAgreeState 0
  SetCtlColors $VoiceSimpleAgreeCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateButton} 230u 176u 58u 16u "自定义安装"
  Pop $VoiceCustomOpenButton
  ${NSD_OnClick} $VoiceCustomOpenButton VoiceOpenCustomInstall
FunctionEnd

Function VoiceCreateCustomControls
  ${NSD_CreateText} 18u 112u 210u 17u "$INSTDIR"
  Pop $VoicePathInput

  ${NSD_CreateButton} 230u 112u 68u 17u "选择安装位置"
  Pop $VoiceBrowseButton
  ${NSD_OnClick} $VoiceBrowseButton VoiceBrowseInstallDir

  ${NSD_CreateLabel} 30u 135u 220u 12u "需要至少 200MB 可用空间，硬盘可用空间 50GB。"
  Pop $VoiceDiskLabel
  SetCtlColors $VoiceDiskLabel ${VOICE_MUTED_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 18u 154u 78u 12u "创建桌面图标"
  Pop $VoiceDesktopCheckbox
  SendMessage $VoiceDesktopCheckbox ${BM_SETCHECK} $VoiceDesktopState 0
  SetCtlColors $VoiceDesktopCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 112u 154u 88u 12u "创建到快速启动栏"
  Pop $VoiceQuickLaunchCheckbox
  SendMessage $VoiceQuickLaunchCheckbox ${BM_SETCHECK} $VoiceQuickLaunchState 0
  SetCtlColors $VoiceQuickLaunchCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 220u 154u 78u 12u "开机自启动"
  Pop $VoiceStartupCheckbox
  SendMessage $VoiceStartupCheckbox ${BM_SETCHECK} $VoiceStartupState 0
  SetCtlColors $VoiceStartupCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateCheckbox} 18u 178u 118u 12u "同意《用户使用协议》"
  Pop $VoiceCustomAgreeCheckbox
  SendMessage $VoiceCustomAgreeCheckbox ${BM_SETCHECK} $VoiceAgreeState 0
  SetCtlColors $VoiceCustomAgreeCheckbox ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateButton} 202u 174u 64u 20u "立即安装"
  Pop $VoiceCustomInstallButton
  ${NSD_OnClick} $VoiceCustomInstallButton VoiceStartCustomInstall

  ${NSD_CreateButton} 270u 176u 32u 16u "返回"
  Pop $VoiceBackButton
  ${NSD_OnClick} $VoiceBackButton VoiceBackToSimpleInstall
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
    ShowWindow $VoicePathInput ${SW_SHOW}
    ShowWindow $VoiceBrowseButton ${SW_SHOW}
    ShowWindow $VoiceDiskLabel ${SW_SHOW}
    ShowWindow $VoiceDesktopCheckbox ${SW_SHOW}
    ShowWindow $VoiceQuickLaunchCheckbox ${SW_SHOW}
    ShowWindow $VoiceStartupCheckbox ${SW_SHOW}
    ShowWindow $VoiceCustomAgreeCheckbox ${SW_SHOW}
    ShowWindow $VoiceCustomInstallButton ${SW_SHOW}
    ShowWindow $VoiceBackButton ${SW_SHOW}
  ${Else}
    ShowWindow $VoiceSimpleInstallButton ${SW_SHOW}
    ShowWindow $VoiceSimpleAgreeCheckbox ${SW_SHOW}
    ShowWindow $VoiceCustomOpenButton ${SW_SHOW}
    ShowWindow $VoicePathInput ${SW_HIDE}
    ShowWindow $VoiceBrowseButton ${SW_HIDE}
    ShowWindow $VoiceDiskLabel ${SW_HIDE}
    ShowWindow $VoiceDesktopCheckbox ${SW_HIDE}
    ShowWindow $VoiceQuickLaunchCheckbox ${SW_HIDE}
    ShowWindow $VoiceStartupCheckbox ${SW_HIDE}
    ShowWindow $VoiceCustomAgreeCheckbox ${SW_HIDE}
    ShowWindow $VoiceCustomInstallButton ${SW_HIDE}
    ShowWindow $VoiceBackButton ${SW_HIDE}
  ${EndIf}
FunctionEnd

Function VoiceHideWizardButtons
  GetDlgItem $0 $HWNDPARENT 1
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 2
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}
FunctionEnd

Function VoiceProgressPageShow
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}

  FindWindow $VoiceProgressPage "#32770" "" $HWNDPARENT
  GetDlgItem $0 $VoiceProgressPage 1006
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $VoiceProgressPage 1016
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $VoiceProgressPage 1027
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $VoiceProgressBar $VoiceProgressPage 1004

  ${NSD_CreateLabel} 126u 32u 48u 20u "●   ●"
  Pop $VoiceProgressLogo
  CreateFont $0 "Microsoft YaHei UI" 18 700
  SendMessage $VoiceProgressLogo ${WM_SETFONT} $0 1
  SetCtlColors $VoiceProgressLogo ${VOICE_BLUE_COLOR} transparent

  ${NSD_CreateLabel} 70u 66u 180u 18u "正在安装 Voice Assistant"
  Pop $VoiceProgressTitle
  CreateFont $0 "Microsoft YaHei UI" 14 700
  SendMessage $VoiceProgressTitle ${WM_SETFONT} $0 1
  SetCtlColors $VoiceProgressTitle ${VOICE_TEXT_COLOR} transparent

  ${NSD_CreateLabel} 120u 136u 80u 12u "正在安装 0%"
  Pop $VoiceProgressStatus
  SetCtlColors $VoiceProgressStatus ${VOICE_MUTED_COLOR} transparent

  ${NSD_CreateTimer} VoiceProgressTick 250
  Call VoiceProgressTick
  SetDetailsPrint none
FunctionEnd

Function VoiceProgressTick
  ${If} $VoiceProgressBar != ""
  ${AndIf} $VoiceProgressStatus != ""
    SendMessage $VoiceProgressBar ${PBM_GETPOS} 0 0 $0
    ${If} $0 > 100
      IntOp $0 $0 / 300
    ${EndIf}
    ${If} $0 > 100
      StrCpy $0 "100"
    ${EndIf}
    SendMessage $VoiceProgressStatus ${WM_SETTEXT} 0 "STR:正在安装 $0%"
  ${EndIf}
FunctionEnd

Function VoiceProgressPageLeave
  ${NSD_KillTimer} VoiceProgressTick
FunctionEnd

Function VoiceFinishPageCreate
  nsDialogs::Create 1018
  Pop $VoiceFinishPage
  ${If} $VoiceFinishPage == error
    Abort
  ${EndIf}

  Call VoiceHideWizardButtons

  ${NSD_CreateLabel} 0u 0u 100u 12u "Voice Assistant"
  Pop $VoiceBrandLabel
  SetCtlColors $VoiceBrandLabel ${VOICE_MUTED_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateLabel} 92u 78u 116u 30u "安装完成"
  Pop $VoiceFinishTitle
  CreateFont $0 "Microsoft YaHei UI" 26 400
  SendMessage $VoiceFinishTitle ${WM_SETFONT} $0 1
  SetCtlColors $VoiceFinishTitle ${VOICE_TEXT_COLOR} ${VOICE_BG_COLOR}

  ${NSD_CreateButton} 112u 134u 76u 22u "立即体验"
  Pop $VoiceFinishButton
  ${NSD_OnClick} $VoiceFinishButton VoiceLaunchAndClose

  nsDialogs::Show
FunctionEnd

Function VoiceLaunchAndClose
  HideWindow
  ExecShell "open" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

Function VoiceFinishPageLeave
FunctionEnd

!endif
