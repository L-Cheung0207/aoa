import { describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import {
  buildAppBuilderRceditArgs,
  createDevElectronEnv,
  createDevElectronPaths,
  createElectronViteDevArgs,
  prepareDevElectronExecutable,
  resolveCachedRceditPath,
} from "./dev-electron.mjs";

describe("desktop development Electron launcher", () => {
  it("uses a branded Electron executable in development", () => {
    const paths = createDevElectronPaths("D:/repo/apps/desktop", "D:/repo", "win32");

    expect(paths.sourceElectronExe).toBe(
      join("D:/repo", "node_modules", "electron", "dist", "electron.exe"),
    );
    expect(paths.sourceElectronDir).toBe(
      join("D:/repo", "node_modules", "electron", "dist"),
    );
    expect(paths.devElectronDir).toBe(
      join("D:/repo/apps/desktop", ".dev-electron", "electron-dist"),
    );
    expect(paths.devElectronExe).toBe(
      join(
        "D:/repo/apps/desktop",
        ".dev-electron",
        "electron-dist",
        "Voice Assistant Dev.exe",
      ),
    );
    expect(paths.sourceConfigPath).toBe(
      join("D:/repo/apps/desktop", "config.json"),
    );
    expect(paths.devResourcesDir).toBe(
      join("D:/repo/apps/desktop", ".dev-electron", "electron-dist", "resources"),
    );
    expect(paths.devConfigPath).toBe(
      join(
        "D:/repo/apps/desktop",
        ".dev-electron",
        "electron-dist",
        "resources",
        "config.json",
      ),
    );
    expect(paths.iconPath).toBe(
      join("D:/repo/apps/desktop", "resources", "app-icon.ico"),
    );
    expect(paths.shouldBrandExecutable).toBe(true);
  });

  it("uses the Electron app bundle executable on macOS", () => {
    const paths = createDevElectronPaths("/repo/apps/desktop", "/repo", "darwin");
    const sourceElectronExe = join(
      "/repo",
      "node_modules",
      "electron",
      "dist",
      "Electron.app",
      "Contents",
      "MacOS",
      "Electron",
    );

    expect(paths.sourceElectronExe).toBe(sourceElectronExe);
    expect(paths.devElectronExe).toBe(sourceElectronExe);
    expect(paths.shouldPrepareExecutable).toBe(false);
    expect(paths.shouldBrandExecutable).toBe(false);
  });

  it("passes the branded executable path to electron-vite", () => {
    expect(
      createDevElectronEnv(
        { PATH: "C:/Windows/System32", ELECTRON_EXEC_PATH: "old.exe" },
        "D:/repo/apps/desktop/.dev-electron/Voice Assistant Dev.exe",
      ),
    ).toEqual({
      PATH: "C:/Windows/System32",
      ELECTRON_EXEC_PATH:
        "D:/repo/apps/desktop/.dev-electron/Voice Assistant Dev.exe",
    });
  });

  it("passes extra development launcher arguments to electron-vite", () => {
    expect(
      createElectronViteDevArgs([
        "--",
        "--remoteDebuggingPort",
        "9444",
        "--",
        "--open-home",
      ]),
    ).toEqual([
      "dev",
      "--remoteDebuggingPort",
      "9444",
      "--",
      "--open-home",
    ]);
  });

  it("builds rcedit args that replace the dev executable icon", () => {
    expect(
      buildAppBuilderRceditArgs({
        exePath: "D:/repo/apps/desktop/.dev-electron/Voice Assistant Dev.exe",
        iconPath: "D:/repo/apps/desktop/resources/app-icon.ico",
      }),
    ).toEqual([
      "D:/repo/apps/desktop/.dev-electron/Voice Assistant Dev.exe",
      "--set-icon",
      "D:/repo/apps/desktop/resources/app-icon.ico",
      "--set-version-string",
      "FileDescription",
      "Voice Assistant",
      "--set-version-string",
      "ProductName",
      "Voice Assistant",
      "--set-version-string",
      "InternalName",
      "Voice Assistant Dev",
      "--set-version-string",
      "OriginalFilename",
      "Voice Assistant Dev.exe",
    ]);
  });

  it("uses a cached rcedit executable when electron-builder already downloaded one", () => {
    expect(
      resolveCachedRceditPath({
        localAppData: "C:/Users/Alex/AppData/Local",
        existsSync: (path: string) =>
          path.endsWith("winCodeSign") || path.endsWith("rcedit-x64.exe"),
        readdirSync: (path: string) =>
          path.endsWith("winCodeSign")
            ? ["001", "002", "broken.7z"]
            : path.endsWith("002")
              ? ["rcedit-x64.exe", "rcedit-ia32.exe"]
              : ["rcedit-ia32.exe"],
      }),
    ).toBe(
      join(
        "C:/Users/Alex/AppData/Local",
        "electron-builder",
        "Cache",
        "winCodeSign",
        "002",
        "rcedit-x64.exe",
      ),
    );
  });

  it("returns undefined when no cached rcedit executable exists", () => {
    expect(
      resolveCachedRceditPath({
        localAppData: "C:/Users/Alex/AppData/Local",
        existsSync: () => false,
        readdirSync: () => [],
      }),
    ).toBeUndefined();
  });

  it("throws a clear error when rcedit is unavailable", () => {
    expect(() =>
      prepareDevElectronExecutable({
        copyFileSync: vi.fn(),
        cpSync: vi.fn(),
        existsSync: () => true,
        iconPath: "app-icon.ico",
        mkdirSync: vi.fn(),
        rceditPath: undefined,
        readdirSync: () => [],
        spawnSync: vi.fn(),
        sourceElectronDir: "electron-dist",
        sourceElectronExe: "electron.exe",
        devElectronDir: ".dev-electron",
        devElectronExe: join(".dev-electron", "Voice Assistant Dev.exe"),
      }),
    ).toThrow("rcedit-x64.exe is not available");
  });

  it("copies and brands Electron when the dev executable is missing", () => {
    const copyFileSync = vi.fn();
    const cpSync = vi.fn();
    const mkdirSync = vi.fn();
    const spawnSync = vi.fn(() => ({ status: 0 }));
    const existsSync = vi.fn((path: string) => !path.endsWith("Voice Assistant Dev.exe"));

    prepareDevElectronExecutable({
      appBuilderPath: "app-builder.exe",
      copyFileSync,
      cpSync,
      existsSync,
      iconPath: "app-icon.ico",
      mkdirSync,
      rceditPath: "rcedit-x64.exe",
      readdirSync: () => [],
      spawnSync,
      sourceElectronDir: "electron-dist",
      sourceElectronExe: "electron.exe",
      devElectronDir: ".dev-electron",
      devElectronExe: join(".dev-electron", "Voice Assistant Dev.exe"),
      sourceConfigPath: "config.json",
      devResourcesDir: join(".dev-electron", "resources"),
      devConfigPath: join(".dev-electron", "resources", "config.json"),
    });

    expect(mkdirSync).toHaveBeenCalledWith(".dev-electron", { recursive: true });
    expect(mkdirSync).toHaveBeenCalledWith(join(".dev-electron", "resources"), {
      recursive: true,
    });
    expect(cpSync).toHaveBeenCalledWith("electron-dist", ".dev-electron", {
      force: true,
      recursive: true,
    });
    expect(copyFileSync).toHaveBeenCalledWith("electron.exe", join(".dev-electron", "Voice Assistant Dev.exe"));
    expect(copyFileSync).toHaveBeenCalledWith(
      "config.json",
      join(".dev-electron", "resources", "config.json"),
    );
    expect(spawnSync).toHaveBeenCalledWith(
      "rcedit-x64.exe",
      [
        join(".dev-electron", "Voice Assistant Dev.exe"),
        "--set-icon",
        "app-icon.ico",
        "--set-version-string",
        "FileDescription",
        "Voice Assistant",
        "--set-version-string",
        "ProductName",
        "Voice Assistant",
        "--set-version-string",
        "InternalName",
        "Voice Assistant Dev",
        "--set-version-string",
        "OriginalFilename",
        "Voice Assistant Dev.exe",
      ],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it("skips preparing Electron when the platform does not need a dev executable copy", () => {
    const copyFileSync = vi.fn();
    const cpSync = vi.fn();
    const mkdirSync = vi.fn();
    const spawnSync = vi.fn(() => ({ status: 0 }));
    const existsSync = vi.fn((path: string) => !path.endsWith("Contents/MacOS/Electron"));

    prepareDevElectronExecutable({
      copyFileSync,
      cpSync,
      existsSync,
      iconPath: "app-icon.ico",
      mkdirSync,
      rceditPath: undefined,
      readdirSync: () => [],
      shouldPrepareExecutable: false,
      shouldBrandExecutable: false,
      spawnSync,
      sourceElectronDir: "electron-dist",
      sourceElectronExe: join("electron-dist", "Electron.app", "Contents", "MacOS", "Electron"),
      devElectronDir: ".dev-electron",
      devElectronExe: join(".dev-electron", "Electron.app", "Contents", "MacOS", "Electron"),
      sourceConfigPath: "config.json",
      devResourcesDir: join(".dev-electron", "Electron.app", "Contents", "Resources"),
      devConfigPath: join(
        ".dev-electron",
        "Electron.app",
        "Contents",
        "Resources",
        "config.json",
      ),
    });

    expect(cpSync).not.toHaveBeenCalled();
    expect(copyFileSync).not.toHaveBeenCalled();
    expect(mkdirSync).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("brands an existing dev executable to recover from stale Electron icons", () => {
    const copyFileSync = vi.fn();
    const cpSync = vi.fn();
    const mkdirSync = vi.fn();
    const spawnSync = vi.fn(() => ({ status: 0 }));
    const existsSync = vi.fn(() => true);

    prepareDevElectronExecutable({
      appBuilderPath: "app-builder.exe",
      copyFileSync,
      cpSync,
      existsSync,
      iconPath: "app-icon.ico",
      mkdirSync,
      rceditPath: "rcedit-x64.exe",
      readdirSync: () => [],
      spawnSync,
      sourceElectronDir: "electron-dist",
      sourceElectronExe: "electron.exe",
      devElectronDir: ".dev-electron",
      devElectronExe: join(".dev-electron", "Voice Assistant Dev.exe"),
      sourceConfigPath: "config.json",
      devResourcesDir: join(".dev-electron", "resources"),
      devConfigPath: join(".dev-electron", "resources", "config.json"),
    });

    expect(copyFileSync).toHaveBeenCalledWith(
      "config.json",
      join(".dev-electron", "resources", "config.json"),
    );
    expect(copyFileSync).not.toHaveBeenCalledWith(
      "electron.exe",
      join(".dev-electron", "Voice Assistant Dev.exe"),
    );
    expect(cpSync).not.toHaveBeenCalled();
    expect(spawnSync).toHaveBeenCalledWith(
      "rcedit-x64.exe",
      [
        join(".dev-electron", "Voice Assistant Dev.exe"),
        "--set-icon",
        "app-icon.ico",
        "--set-version-string",
        "FileDescription",
        "Voice Assistant",
        "--set-version-string",
        "ProductName",
        "Voice Assistant",
        "--set-version-string",
        "InternalName",
        "Voice Assistant Dev",
        "--set-version-string",
        "OriginalFilename",
        "Voice Assistant Dev.exe",
      ],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });
});
