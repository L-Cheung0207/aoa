import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDistWinCommands, resolveInstallerPayloadSetupPath } from "./dist-win.mjs";

describe("desktop Windows distribution script", () => {
  it("builds the native helper before packaging the Electron app", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const commands = createDistWinCommands(scriptUrl);
    const workspaceRoot = fileURLToPath(new URL("../../..", scriptUrl));
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));

    expect(commands).toEqual([
      {
        command: "pnpm",
        args: ["--filter", "@voice/native-helper", "build:native"],
        cwd: workspaceRoot,
      },
      {
        command: "pnpm",
        args: ["run", "build"],
        cwd: packageRoot,
      },
      {
        command: "electron-builder",
        args: ["--win", "nsis", "--config", "electron-builder.yml"],
        cwd: packageRoot,
      },
      {
        command: "node",
        args: ["scripts/dist-win.mjs", "--prepare-installer-shell-payload"],
        cwd: packageRoot,
      },
      {
        command: "electron-builder",
        args: [
          "--win",
          "portable",
          "--config",
          "electron-builder.installer-shell.yml",
        ],
        cwd: packageRoot,
      },
    ]);
  });

  it("resolves the payload setup file name produced by the inner NSIS build", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));

    expect(resolveInstallerPayloadSetupPath(packageRoot)).toBe(
      join(packageRoot, "dist-electron", "Voice Assistant Setup 0.1.0.exe"),
    );
  });

  it("uses the package version when resolving the inner NSIS setup file", () => {
    expect(
      resolveInstallerPayloadSetupPath("C:/app", {
        readPackageJson: () => '{"version":"2.3.4"}',
      }),
    ).toBe(join("C:/app", "dist-electron", "Voice Assistant Setup 2.3.4.exe"));
  });
});
