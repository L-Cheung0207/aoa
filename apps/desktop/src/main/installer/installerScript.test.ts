import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const installerScriptPath = resolve(
  __dirname,
  "../../../installer-resources/installer.nsh",
);
const installerTermsPath = resolve(
  __dirname,
  "../../../installer-resources/terms.txt",
);

function readInstallerScript(): string {
  return readFileSync(installerScriptPath, "utf8");
}

function readAgreementTerms(): { raw: Buffer; text: string } {
  const raw = readFileSync(installerTermsPath);
  const hasUtf16LeBom = raw[0] === 0xff && raw[1] === 0xfe;
  const text = hasUtf16LeBom
    ? raw.subarray(2).toString("utf16le")
    : raw.toString("utf8");

  return { raw, text };
}

describe("single-layer NSIS installer script", () => {
  it("uses standard NSIS pages instead of a custom first-screen installer", () => {
    const script = readInstallerScript();

    expect(script).toContain("nsDialogs.nsh");
    expect(script).toContain("FileFunc.nsh");
    expect(script).toContain('!define MUI_FONT "Microsoft YaHei UI"');
    expect(script).toContain('!define MUI_FONTSIZE "9"');
    expect(script).toContain('SetFont "Microsoft YaHei UI" 9');
    expect(script).toContain('!define VOICE_LICENSE_TOP_TEXT "閱讀協議內容。"');
    expect(script).toContain(
      '!define VOICE_LICENSE_BOTTOM_TEXT "必須接受協議才能繼續安裝 Voice Assistant。"',
    );
    expect(script).toContain(
      '!define MUI_LICENSEPAGE_TEXT_TOP "${VOICE_LICENSE_TOP_TEXT}"',
    );
    expect(script).toContain(
      '!define MUI_LICENSEPAGE_TEXT_BOTTOM "${VOICE_LICENSE_BOTTOM_TEXT}"',
    );
    expect(script).not.toContain("MUI_HEADER_TRANSPARENT_TEXT");
    expect(script).not.toContain("MUI_COMPONENTSPAGE_SMALLDESC");
    expect(script).toContain("!macro licensePage");
    expect(script).toContain("!insertmacro MUI_PAGE_LICENSE");
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

  it("bundles a UTF-16LE agreement file for the standard license page", () => {
    const script = readInstallerScript();
    const { raw, text } = readAgreementTerms();

    expect(script).toContain('!define VOICE_AGREEMENT_FILE "terms.txt"');
    expect(script).toContain(
      '!insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\\${VOICE_AGREEMENT_FILE}"',
    );
    expect(raw.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xfe]));
    expect(text).toContain("Voice Assistant Service");
    expect(text).toContain("用戶使用協議");
    expect(text).toContain("安裝程式");
    expect(text).toContain("terms.txt");
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

  it("centers the standard install progress bar on the install page", () => {
    const script = readInstallerScript();

    expect(script).toContain(
      "!define MUI_PAGE_CUSTOMFUNCTION_SHOW VoiceInstallProgressPageShow",
    );
    expect(script).toContain("Function VoiceInstallProgressPageShow");
    expect(script).toContain("GetDlgItem $1 $0 1004");
    expect(script).toContain("USER32::GetClientRect");
    expect(script).toContain("USER32::SetWindowPos");
    expect(script).toContain("i0x15");
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
      'ExecShell "open" "$INSTDIR\\${PRODUCT_FILENAME}.exe"',
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
