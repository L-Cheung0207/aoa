import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDistInstallerShellCommands,
  createDistWinCommands,
  createInstallerShellCommands,
  removeLegacyInstallerShellArtifacts,
  resolveInstallerPayloadSetupPath,
  validateInstallerPayloadSetup,
} from "./dist-win.mjs";

describe("desktop Windows distribution script", () => {
  it("builds the native helper before packaging the single-layer NSIS installer", () => {
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
    ]);
  });

  it("can build the legacy installer shell distribution explicitly", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const commands = createDistInstallerShellCommands(scriptUrl);
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
      {
        command: "node",
        args: ["scripts/dist-win.mjs", "--remove-legacy-installer-shell-artifacts"],
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

  it("can build only the outer installer shell when the payload is already prepared", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));

    expect(createInstallerShellCommands(scriptUrl)).toEqual([
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

  it("rejects a tiny NSIS stub instead of preparing an empty payload", () => {
    expect(() =>
      validateInstallerPayloadSetup("C:/app/dist-electron/Voice Assistant Setup 0.1.0.exe", {
        statSync: () => ({ size: 552_515 }),
        readdirSync: () => ["@voicedesktop-0.1.0-x64.nsis.7z"],
      }),
    ).toThrow(
      "Installer payload looks incomplete: C:/app/dist-electron/Voice Assistant Setup 0.1.0.exe is only 552515 bytes and dist-electron contains @voicedesktop-0.1.0-x64.nsis.7z.",
    );
  });

  it("removes stale outer installer artifacts that used the old file name", () => {
    const removed: string[] = [];
    removeLegacyInstallerShellArtifacts("C:/app", {
      readdirSync: () => [
        "Voice Assistant Installer 0.1.0.exe",
        "Voice Assistant Installer 0.1.0.exe.blockmap",
        "Voice Assistant Setup 0.1.0.exe",
      ],
      rmSync: (path: string) => removed.push(path),
    });

    expect(removed).toEqual([
      join("C:/app", "dist-electron", "Voice Assistant Installer 0.1.0.exe"),
      join(
        "C:/app",
        "dist-electron",
        "Voice Assistant Installer 0.1.0.exe.blockmap",
      ),
    ]);
  });
});
