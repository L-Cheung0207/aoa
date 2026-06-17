import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJsonPath = resolve(__dirname, "../../../package.json");
const electronBuilderConfigPath = resolve(__dirname, "../../../electron-builder.yml");
const installerShellBuilderConfigPath = resolve(
  __dirname,
  "../../../electron-builder.installer-shell.yml"
);
const bootstrapPath = resolve(__dirname, "../bootstrap.ts");
const appIconPath = resolve(__dirname, "../windows/appIcon.ts");

describe("desktop installer icon configuration", () => {
  it("uses the shared app icon for packaging and runtime tray assets", () => {
    const packageJson = readFileSync(packageJsonPath, "utf8");
    const electronBuilderConfig = readFileSync(electronBuilderConfigPath, "utf8");
    const installerShellBuilderConfig = readFileSync(
      installerShellBuilderConfigPath,
      "utf8"
    );
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    const appIcon = readFileSync(appIconPath, "utf8");

    expect(packageJson).toContain('"from": "resources/app-icon.ico"');
    expect(packageJson).toContain('"icon": "resources/app-icon.ico"');
    expect(packageJson).toContain('"signAndEditExecutable": false');
    expect(packageJson).toContain('"installerLanguages"');
    expect(packageJson).toContain('"zh_TW"');
    expect(packageJson).toContain('"language": "1028"');
    expect(packageJson).not.toContain("nsis-header.bmp");
    expect(packageJson).not.toContain("nsis-sidebar.bmp");
    expect(packageJson).not.toContain("resources/tray-icon.ico");

    expect(electronBuilderConfig).toContain("from: resources/app-icon.ico");
    expect(electronBuilderConfig).toContain("to: app-icon.ico");
    expect(electronBuilderConfig).toContain("icon: resources/app-icon.ico");
    expect(electronBuilderConfig).toContain("signAndEditExecutable: false");
    expect(electronBuilderConfig).toContain("allowToChangeInstallationDirectory: true");
    expect(electronBuilderConfig).toContain("installerLanguages:");
    expect(electronBuilderConfig).toContain("- zh_TW");
    expect(electronBuilderConfig).toContain('language: "1028"');
    expect(electronBuilderConfig).toContain("runAfterFinish: false");
    expect(electronBuilderConfig).toContain("publish:");
    expect(electronBuilderConfig).toContain("provider: generic");
    expect(electronBuilderConfig).not.toContain("nsis-header.bmp");
    expect(electronBuilderConfig).not.toContain("nsis-sidebar.bmp");
    expect(electronBuilderConfig).not.toContain("resources/tray-icon.ico");

    expect(installerShellBuilderConfig).toContain("icon: resources/app-icon.ico");
    expect(installerShellBuilderConfig).toContain("signAndEditExecutable: false");

    expect(bootstrap).not.toContain('"tray-icon.ico"');
    expect(appIcon).toContain('const APP_ICON_FILE_NAME = "app-icon.ico"');
    expect(bootstrap).not.toContain('"tray-icon.ico"');
  });
});
