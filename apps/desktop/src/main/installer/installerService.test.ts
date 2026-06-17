import { EventEmitter } from "node:events";
import { join, win32 } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  appendProductDirectory,
  createInstallerService,
  resolveDefaultInstallDir,
  resolveInstallerModeMarkerPath,
  resolveInstallerPayloadPath,
  shouldOpenInstallerShell,
} from "./installerService";

describe("installer shell service", () => {
  it("uses a per-user Programs directory as the default install location", () => {
    expect(
      resolveDefaultInstallDir({
        localAppData: "C:/Users/Alex/AppData/Local",
        productName: "Voice Assistant",
      }),
    ).toBe(
      win32.join("C:/Users/Alex/AppData/Local", "Programs", "Voice Assistant"),
    );
  });

  it("keeps a selected app directory but appends the product directory for a parent folder", () => {
    expect(
      appendProductDirectory("C:/Tools/Voice Assistant", "Voice Assistant"),
    ).toBe("C:/Tools/Voice Assistant");
    expect(appendProductDirectory("C:/Tools", "Voice Assistant")).toBe(
      win32.join("C:/Tools", "Voice Assistant"),
    );
  });

  it("resolves the inner NSIS payload from packaged resources", () => {
    expect(resolveInstallerPayloadPath("C:/app/resources")).toBe(
      join("C:/app/resources", "installer-shell-payload", "app-setup.exe"),
    );
  });

  it("opens installer-shell mode from a CLI flag or packaged marker file", () => {
    expect(shouldOpenInstallerShell(["app.exe", "--installer-shell"], false)).toBe(
      true,
    );
    expect(shouldOpenInstallerShell(["app.exe"], true)).toBe(true);
    expect(shouldOpenInstallerShell(["app.exe"], false)).toBe(false);
    expect(
      shouldOpenInstallerShell(["app.exe", "--uninstall"], true),
    ).toBe(false);
    expect(
      shouldOpenInstallerShell(["app.exe", "/uninstall"], true),
    ).toBe(false);
    expect(resolveInstallerModeMarkerPath("C:/app/resources")).toBe(
      join(
        "C:/app/resources",
        "installer-shell-payload",
        "installer-shell.json",
      ),
    );
  });

  it("runs the inner installer silently with UI-selected options", async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout?: EventEmitter;
      stderr?: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const spawn = vi.fn(() => child);
    const service = createInstallerService({
      productName: "Voice Assistant",
      resourcesPath: "C:/app/resources",
      localAppData: "C:/Users/Alex/AppData/Local",
      spawn,
      existsSync: () => true,
    });

    const installPromise = service.install({
      installDir: "C:/Tools/Voice Assistant",
      createDesktopShortcut: false,
      launchAtLogin: false,
    });
    child.emit("close", 0);

    await expect(installPromise).resolves.toEqual({
      ok: true,
      installDir: "C:/Tools/Voice Assistant",
    });
    expect(spawn).toHaveBeenCalledWith(
      join("C:/app/resources", "installer-shell-payload", "app-setup.exe"),
      ["/S", "/currentuser", "/D=C:/Tools/Voice Assistant"],
      expect.objectContaining({
        windowsHide: true,
        env: expect.objectContaining({
          VOICE_CREATE_DESKTOP_SHORTCUT: "0",
          VOICE_LAUNCH_AT_LOGIN: "0",
        }),
      }),
    );
  });

  it("marks silent installer runs as updates when requested", async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout?: EventEmitter;
      stderr?: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const spawn = vi.fn(() => child);
    const service = createInstallerService({
      productName: "Voice Assistant",
      resourcesPath: "C:/app/resources",
      localAppData: "C:/Users/Alex/AppData/Local",
      spawn,
      existsSync: () => true,
    });

    const installPromise = service.install({
      installDir: "C:/Tools/Voice Assistant",
      createDesktopShortcut: true,
      launchAtLogin: true,
      updated: true,
    });
    child.emit("close", 0);

    await expect(installPromise).resolves.toEqual({
      ok: true,
      installDir: "C:/Tools/Voice Assistant",
    });
    expect(spawn).toHaveBeenCalledWith(
      join("C:/app/resources", "installer-shell-payload", "app-setup.exe"),
      ["--updated", "/S", "/currentuser", "/D=C:/Tools/Voice Assistant"],
      expect.objectContaining({
        windowsHide: true,
        env: expect.not.objectContaining({
          VOICE_CREATE_DESKTOP_SHORTCUT: expect.any(String),
          VOICE_LAUNCH_AT_LOGIN: expect.any(String),
        }),
      }),
    );
  });

  it("reports installer path, install dir, signal, and output on failure", async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout?: EventEmitter;
      stderr?: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const spawn = vi.fn(() => child);
    const service = createInstallerService({
      productName: "Voice Assistant",
      resourcesPath: "C:/app/resources",
      localAppData: "C:/Users/Alex/AppData/Local",
      spawn,
      existsSync: () => true,
    });

    const installPromise = service.install({
      installDir: "C:/Tools",
      createDesktopShortcut: true,
      launchAtLogin: true,
    });
    child.stderr.emit("data", Buffer.from("native crash"));
    child.emit("close", 3221225477, "SIGSEGV");

    await expect(installPromise).rejects.toThrow(
      "Installer failed (code 3221225477 / 0xc0000005, signal SIGSEGV). Payload: C:\\app\\resources\\installer-shell-payload\\app-setup.exe. Install dir: C:\\Tools\\Voice Assistant. Output: native crash",
    );
  });

  it("logs installer lifecycle without dumping installer output", async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout?: EventEmitter;
      stderr?: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const logs: string[] = [];
    const warnings: string[] = [];
    const service = createInstallerService({
      productName: "Voice Assistant",
      resourcesPath: "C:/app/resources",
      localAppData: "C:/Users/Alex/AppData/Local",
      spawn: vi.fn(() => child),
      existsSync: () => true,
      logger: {
        log: (message) => logs.push(message),
        warn: (message) => warnings.push(message),
      },
    });

    const installPromise = service.install({
      installDir: "C:/Tools",
      createDesktopShortcut: false,
      launchAtLogin: true,
    });
    child.stderr.emit("data", Buffer.from("secret native output"));
    child.emit("close", 1);

    await expect(installPromise).rejects.toThrow("Installer failed");
    expect(logs).toContain(
      "[installer] install started payloadPath=C:\\app\\resources\\installer-shell-payload\\app-setup.exe installDir=C:\\Tools\\Voice Assistant createDesktopShortcut=false launchAtLogin=true updated=false",
    );
    expect(warnings).toContain(
      "[installer] install failed exitCode=1 signal=none outputLength=20 installDir=C:\\Tools\\Voice Assistant",
    );
    expect([...logs, ...warnings].join("\n")).not.toContain("secret native output");
  });

  it("logs when installer payload is missing", async () => {
    const warnings: string[] = [];
    const service = createInstallerService({
      productName: "Voice Assistant",
      resourcesPath: "C:/app/resources",
      localAppData: "C:/Users/Alex/AppData/Local",
      existsSync: () => false,
      logger: {
        log: () => undefined,
        warn: (message) => warnings.push(message),
      },
    });

    await expect(
      service.install({
        installDir: "C:/Tools",
        createDesktopShortcut: true,
        launchAtLogin: true,
      }),
    ).rejects.toThrow("Installer payload not found");
    expect(warnings).toEqual([
      "[installer] payload missing payloadPath=C:\\app\\resources\\installer-shell-payload\\app-setup.exe",
    ]);
  });
});
