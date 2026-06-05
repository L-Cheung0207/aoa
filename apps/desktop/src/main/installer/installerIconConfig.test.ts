import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJsonPath = resolve(__dirname, "../../../package.json");
const electronBuilderConfigPath = resolve(__dirname, "../../../electron-builder.yml");
const bootstrapPath = resolve(__dirname, "../bootstrap.ts");

describe("desktop installer icon configuration", () => {
  it("uses the shared app icon for packaging and runtime tray assets", () => {
    const packageJson = readFileSync(packageJsonPath, "utf8");
    const electronBuilderConfig = readFileSync(electronBuilderConfigPath, "utf8");
    const bootstrap = readFileSync(bootstrapPath, "utf8");

    expect(packageJson).toContain('"from": "resources/app-icon.ico"');
    expect(packageJson).toContain('"icon": "resources/app-icon.ico"');
    expect(packageJson).not.toContain("resources/tray-icon.ico");

    expect(electronBuilderConfig).toContain("from: resources/app-icon.ico");
    expect(electronBuilderConfig).toContain("to: app-icon.ico");
    expect(electronBuilderConfig).toContain("icon: resources/app-icon.ico");
    expect(electronBuilderConfig).not.toContain("resources/tray-icon.ico");

    expect(bootstrap).toContain('"app-icon.ico"');
    expect(bootstrap).not.toContain('"tray-icon.ico"');
  });
});
