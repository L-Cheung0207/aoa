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

const shortcutGuardMock = vi.hoisted(() => ({
  blockHomeWindowAltSpaceMenu: vi.fn(),
}));

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow,
  app: {
    getAppPath: () => join(__dirname, "../../.."),
    isPackaged: false,
  },
}));

vi.mock("./shortcutCaptureWindowGuard", () => ({
  blockHomeWindowAltSpaceMenu: shortcutGuardMock.blockHomeWindowAltSpaceMenu,
}));

describe("createLoginSetupWindow", () => {
  beforeEach(() => {
    electronMock.BrowserWindow.mockClear();
    electronMock.instances.length = 0;
    shortcutGuardMock.blockHomeWindowAltSpaceMenu.mockClear();
    vi.unstubAllEnvs();
  });

  it("creates a frameless login setup window", async () => {
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    const window = createLoginSetupWindow();

    expect(electronMock.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 960,
        height: 680,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        autoHideMenuBar: true,
        show: false,
        title: "Voice Assistant",
      }),
    );
    expect(shortcutGuardMock.blockHomeWindowAltSpaceMenu).toHaveBeenCalledWith(
      window,
    );
  });

  it("loads the login setup route in production", async () => {
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow();

    expect(electronMock.instances[0]?.loadFile).toHaveBeenCalledWith(
      expect.stringContaining("index.html"),
      { hash: "login-setup" },
    );
  });

  it("loads the login setup route in development", async () => {
    vi.stubEnv("ELECTRON_RENDERER_URL", "http://localhost:5173");
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow();

    expect(electronMock.instances[0]?.loadURL).toHaveBeenCalledWith(
      "http://localhost:5173#/login-setup",
    );
  });

  it("loads the post-install login transition route in production", async () => {
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow({ route: "postInstallLogin" });

    expect(electronMock.instances[0]?.loadFile).toHaveBeenCalledWith(
      expect.stringContaining("index.html"),
      { hash: "post-install-login" },
    );
  });

  it("loads the post-install login transition route in development", async () => {
    vi.stubEnv("ELECTRON_RENDERER_URL", "http://localhost:5173");
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow({ route: "postInstallLogin" });

    expect(electronMock.instances[0]?.loadURL).toHaveBeenCalledWith(
      "http://localhost:5173#/post-install-login",
    );
  });
});
