import { describe, expect, it, vi } from "vitest";
import {
  blockHomeWindowAltSpaceMenu,
  shouldBlockSystemMenuCommand,
  wireLoginSetupShortcutCaptureWindowGuard,
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

  it("prevents Alt+Space before input while shortcut capture is active", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);

    webContentsListeners.get("before-input-event")?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "Space",
        code: "Space",
        alt: true
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("forwards RightAlt+Space after preventing the system menu", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "Space",
        code: "Space",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "RightAlt+Space"
    });
  });

  it("forwards RightAlt tap while shortcut capture is active", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyUp",
        key: "AltGraph",
        code: "AltRight",
        alt: false,
        control: false,
        location: 2,
        modifiers: ["right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "RightAlt"
    });
  });

  it("forwards Right Cmd tap to the login setup shortcut capture channel", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireLoginSetupShortcutCaptureWindowGuard(
      window as never,
      () => true,
      () => undefined
    );
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Meta",
        code: "MetaRight",
        meta: true,
        location: 2,
        modifiers: ["meta", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyUp",
        key: "Meta",
        code: "MetaRight",
        meta: false,
        location: 2,
        modifiers: ["right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      "voice:login-setup-shortcut-capture-accelerator",
      { accelerator: "MetaRight" }
    );
  });

  it("forwards Right Cmd + Right Shift to the login setup shortcut capture channel", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireLoginSetupShortcutCaptureWindowGuard(
      window as never,
      () => true,
      () => undefined
    );
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Meta",
        code: "MetaRight",
        meta: true,
        location: 2,
        modifiers: ["meta", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "Shift",
        code: "ShiftRight",
        meta: true,
        shift: true,
        location: 2,
        modifiers: ["meta", "shift", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      "voice:login-setup-shortcut-capture-accelerator",
      { accelerator: "MetaRight+RightShift" }
    );
  });

  it("forwards Right Cmd + slash to the login setup shortcut capture channel", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireLoginSetupShortcutCaptureWindowGuard(
      window as never,
      () => true,
      () => undefined
    );
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Meta",
        code: "MetaRight",
        meta: true,
        location: 2,
        modifiers: ["meta", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "/",
        code: "Slash",
        meta: true,
        location: 0,
        modifiers: ["meta", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      "voice:login-setup-shortcut-capture-accelerator",
      { accelerator: "MetaRight+/" }
    );
  });

  it("does not forward RightAlt tap after another RightAlt accelerator was captured", () => {
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyUp",
        key: "AltGraph",
        code: "AltRight",
        alt: false,
        control: false,
        location: 2,
        modifiers: ["right"]
      }
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("forwards only one accelerator for repeated RightAlt combo keydown events", () => {
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    for (let index = 0; index < 2; index += 1) {
      beforeInput?.(
        { preventDefault: vi.fn() },
        {
          type: "keyDown",
          key: "a",
          code: "KeyA",
          alt: true,
          control: true,
          location: 0,
          modifiers: ["alt", "control", "right"]
        }
      );
    }

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("resets RightAlt capture state after the combo key is released", () => {
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyUp",
        key: "AltGraph",
        code: "AltRight",
        alt: false,
        control: false,
        location: 2,
        modifiers: ["right"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "b",
        code: "KeyB",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, "voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
    expect(send).toHaveBeenNthCalledWith(2, "voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+B"
    });
  });

  it("forwards RightAlt with regular keys while shortcut capture is active", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("infers RightAlt chord from Windows AltGr modifier payload without an AltRight keydown", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("infers RightAlt chord from implicit Ctrl+Alt when Electron omits the right modifier marker", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    webContentsListeners.get("before-input-event")?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("forwards RightAlt+RightShift from implicit AltGr state", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    webContentsListeners.get("before-input-event")?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "Shift",
        code: "ShiftRight",
        alt: true,
        control: true,
        shift: true,
        location: 2,
        modifiers: ["alt", "control", "shift", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "RightAlt+RightShift"
    });
  });

  it("forwards captured accelerator to the active shortcut capture target window", () => {
    const targetSend = vi.fn();
    const sourceSend = vi.fn();
    const targetWindow = {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        send: targetSend
      }
    };
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      isDestroyed: () => false,
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        isDestroyed: () => false,
        send: sourceSend,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(
      window as never,
      () => true,
      () => targetWindow as never
    );
    webContentsListeners.get("before-input-event")?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );

    expect(sourceSend).not.toHaveBeenCalled();
    expect(targetSend).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("includes held non-Ctrl modifiers when forwarding RightAlt capture accelerators", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      { type: "keyDown", key: "Shift", code: "ShiftLeft", shift: true }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        shift: true,
        location: 2,
        modifiers: ["alt", "control", "shift", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "c",
        code: "KeyC",
        alt: true,
        control: true,
        shift: true,
        location: 0,
        modifiers: ["alt", "control", "shift", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "Shift+AltGr+C"
    });
  });

  it("ignores Windows synthetic Ctrl while forwarding RightAlt regular keys", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Control",
        code: "ControlLeft",
        control: true,
        modifiers: ["control"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "AltGraph",
        code: "AltRight",
        alt: true,
        control: true,
        location: 2,
        modifiers: ["alt", "control", "right"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "right"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("infers RightAlt after Windows sends only the synthetic Ctrl before the target key", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Control",
        code: "ControlLeft",
        control: true,
        modifiers: ["control"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control"]
      }
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("voice:shortcut-capture-accelerator", {
      accelerator: "AltGr+A"
    });
  });

  it("does not infer RightAlt for explicit Ctrl plus Left Alt", () => {
    const preventDefault = vi.fn();
    const send = vi.fn();
    const webContentsListeners = new Map<
      string,
      (event: { preventDefault(): void }, input: unknown) => void
    >();
    const window = {
      on: vi.fn(),
      hookWindowMessage: vi.fn(),
      webContents: {
        send,
        on: (
          event: string,
          listener: (event: { preventDefault(): void }, input: unknown) => void
        ) => {
          webContentsListeners.set(event, listener);
        }
      }
    };

    wireShortcutCaptureWindowGuard(window as never, () => true);
    const beforeInput = webContentsListeners.get("before-input-event");
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Control",
        code: "ControlLeft",
        control: true,
        modifiers: ["control"]
      }
    );
    beforeInput?.(
      { preventDefault: vi.fn() },
      {
        type: "keyDown",
        key: "Alt",
        code: "AltLeft",
        alt: true,
        control: true,
        location: 1,
        modifiers: ["alt", "control", "left"]
      }
    );
    beforeInput?.(
      { preventDefault },
      {
        type: "keyDown",
        key: "a",
        code: "KeyA",
        alt: true,
        control: true,
        location: 0,
        modifiers: ["alt", "control", "left"]
      }
    );

    expect(preventDefault).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
