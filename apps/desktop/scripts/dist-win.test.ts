import { fileURLToPath } from "node:url";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDistInstallerShellCommands,
  createDistWinCommands,
  createInstallerShellCommands,
  parseDistWinOptions,
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
        env: undefined,
      },
      {
        command: "pnpm",
        args: ["run", "build"],
        cwd: packageRoot,
        env: undefined,
      },
      {
        command: "electron-builder",
        args: ["--win", "nsis", "--config", "electron-builder.yml"],
        cwd: packageRoot,
        env: undefined,
      },
    ]);
  });

  it("excludes native helper build cache from packaged app files", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));
    const config = readFileSync(join(packageRoot, "electron-builder.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as { build?: { files?: string[] } };

    expect(config).toContain("- \"!**/target/**\"");
    expect(packageJson.build?.files).toContain("!**/target/**");
  });

  it("keeps only the supported Electron locale packs after packaging", async () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const packageRoot = fileURLToPath(new URL("..", scriptUrl));
    const config = readFileSync(join(packageRoot, "electron-builder.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as { build?: { afterPack?: string } };
    const { cleanupElectronLocales } = (await import("./after-pack.mjs")) as {
      cleanupElectronLocales(localesDir: string): string[];
    };
    const tempRoot = mkdtempSync(join(tmpdir(), "aoa-locales-"));
    const localesDir = join(tempRoot, "locales");

    try {
      mkdirSync(localesDir, { recursive: true });
      for (const name of [
        "en-US.pak",
        "zh-CN.pak",
        "zh-TW.pak",
        "fr.pak",
        "ja.pak",
        "README.txt",
      ]) {
        writeFileSync(join(localesDir, name), "");
      }

      const removed = cleanupElectronLocales(localesDir);

      expect(config).toContain("afterPack: scripts/after-pack.mjs");
      expect(packageJson.build?.afterPack).toBe("scripts/after-pack.mjs");
      expect(removed).toEqual(["fr.pak", "ja.pak"]);
      expect(readdirSync(localesDir).sort()).toEqual([
        "README.txt",
        "en-US.pak",
        "zh-CN.pak",
        "zh-TW.pak",
      ]);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("passes the requested version phase into build and packaging commands", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const commands = createDistWinCommands(scriptUrl, { phase: "RELEASE" });

    expect(commands.map((command) => command.env)).toEqual([
      { AOA_VERSION_PHASE: "RELEASE" },
      { AOA_VERSION_PHASE: "RELEASE" },
      { AOA_VERSION_PHASE: "RELEASE" },
    ]);
  });

  it("keeps the caller environment when no phase is requested", () => {
    const scriptUrl = new URL("./dist-win.mjs", import.meta.url);
    const commands = createDistWinCommands(scriptUrl);

    expect(commands.map((command) => command.env)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("parses a release phase from distribution arguments", () => {
    expect(parseDistWinOptions(["--phase", "release"])).toEqual({
      phase: "RELEASE",
    });
    expect(parseDistWinOptions([])).toEqual({});
  });

  it("rejects unsupported distribution phases", () => {
    expect(() => parseDistWinOptions(["--phase", "PREVIEW"])).toThrow(
      "Unsupported version phase: PREVIEW",
    );
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
        env: undefined,
      },
      {
        command: "pnpm",
        args: ["run", "build"],
        cwd: packageRoot,
        env: undefined,
      },
      {
        command: "electron-builder",
        args: ["--win", "nsis", "--config", "electron-builder.yml"],
        cwd: packageRoot,
        env: undefined,
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
