import { describe, expect, it, vi } from "vitest";
import {
  createShortcutCaptureHandlers,
  formatShortcutLabel,
  isSupportedShortcut,
} from "./shortcutCapture";

interface KeyEventOptions {
  altKey?: boolean;
  ctrlKey?: boolean;
  key?: string;
  metaKey?: boolean;
  shiftKey?: boolean;
  altGraph?: boolean;
}

function keyEvent(code: string, options: KeyEventOptions = {}): KeyboardEvent {
  return {
    code,
    altKey: options.altKey,
    ctrlKey: options.ctrlKey,
    key: options.key,
    metaKey: options.metaKey,
    shiftKey: options.shiftKey,
    getModifierState: (key: string) =>
      key === "AltGraph" && options.altGraph === true,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe("shortcutCapture", () => {
  it("formats supported shortcut labels", () => {
    expect(formatShortcutLabel("RightAlt")).toBe("Right Alt");
    expect(formatShortcutLabel("RightAlt+Space")).toBe("Right Alt + Space");
    expect(formatShortcutLabel("RightAlt+RightShift")).toBe(
      "Right Alt + Right Shift",
    );
    expect(formatShortcutLabel("Super+Space", "windows")).toBe("Win + Space");
    expect(formatShortcutLabel("Super+Space", "mac")).toBe("Cmd + Space");
    expect(formatShortcutLabel("Custom")).toBe("Custom");
  });

  it("recognizes supported shortcuts", () => {
    expect(isSupportedShortcut("RightAlt+Space")).toBe(true);
    expect(isSupportedShortcut("Ctrl+Space")).toBe(false);
  });

  it("captures Right Alt tap", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyUp(keyEvent("AltRight"));

    expect(onCapture).toHaveBeenCalledWith("RightAlt");
  });

  it("captures Right Alt + Space", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("Space"));

    expect(onCapture).toHaveBeenCalledWith("RightAlt+Space");
  });

  it("captures Right Command + slash as the canonical macOS rewrite shortcut", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      platform: "mac",
    });

    handlers.handleKeyDown(keyEvent("MetaRight", { metaKey: true }));
    handlers.handleKeyDown(keyEvent("Slash", { key: "/", metaKey: true }));

    expect(onCapture).toHaveBeenCalledWith("MetaRight+/");
  });

  it("captures Right Alt + Right Shift", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("ShiftRight"));

    expect(onCapture).toHaveBeenCalledWith("RightAlt+RightShift");
  });

  it("stores Right Command + Right Shift as the canonical macOS shortcut", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      platform: "mac",
    });

    handlers.handleKeyDown(keyEvent("MetaRight", { metaKey: true }));
    handlers.handleKeyDown(
      keyEvent("ShiftRight", { metaKey: true, shiftKey: true }),
    );
    handlers.handleKeyUp(
      keyEvent("ShiftRight", { metaKey: true, shiftKey: true }),
    );

    expect(onCapture).toHaveBeenCalledWith("MetaRight+RightShift");
    expect(formatShortcutLabel("MetaRight+RightShift")).toBe(
      "Right Cmd + Right Shift",
    );
  });

  it("keeps modifier display in pressed order", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      platform: "mac",
    });

    handlers.handleKeyDown(keyEvent("ShiftRight", { shiftKey: true }));
    handlers.handleKeyDown(
      keyEvent("MetaRight", { metaKey: true, shiftKey: true }),
    );
    handlers.handleKeyUp(
      keyEvent("MetaRight", { metaKey: true, shiftKey: true }),
    );

    expect(onCapture).toHaveBeenCalledWith("RightShift+MetaRight");
    expect(formatShortcutLabel("RightShift+MetaRight")).toBe(
      "Right Shift + Right Cmd",
    );
  });

  it("captures Right Alt with regular keys", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("KeyA"));

    expect(onCapture).toHaveBeenCalledWith("AltGr+A");
  });

  it("infers Right Alt from AltGraph modifier state on the target key", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("KeyA", { altGraph: true }));

    expect(onCapture).toHaveBeenCalledWith("AltGr+A");
  });

  it("infers Right Alt from implicit Ctrl+Alt state on the target key", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("KeyA", { ctrlKey: true, altKey: true }));

    expect(onCapture).toHaveBeenCalledWith("AltGr+A");
  });

  it("treats AltGraph modifier events as Right Alt even when reported as ControlLeft", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(
      keyEvent("ControlLeft", { key: "AltGraph", ctrlKey: true }),
    );
    handlers.handleKeyDown(keyEvent("KeyA", { ctrlKey: true, altKey: true }));

    expect(onCapture).toHaveBeenCalledWith("AltGr+A");
  });

  it("ignores Windows synthetic Ctrl while capturing Right Alt regular keys", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("ControlLeft", { ctrlKey: true }));
    handlers.handleKeyDown(
      keyEvent("AltRight", { ctrlKey: true, altKey: true }),
    );
    handlers.handleKeyDown(keyEvent("KeyA", { ctrlKey: true, altKey: true }));

    expect(onCapture).toHaveBeenCalledWith("AltGr+A");
  });

  it("infers Right Alt after Windows sends only synthetic Ctrl before the target key", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("ControlLeft", { ctrlKey: true }));
    handlers.handleKeyDown(keyEvent("KeyA", { ctrlKey: true, altKey: true }));

    expect(onCapture).toHaveBeenCalledWith("AltGr+A");
  });

  it("keeps explicit Ctrl + Alt shortcuts separate from Right Alt", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(keyEvent("ControlLeft"));
    handlers.handleKeyDown(keyEvent("AltLeft", { ctrlKey: true }));
    handlers.handleKeyDown(keyEvent("KeyA", { ctrlKey: true, altKey: true }));

    expect(onCapture).toHaveBeenCalledWith("Ctrl+Alt+A");
  });

  it("captures explicit Ctrl added after Right Alt without adding synthetic Alt", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
    });

    handlers.handleKeyDown(
      keyEvent("AltRight", { ctrlKey: true, altKey: true }),
    );
    handlers.handleKeyDown(
      keyEvent("ControlLeft", { ctrlKey: true, altKey: true }),
    );
    handlers.handleKeyDown(keyEvent("KeyC", { ctrlKey: true, altKey: true }));

    expect(onCapture).toHaveBeenCalledWith("AltGr+Ctrl+C");
  });

  it("rejects explicit Ctrl plus Right Alt plus Shift plus key as too many keys", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(
      keyEvent("AltRight", { ctrlKey: true, altKey: true }),
    );
    handlers.handleKeyDown(
      keyEvent("ControlLeft", { ctrlKey: true, altKey: true }),
    );
    handlers.handleKeyDown(
      keyEvent("ShiftLeft", { ctrlKey: true, altKey: true, shiftKey: true }),
    );
    handlers.handleKeyDown(
      keyEvent("KeyC", { ctrlKey: true, altKey: true, shiftKey: true }),
    );

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("快捷键最多支持 3 个按键");
  });

  it("rejects Right Alt + Tab", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("Tab"));

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("此快捷键已保留供系统使用");
  });

  it("rejects Right Alt + Escape instead of cancelling capture", () => {
    const onCancel = vi.fn();
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel,
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("Escape"));

    expect(onCancel).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("此快捷键已保留供系统使用");
  });

  it("rejects Right Alt combinations containing Windows system shortcuts", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("MetaLeft"));
    handlers.handleKeyDown(keyEvent("KeyL"));

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("此快捷键已保留供系统使用");
  });

  it("rejects Typeless-blacklisted shortcuts during capture", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("KeyA"));

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("此快捷键已保留供系统使用");
  });

  it("passes the reserved shortcut message when Space is captured", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("Space"));

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("此快捷键已保留供系统使用");
  });

  it("rejects shortcuts already used by another setting during capture", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      currentShortcut: "RightAlt",
      existingShortcuts: ["RightAlt", "Ctrl+Shift+K"],
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("ControlLeft"));
    handlers.handleKeyDown(keyEvent("ShiftLeft"));
    handlers.handleKeyDown(keyEvent("KeyK"));

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
  });

  it("rejects the current shortcut value when another setting already uses it", () => {
    const onInvalid = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      currentShortcut: "RightAlt+Space",
      existingShortcuts: ["RightAlt+Space", "RightAlt+RightShift"],
      onCapture,
      onCancel: vi.fn(),
      onInvalid,
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("Space"));

    expect(onCapture).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith("此快捷键已被使用");
  });

  it("cancels capture on Escape", () => {
    const onCancel = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel,
    });

    handlers.handleKeyDown(keyEvent("Escape"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCapture).not.toHaveBeenCalled();
  });
});
