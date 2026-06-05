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

describe("silent NSIS payload script", () => {
  it("keeps NSIS focused on silent install work instead of custom UI pages", () => {
    const script = readInstallerScript();

    expect(script).not.toContain("nsDialogs.nsh");
    expect(script).not.toContain("MUI_CUSTOMFUNCTION_GUIINIT");
    expect(script).not.toContain("Page custom VoiceInstallerPageCreate");
    expect(script).not.toContain("Function VoiceCreateWelcomeContent");
    expect(script).not.toContain("installer-bg.bmp");
    expect(script).not.toContain("button-one-install.bmp");
    expect(script).toContain("!macro customInstall");
  });

  it("accepts installer-shell environment options for shortcuts and first-run settings", () => {
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
});
