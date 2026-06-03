import { describe, expect, it, vi } from "vitest";
import {
  createShortcutCaptureHandlers,
  formatShortcutLabel,
  isSupportedShortcut
} from "./shortcutCapture";

function keyEvent(code: string): KeyboardEvent {
  return {
    code,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as KeyboardEvent;
}

describe("shortcutCapture", () => {
  it("formats supported shortcut labels", () => {
    expect(formatShortcutLabel("RightAlt")).toBe("Right Alt");
    expect(formatShortcutLabel("RightAlt+Space")).toBe("Right Alt + Space");
    expect(formatShortcutLabel("RightAlt+RightShift")).toBe("Right Alt + Right Shift");
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
      onCancel: vi.fn()
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyUp(keyEvent("AltRight"));

    expect(onCapture).toHaveBeenCalledWith("RightAlt");
  });

  it("captures Right Alt + Space", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn()
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("Space"));

    expect(onCapture).toHaveBeenCalledWith("RightAlt+Space");
  });

  it("captures Right Alt + Right Shift", () => {
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel: vi.fn()
    });

    handlers.handleKeyDown(keyEvent("AltRight"));
    handlers.handleKeyDown(keyEvent("ShiftRight"));

    expect(onCapture).toHaveBeenCalledWith("RightAlt+RightShift");
  });

  it("cancels capture on Escape", () => {
    const onCancel = vi.fn();
    const onCapture = vi.fn();
    const handlers = createShortcutCaptureHandlers({
      onCapture,
      onCancel
    });

    handlers.handleKeyDown(keyEvent("Escape"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCapture).not.toHaveBeenCalled();
  });
});
