import { describe, expect, it, vi } from "vitest";
import {
  focusExistingApplicationWindow,
  installSingleInstanceGuard,
  shouldInstallSingleInstanceGuard,
  type FocusableWindow,
} from "./singleInstance";

function createWindow(options: {
  destroyed?: boolean;
  minimized?: boolean;
  visible?: boolean;
} = {}): FocusableWindow {
  return {
    isDestroyed: vi.fn(() => options.destroyed === true),
    isMinimized: vi.fn(() => options.minimized === true),
    isVisible: vi.fn(() => options.visible === true),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  };
}

describe("single instance guard", () => {
  it("uses the single instance guard for normal app launches", () => {
    expect(shouldInstallSingleInstanceGuard(["Voice Assistant.exe"])).toBe(true);
    expect(
      shouldInstallSingleInstanceGuard(["Voice Assistant.exe", "--open-home"]),
    ).toBe(true);
  });

  it("skips the single instance guard for installer and uninstall launch modes", () => {
    expect(
      shouldInstallSingleInstanceGuard(["Voice Assistant.exe", "--installer-shell"]),
    ).toBe(false);
    expect(
      shouldInstallSingleInstanceGuard(["Voice Assistant.exe", "--silent-update"]),
    ).toBe(false);
    expect(
      shouldInstallSingleInstanceGuard(["Voice Assistant.exe", "--uninstall"]),
    ).toBe(false);
  });

  it("does not request a lock for special launch modes", () => {
    const app = {
      requestSingleInstanceLock: vi.fn(() => true),
      quit: vi.fn(),
      on: vi.fn(),
    };

    const installed = installSingleInstanceGuard({
      app,
      argv: ["Voice Assistant.exe", "--uninstall"],
      browserWindow: { getAllWindows: vi.fn(() => []) },
    });

    expect(installed).toBe(true);
    expect(app.requestSingleInstanceLock).not.toHaveBeenCalled();
    expect(app.on).not.toHaveBeenCalled();
  });

  it("quits duplicate processes when the single instance lock is unavailable", () => {
    const app = {
      requestSingleInstanceLock: vi.fn(() => false),
      quit: vi.fn(),
      on: vi.fn(),
    };

    const installed = installSingleInstanceGuard({
      app,
      browserWindow: { getAllWindows: vi.fn(() => []) },
    });

    expect(installed).toBe(false);
    expect(app.quit).toHaveBeenCalledTimes(1);
    expect(app.on).not.toHaveBeenCalled();
  });

  it("focuses the existing app window when a duplicate process starts", () => {
    let secondInstanceListener: (() => void) | undefined;
    const visibleWindow = createWindow({ visible: true });
    const app = {
      requestSingleInstanceLock: vi.fn(() => true),
      quit: vi.fn(),
      on: vi.fn((_event: "second-instance", listener: () => void) => {
        secondInstanceListener = listener;
      }),
    };

    const installed = installSingleInstanceGuard({
      app,
      browserWindow: { getAllWindows: vi.fn(() => [visibleWindow]) },
    });
    secondInstanceListener?.();

    expect(installed).toBe(true);
    expect(app.quit).not.toHaveBeenCalled();
    expect(visibleWindow.focus).toHaveBeenCalledTimes(1);
  });

  it("restores minimized existing windows before focusing", () => {
    const window = createWindow({ minimized: true, visible: true });

    expect(
      focusExistingApplicationWindow({ getAllWindows: vi.fn(() => [window]) }),
    ).toBe(true);

    expect(window.restore).toHaveBeenCalledTimes(1);
    expect(window.show).not.toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalledTimes(1);
  });

  it("shows hidden existing windows before focusing", () => {
    const window = createWindow({ visible: false });

    expect(
      focusExistingApplicationWindow({ getAllWindows: vi.fn(() => [window]) }),
    ).toBe(true);

    expect(window.show).toHaveBeenCalledTimes(1);
    expect(window.focus).toHaveBeenCalledTimes(1);
  });
});
