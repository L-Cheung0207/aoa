import { describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => {
  const instances: Array<{
    loadFile: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
  }> = [];
  const BrowserWindow = vi.fn((options: unknown) => {
    const instance = {
      options,
      loadFile: vi.fn(),
      loadURL: vi.fn()
    };
    instances.push(instance);
    return instance;
  });

  return { BrowserWindow, instances };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow
}));

vi.mock("./shortcutCaptureWindowGuard", () => ({
  blockHomeWindowAltSpaceMenu: vi.fn()
}));

describe("createHomeWindow", () => {
  it("creates the home window without the native title bar or menu bar", async () => {
    const { createHomeWindow } = await import("./createHomeWindow");

    createHomeWindow();

    expect(electronMock.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        autoHideMenuBar: true,
        frame: false
      })
    );
  });
});
