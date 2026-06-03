import { describe, expect, it, vi } from "vitest";
import {
  blockHomeWindowAltSpaceMenu,
  shouldBlockSystemMenuCommand,
  wireShortcutCaptureWindowGuard
} from "./shortcutCaptureWindowGuard";

describe("shortcutCaptureWindowGuard", () => {
  it("blocks SC_KEYMENU only while shortcut capture is active", () => {
    expect(shouldBlockSystemMenuCommand(0xf100, false)).toBe(false);
    expect(shouldBlockSystemMenuCommand(0xf100, true)).toBe(true);
    expect(shouldBlockSystemMenuCommand(0xf120, true)).toBe(false);
  });

  it("prevents system-context-menu while shortcut capture is active", () => {
    let captureActive = false;
    const preventDefault = vi.fn();
    const listeners = new Map<string, (event: { preventDefault(): void }) => void>();
    const hookWindowMessage = vi.fn();

    const window = {
      on: (event: string, listener: (event: { preventDefault(): void }) => void) => {
        listeners.set(event, listener);
      },
      hookWindowMessage,
      webContents: {
        on: vi.fn()
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => captureActive);

    const handler = listeners.get("system-context-menu");
    expect(handler).toBeDefined();

    captureActive = true;
    handler?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);

    preventDefault.mockClear();
    captureActive = false;
    handler?.({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("always blocks system-context-menu on the home window", () => {
    const preventDefault = vi.fn();
    const listeners = new Map<string, (event: { preventDefault(): void }) => void>();
    const window = {
      on: (event: string, listener: (event: { preventDefault(): void }) => void) => {
        listeners.set(event, listener);
      },
      hookWindowMessage: vi.fn(),
      webContents: { on: vi.fn() }
    };

    blockHomeWindowAltSpaceMenu(window as never);
    listeners.get("system-context-menu")?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("always registers WM_SYSCOMMAND hook for the home window on Windows", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });

    const hookWindowMessage = vi.fn();
    const window = {
      on: vi.fn(),
      hookWindowMessage,
      webContents: { on: vi.fn() }
    };

    blockHomeWindowAltSpaceMenu(window as never);

    expect(hookWindowMessage).toHaveBeenCalledWith(0x0112, expect.any(Function));
    expect(hookWindowMessage).toHaveBeenCalledWith(0x0116, expect.any(Function));

    const sysCommandHandler = hookWindowMessage.mock.calls.find(
      (call) => call[0] === 0x0112
    )?.[1] as ((wParam: { readInt32(): number }) => boolean) | undefined;
    expect(sysCommandHandler?.({ readInt32: () => 0xf100 })).toBe(true);

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("registers WM_SYSCOMMAND hook on Windows", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });

    const hookWindowMessage = vi.fn();
    const window = {
      on: vi.fn(),
      hookWindowMessage,
      webContents: { on: vi.fn() }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);

    expect(hookWindowMessage).toHaveBeenCalledWith(0x0112, expect.any(Function));
    expect(hookWindowMessage).toHaveBeenCalledWith(0x0116, expect.any(Function));

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });
});
