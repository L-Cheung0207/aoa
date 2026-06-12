import { describe, expect, it, vi } from "vitest";
import { createUninstallService } from "./uninstallService";

function createOptions(
  overrides: Partial<Parameters<typeof createUninstallService>[0]> = {},
): Parameters<typeof createUninstallService>[0] {
  return {
    app: {
      isPackaged: false,
      getPath: (name) =>
        name === "logs"
          ? "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant\\logs"
          : "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant",
      setLoginItemSettings: vi.fn(),
      quit: vi.fn(),
    },
    executablePath:
      "D:\\workspace\\voice-electron\\new\\node_modules\\electron\\dist\\electron.exe",
    pid: 1234,
    platform: "win32",
    tempDir: "C:\\Users\\Alex\\AppData\\Local\\Temp",
    ensureDirectory: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined),
    spawnDetached: vi.fn(() => undefined),
    ...overrides,
  };
}

describe("uninstall service", () => {
  it("turns off launch at login without scheduling self-delete in development", async () => {
    const options = createOptions();
    const service = createUninstallService(options);

    const result = await service.performUninstall();

    expect(options.app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: false,
      openAsHidden: false,
    });
    expect(options.writeFile).not.toHaveBeenCalled();
    expect(options.spawnDetached).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      mode: "development",
      launchedCleanup: false,
      cleanupPaths: [],
    });
  });

  it("lets the waiting NSIS uninstaller continue after packaged Windows confirmation", async () => {
    const options = createOptions({
      app: {
        isPackaged: true,
        getPath: (name) =>
          name === "logs"
            ? "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant\\logs"
            : "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant",
        setLoginItemSettings: vi.fn(),
        quit: vi.fn(),
      },
      executablePath: "C:\\Program Files\\Voice Assistant\\Voice Assistant.exe",
    });
    const service = createUninstallService(options);

    const result = await service.performUninstall();

    expect(options.writeFile).not.toHaveBeenCalled();
    expect(options.spawnDetached).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      mode: "packaged",
      launchedCleanup: false,
      cleanupPaths: [
        "C:\\Program Files\\Voice Assistant",
        "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant",
        "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant\\logs",
      ],
    });
  });

  it("refuses to schedule cleanup when the executable directory is unsafe", async () => {
    const options = createOptions({
      app: {
        isPackaged: true,
        getPath: () => "C:\\Users\\Alex\\AppData\\Roaming\\Voice Assistant",
        setLoginItemSettings: vi.fn(),
        quit: vi.fn(),
      },
      executablePath: "C:\\Voice Assistant.exe",
    });
    const service = createUninstallService(options);

    await expect(service.performUninstall()).rejects.toThrow(
      "Refusing to uninstall from unsafe install directory",
    );
    expect(options.writeFile).not.toHaveBeenCalled();
    expect(options.spawnDetached).not.toHaveBeenCalled();
  });
});
