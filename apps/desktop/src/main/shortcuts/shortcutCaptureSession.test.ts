import { describe, expect, it, vi } from "vitest";
import { createShortcutCaptureSession } from "./shortcutCaptureSession";

function createApi() {
  const stop = vi.fn();
  return {
    api: {
      configureKeyboardShortcuts: vi.fn(),
      startKeyboardHook: vi.fn(() => {
        return { stop };
      })
    },
    stop
  };
}

describe("shortcutCaptureSession", () => {
  it("starts capture without installing a temporary native hook", () => {
    const { api } = createApi();
    const session = createShortcutCaptureSession();

    session.start();

    expect(api.configureKeyboardShortcuts).not.toHaveBeenCalled();
    expect(api.startKeyboardHook).not.toHaveBeenCalled();
    expect(session.isActive()).toBe(true);
  });

  it("keeps capture active when started repeatedly", () => {
    const { api } = createApi();
    const session = createShortcutCaptureSession();

    session.start();
    session.start();

    expect(api.startKeyboardHook).not.toHaveBeenCalled();
    expect(session.isActive()).toBe(true);
  });

  it("stops capture without touching the native hook", () => {
    const { api, stop } = createApi();
    const session = createShortcutCaptureSession();

    session.start();
    session.stop();

    expect(api.startKeyboardHook).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    expect(session.isActive()).toBe(false);
  });

  it("does not fail capture when the native hook is unavailable", () => {
    const api = {
      configureKeyboardShortcuts: vi.fn(),
      startKeyboardHook: vi.fn(() => {
        throw new Error("HOOK_START_FAILED");
      })
    };
    const session = createShortcutCaptureSession();

    expect(() => session.start()).not.toThrow();

    expect(session.isActive()).toBe(true);
    expect(api.startKeyboardHook).not.toHaveBeenCalled();
  });
});
