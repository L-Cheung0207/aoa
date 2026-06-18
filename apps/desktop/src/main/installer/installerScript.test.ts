import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const installerScriptPath = resolve(
  __dirname,
  "../../../installer-resources/installer.nsh",
);

function readInstallerScript(): string {
  return readFileSync(installerScriptPath, "utf8");
}

describe("single-layer NSIS installer script", () => {
  it("uses standard NSIS pages without a custom first-screen installer or agreement page", () => {
    const script = readInstallerScript();

    expect(script).toContain("nsDialogs.nsh");
    expect(script).toContain("FileFunc.nsh");
    expect(script).toContain('!define MUI_FONT "Microsoft YaHei UI"');
    expect(script).toContain('!define MUI_FONTSIZE "9"');
    expect(script).toContain('SetFont "Microsoft YaHei UI" 9');
    expect(script).not.toContain("VOICE_AGREEMENT_FILE");
    expect(script).not.toContain("VOICE_LICENSE_TOP_TEXT");
    expect(script).not.toContain("VOICE_LICENSE_BOTTOM_TEXT");
    expect(script).not.toContain("MUI_LICENSEPAGE_TEXT_TOP");
    expect(script).not.toContain("MUI_LICENSEPAGE_TEXT_BOTTOM");
    expect(script).not.toContain("MUI_PAGE_LICENSE");
    expect(script).not.toContain("MUI_HEADER_TRANSPARENT_TEXT");
    expect(script).not.toContain("MUI_COMPONENTSPAGE_SMALLDESC");
    expect(script).not.toContain("!macro licensePage");
    expect(script).toContain("!macro customPageAfterChangeDir");
    expect(script).toContain(
      "Page custom VoiceInstallerOptionsPageCreate VoiceInstallerOptionsPageLeave",
    );
    expect(script).not.toContain("!macro customWelcomePage");
    expect(script).not.toContain("Function VoiceInstallerWelcomePageCreate");
    expect(script).not.toContain("Function VoiceStartOneClickInstall");
    expect(script).not.toContain("Function VoiceOpenCustomInstall");
    expect(script).not.toContain("VoiceHideWizardNavigation");
    expect(script).not.toContain("VOICE_ONE_CLICK_INSTALL_TEXT");
    expect(script).not.toContain("VOICE_CUSTOM_INSTALL_TEXT");
    expect(script).not.toContain("installer-bg.bmp");
    expect(script).not.toContain("button-one-install.bmp");
    expect(script).toContain("!macro customInstall");
  });

  it("keeps install options on a compact page after the standard directory page", () => {
    const script = readInstallerScript();

    expect(script).toContain("Function VoiceInstallerOptionsPageCreate");
    expect(script).toContain("Function VoiceInstallerOptionsPageLeave");
    expect(script).toContain("VOICE_OPTIONS_PAGE_TITLE");
    expect(script).toContain("VOICE_DESKTOP_SHORTCUT_TEXT");
    expect(script).toContain("VOICE_LAUNCH_AT_LOGIN_TEXT");
    expect(script).toContain(
      '${NSD_CreateCheckbox} 0 16u 100% 12u "${VOICE_DESKTOP_SHORTCUT_TEXT}"',
    );
    expect(script).toContain(
      '${NSD_CreateCheckbox} 0 36u 100% 12u "${VOICE_LAUNCH_AT_LOGIN_TEXT}"',
    );
    expect(script).toContain("${NSD_CreateCheckbox}");
    expect(script).toContain("${NSD_GetState}");
    expect(script).not.toContain("VoiceInstallDirInput");
    expect(script).not.toContain("${NSD_CreateDirRequest}");
    expect(script).not.toContain("${NSD_CreateBrowseButton}");
    expect(script).not.toContain("nsDialogs::SelectFolderDialog");
  });

  it("centers the standard install progress bar and keeps percent text visible", () => {
    const script = readInstallerScript();

    expect(script).toContain(
      "!define MUI_PAGE_CUSTOMFUNCTION_SHOW VoiceInstallProgressPageShow",
    );
    expect(script).toContain(
      "!define MUI_PAGE_CUSTOMFUNCTION_LEAVE VoiceInstallProgressPageLeave",
    );
    expect(script).toContain("Var VoiceInstallProgressBar");
    expect(script).toContain("Var VoiceInstallProgressPercentLabel");
    expect(script).toContain("Var VoiceInstallProgressText");
    expect(script).toContain("!macro customExtractWithProgress FILE");
    expect(script).toContain("Nsis7z::ExtractWithCallback \"${FILE}\" $R9");
    expect(script).toContain("Function VoiceUpdateInstallProgressPercentFromArchive");
    expect(script).toContain("Pop $R8");
    expect(script).toContain("Pop $R9");
    expect(script).toContain("System::Int64Op $R8 * 100");
    expect(script).toContain("System::Int64Op $R7 / $R9");
    expect(script).toContain("Function VoiceInstallProgressPageShow");
    expect(script).toContain("StrCpy $VoiceInstallProgressBar 0");
    expect(script).toContain("StrCpy $VoiceInstallProgressPercentLabel 0");
    expect(script).toContain("StrCpy $VoiceInstallProgressText 0");
    expect(script).toContain("GetDlgItem $1 $0 1004");
    expect(script).toContain("GetDlgItem $VoiceInstallProgressText $0 1006");
    expect(script).toContain("USER32::GetClientRect");
    expect(script).toContain("USER32::SetWindowPos");
    expect(script).toContain("IntOp $7 $7 - 62");
    expect(script).toContain("i0x14");
    expect(script).not.toContain("i0x15");
    expect(script).toContain('USER32::CreateWindowExW(i0,w "STATIC",w "0%"');
    expect(script).toContain("Function VoiceUpdateInstallProgressPercent");
    expect(script).toMatch(
      /Function VoiceInstallProgressPageShow[\s\S]*Call VoiceUpdateInstallProgressPercent[\s\S]*FunctionEnd/,
    );
    expect(script).toContain(
      "${NSD_CreateTimer} VoiceUpdateInstallProgressPercent 250",
    );
    expect(script).toContain(
      "${NSD_ProgressBar_GetPos} $VoiceInstallProgressBar $0",
    );
    expect(script).toContain(
      "SendMessage $VoiceInstallProgressBar ${PBM_GETRANGE} 0 0 $1",
    );
    expect(script).not.toContain("IntOp $1 $1 >> 16");
    expect(script).not.toContain("IntOp $1 $1 & 0xFFFF");
    expect(script).toContain(
      '${NSD_SetText} $VoiceInstallProgressPercentLabel "$1"',
    );
    expect(script).toContain('${NSD_SetText} $VoiceInstallProgressText "$1"');
    expect(script).toContain("Function VoiceInstallProgressPageLeave");
    expect(script).toContain(
      "${NSD_KillTimer} VoiceUpdateInstallProgressPercent",
    );
    expect(script).toContain(
      '${NSD_SetText} $VoiceInstallProgressPercentLabel "100%"',
    );
    expect(script).toContain('${NSD_SetText} $VoiceInstallProgressText "100%"');
  });

  it("runs preflight checks before the install page starts", () => {
    const script = readInstallerScript();

    expect(script).toContain("Function VoicePreflightInstall");
    expect(script).toContain("Function VoiceValidateInstallDir");
    expect(script).toContain("Function VoiceValidateInstallDirWritable");
    expect(script).toContain("Function VoiceValidateDiskSpace");
    expect(script).toContain("Call VoiceValidateInstallDir");
    expect(script).toContain("Call VoiceValidateInstallDirWritable");
    expect(script).toContain("Call VoiceValidateDiskSpace");
    expect(script).toContain("Call VoicePreflightInstall");
    expect(script).toContain('${GetRoot} "$INSTDIR" $0');
    expect(script).toContain('${DriveSpace} "$0" "/D=F /S=M" $1');
    expect(script).toContain("VOICE_MIN_FREE_SPACE_MB");
    expect(script).toContain("VOICE_DIR_NOT_WRITABLE_TEXT");
    expect(script).toContain("VOICE_DISK_SPACE_REQUIRED_TEXT");
  });

  it("keeps launch-after-finish without using electron-builder default run hook", () => {
    const script = readInstallerScript();

    expect(script).toContain("!macro customFinishPage");
    expect(script).toContain("!define MUI_FINISHPAGE_RUN");
    expect(script).toContain(
      '!define MUI_FINISHPAGE_RUN_FUNCTION "VoiceStartAppAfterFinish"',
    );
    expect(script).toContain("Function VoiceStartAppAfterFinish");
    expect(script).toContain(
      'ExecShell "open" "$INSTDIR\\${PRODUCT_FILENAME}.exe" "--post-install-login"',
    );
    expect(script).not.toContain("${StdUtils.ExecShellAsUser}");
  });

  it("keeps installer-shell environment options as defaults for shortcuts and first-run settings", () => {
    const script = readInstallerScript();

    expect(script).toContain('ReadEnvStr $0 "VOICE_CREATE_DESKTOP_SHORTCUT"');
    expect(script).toContain('ReadEnvStr $0 "VOICE_LAUNCH_AT_LOGIN"');
    expect(script).toContain("Function VoiceWriteInstallOptions");
    expect(script).toContain('"$INSTDIR\\resources\\install-options.json"');
    expect(script).toContain('{"appBehavior":{"launchAtLogin":');
    expect(script).toContain('CreateShortCut "$newDesktopLink"');
  });

  it("does not write first-run install options during silent updates", () => {
    const script = readInstallerScript();

    expect(script).toContain("IfSilent 0 voice_write_install_options_continue");
    expect(script).toContain("${GetParameters} $0");
    expect(script).toContain('${GetOptions} "$0" "--updated" $1');
    expect(script).toContain("IfErrors voice_write_install_options_continue");
    expect(script).toContain("Goto voice_write_install_options_done");
  });

  it("does not create a startup-folder shortcut in addition to Electron login items", () => {
    const script = readInstallerScript();

    expect(script).not.toContain('CreateShortCut "$SMSTARTUP\\${SHORTCUT_NAME}.lnk"');
  });

  it("repairs legacy uninstall registry values before electron-builder upgrades", () => {
    const script = readInstallerScript();

    expect(script).toContain("Call VoiceRepairLegacyUninstallRegistry");
    expect(script).toContain(
      '!define VOICE_UNINSTALL_REGISTRY_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${UNINSTALL_APP_KEY}"',
    );
    expect(script).toContain("Function VoiceRepairLegacyUninstallRegistry");
    expect(script).toContain(
      'ReadRegStr $0 SHELL_CONTEXT "${VOICE_UNINSTALL_REGISTRY_KEY}" UninstallString',
    );
    expect(script).toContain(
      'WriteRegStr SHELL_CONTEXT "${VOICE_UNINSTALL_REGISTRY_KEY}" UninstallString',
    );
    expect(script).toContain(
      'WriteRegStr SHELL_CONTEXT "${VOICE_UNINSTALL_REGISTRY_KEY}" QuietUninstallString',
    );
  });

  it("uses the standard NSIS uninstall flow instead of the custom Electron uninstall UI", () => {
    const script = readInstallerScript();

    expect(script).not.toContain("!macro customUnInit");
    expect(script).not.toContain(
      "ExecWait '\"$INSTDIR\\${APP_EXECUTABLE_FILENAME}\" --uninstall' $0",
    );
    expect(script).not.toContain("SetSilent silent");
    expect(script).not.toContain("MUI_CUSTOMFUNCTION_UNGUIINIT");
    expect(script).not.toContain("VoiceResizeUninstallWindow");
    expect(script).toContain("!macro customUnInstall");
  });

  it("removes Electron app data from the NSIS uninstall section", () => {
    const script = readInstallerScript();

    expect(script).toContain('RMDir /r "$APPDATA\\${APP_PACKAGE_NAME}"');
    expect(script).toContain("!macro customUnInstall");
  });

  it("uses explicit System plugin signatures when setting installer environment", () => {
    const script = readInstallerScript();

    expect(script).toContain(
      'System::Call \'Kernel32::SetEnvironmentVariable(t, t)i ("VOICE_INSTALL_DIR", "$INSTDIR").r3\'',
    );
    expect(script).toContain(
      'System::Call \'Kernel32::SetEnvironmentVariable(t, t)i ("VOICE_EXE_NAME", "${APP_EXECUTABLE_FILENAME}").r3\'',
    );
    expect(script).toContain(
      'System::Call \'Kernel32::SetEnvironmentVariable(t, p)i ("VOICE_INSTALL_DIR", 0).r3\'',
    );
    expect(script).toContain(
      'System::Call \'Kernel32::SetEnvironmentVariable(t, p)i ("VOICE_EXE_NAME", 0).r3\'',
    );
  });
});
