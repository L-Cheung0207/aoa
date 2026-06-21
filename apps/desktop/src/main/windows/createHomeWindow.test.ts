import { beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

const electronMock = vi.hoisted(() => {
  const instances: Array<{
    loadFile: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
  }> = [];
  const BrowserWindow = vi.fn((options: unknown) => {
    const instance = {
      options,
      loadFile: vi.fn(),
      loadURL: vi.fn(),
    };
    instances.push(instance);
    return instance;
  });

  return { BrowserWindow, instances };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow,
  app: {
    getAppPath: () => join(__dirname, "../../.."),
    isPackaged: false,
  },
}));

vi.mock("./shortcutCaptureWindowGuard", () => ({
  blockHomeWindowAltSpaceMenu: vi.fn(),
}));

describe("createHomeWindow", () => {
  beforeEach(() => {
    electronMock.BrowserWindow.mockClear();
    electronMock.instances.length = 0;
    vi.unstubAllEnvs();
  });

  it("creates the home window without the native title bar or menu bar", async () => {
    const { createHomeWindow } = await import("./createHomeWindow");

    createHomeWindow();

    expect(electronMock.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        autoHideMenuBar: true,
        frame: false,
      }),
    );
  });

  it("sets the shared app icon for the Windows taskbar", async () => {
    const { createHomeWindow } = await import("./createHomeWindow");

    createHomeWindow();

    expect(electronMock.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: join(__dirname, "../../../resources/app-icon.ico"),
        title: "Voice Assistant",
      }),
    );
  });

  it("includes the initial theme in the development renderer URL", async () => {
    vi.stubEnv("ELECTRON_RENDERER_URL", "http://localhost:5173");
    const { createHomeWindow } = await import("./createHomeWindow");

    createHomeWindow({ section: "settings", theme: "light" });

    expect(electronMock.instances[0]?.loadURL).toHaveBeenCalledWith(
      "http://localhost:5173?theme=light#/home-settings",
    );
  });

});
