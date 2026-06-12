import { describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => {
  const instances: Array<{
    loadFile: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    setAlwaysOnTop: ReturnType<typeof vi.fn>;
    setBounds: ReturnType<typeof vi.fn>;
    setMenu: ReturnType<typeof vi.fn>;
    setTitle: ReturnType<typeof vi.fn>;
  }> = [];
  const BrowserWindow = vi.fn((_options: unknown) => {
    const instance = {
      loadFile: vi.fn(),
      loadURL: vi.fn(),
      on: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      setBounds: vi.fn(),
      setMenu: vi.fn(),
      setTitle: vi.fn()
    };
    instances.push(instance);
    return instance;
  });
  const screen = {
    getAllDisplays: vi.fn(() => [
      { workArea: { x: 0, y: 0, width: 1920, height: 1040 } }
    ]),
    getCursorScreenPoint: vi.fn(() => ({ x: 960, y: 520 })),
    getPrimaryDisplay: vi.fn(() => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1040 }
    }))
  };

  return { BrowserWindow, instances, screen };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow,
  screen: electronMock.screen
}));

import {
  calculateOverlayWindowBounds,
  createOverlayWindow,
  createOverlayWindowFollower,
  resolveOverlayWorkArea
} from "./createOverlayWindow";

describe("overlay window bounds", () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1040 };

  it("places the compact recording pill at the bottom center", () => {
    expect(calculateOverlayWindowBounds(workArea, "pill")).toEqual({
      width: 160,
      height: 40,
      x: 880,
      y: 928
    });
  });

  it("keeps the translate hint and pill above the bottom taskbar area", () => {
    expect(calculateOverlayWindowBounds(workArea, "translatePill")).toEqual({
      width: 184,
      height: 70,
      x: 868,
      y: 898
    });
  });

  it("reserves room for the recording limit warning above the pill", () => {
    expect(calculateOverlayWindowBounds(workArea, "recordingLimitWarning")).toEqual({
      width: 420,
      height: 196,
      x: 750,
      y: 772
    });
  });

  it("places the canceled pill at the bottom center", () => {
    expect(calculateOverlayWindowBounds(workArea, "canceledPill")).toEqual({
      width: 184,
      height: 40,
      x: 868,
      y: 928
    });
  });

  it("keeps the thinking pill compact", () => {
    expect(calculateOverlayWindowBounds(workArea, "thinkingPill")).toEqual({
      width: 184,
      height: 70,
      x: 868,
      y: 898
    });
  });

  it("reserves room for the processing busy hint above the pill", () => {
    expect(calculateOverlayWindowBounds(workArea, "busyHint")).toEqual({
      width: 380,
      height: 196,
      x: 770,
      y: 772
    });
  });

  it("sizes the microphone error card without an outer frame", () => {
    expect(calculateOverlayWindowBounds(workArea, "micError")).toEqual({
      width: 360,
      height: 168,
      x: 780,
      y: 800
    });
  });

  it("uses a compact layout for no-selection errors", () => {
    expect(calculateOverlayWindowBounds(workArea, "selectionError")).toEqual({
      width: 360,
      height: 112,
      x: 780,
      y: 856
    });
  });

  it("places the result panel above the bottom taskbar area", () => {
    expect(calculateOverlayWindowBounds(workArea, "result")).toEqual({
      width: 760,
      height: 520,
      x: 580,
      y: 448
    });
  });

  it("removes the native menu strip from the overlay window", () => {
    createOverlayWindow();

    expect(electronMock.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        autoHideMenuBar: true,
        frame: false,
        title: ""
      })
    );
    expect(electronMock.instances[0]?.setMenu).toHaveBeenCalledWith(null);
    expect(electronMock.instances[0]?.setTitle).toHaveBeenCalledWith("");
    expect(electronMock.instances[0]?.on).toHaveBeenCalledWith(
      "page-title-updated",
      expect.any(Function)
    );
  });

  it("chooses the work area of the display under the cursor", () => {
    const displays = [
      { workArea: { x: -1920, y: 0, width: 1920, height: 1040 } },
      { workArea: { x: 0, y: 0, width: 1920, height: 1040 } }
    ];

    expect(resolveOverlayWorkArea(displays, { x: -200, y: 500 })).toEqual(displays[0]?.workArea);
    expect(resolveOverlayWorkArea(displays, { x: 400, y: 500 })).toEqual(displays[1]?.workArea);
  });

  it("keeps syncing the overlay position while visible", () => {
    const intervalCallbacks: Array<() => void> = [];
    const clearedTimers: unknown[] = [];
    const setBoundsCalls: unknown[] = [];
    const follower = createOverlayWindowFollower(
      {
        setBounds(bounds) {
          setBoundsCalls.push(bounds);
        },
        isVisible: () => true,
        isDestroyed: () => false
      },
      {
        setIntervalFn: ((callback: () => void) => {
          intervalCallbacks.push(callback);
          return callback as unknown as ReturnType<typeof setInterval>;
        }) as typeof setInterval,
        clearIntervalFn: ((timer: unknown) => {
          clearedTimers.push(timer);
        }) as typeof clearInterval,
        intervalMs: 50,
        syncLayout: (window, _layout) => {
          window.setBounds({ width: 160, height: 40, x: 100, y: 200 });
        }
      }
    );

    follower.start("pill");
    expect(setBoundsCalls).toHaveLength(1);

    intervalCallbacks[0]?.();
    expect(setBoundsCalls).toHaveLength(2);

    follower.stop();
    expect(clearedTimers).toHaveLength(1);
  });
});
