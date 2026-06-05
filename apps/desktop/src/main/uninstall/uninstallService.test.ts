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

  it("writes and launches a hidden cleanup script for the packaged Windows uninstaller", async () => {
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

    expect(options.writeFile).toHaveBeenCalledTimes(1);
    const [scriptPath, scriptContent] = vi.mocked(options.writeFile).mock
      .calls[0] as [string, string];
    expect(scriptPath).toContain("voice-assistant-uninstall-1234.ps1");
    expect(scriptContent).toContain(
      "$UninstallerPath = 'C:\\Program Files\\Voice Assistant\\Uninstall Voice Assistant.exe'",
    );
    expect(scriptContent).toContain("Start-Process");
    expect(scriptContent).toContain("/currentuser");
    expect(scriptContent).toContain("--delete-app-data");
    expect(scriptContent).toContain("Remove-Item -LiteralPath $PSCommandPath");
    expect(options.spawnDetached).toHaveBeenCalledWith(
      "powershell.exe",
      expect.arrayContaining(["-File", scriptPath]),
      expect.objectContaining({
        detached: true,
        cwd: options.tempDir,
        stdio: "ignore",
        windowsHide: true,
      }),
    );
    expect(result).toEqual({
      ok: true,
      mode: "packaged",
      launchedCleanup: true,
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
