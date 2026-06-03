import { describe, expect, it, vi } from "vitest";
import {
  createUpdateService,
  shouldCheckForUpdates
} from "./updateService";

describe("update service", () => {
  it("does not check for updates while running unpackaged", () => {
    expect(shouldCheckForUpdates(false)).toBe(false);
    expect(shouldCheckForUpdates(true)).toBe(true);
  });

  it("notifies listeners after an update is downloaded", async () => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => undefined),
      quitAndInstall: vi.fn(),
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        const existing = listeners.get(event) ?? [];
        existing.push(listener);
        listeners.set(event, existing);
      })
    };
    const updateReady = vi.fn();
    const service = createUpdateService({
      autoUpdater,
      isPackaged: true,
      onUpdateReady: updateReady
    });

    await expect(service.checkForUpdates()).resolves.toEqual({ status: "checking" });
    listeners.get("update-downloaded")?.[0]?.({ version: "1.2.3" });

    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(updateReady).toHaveBeenCalledWith({ version: "1.2.3" });
  });

  it("configures a generic update feed when a feed URL is provided", () => {
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => undefined),
      quitAndInstall: vi.fn(),
      setFeedURL: vi.fn(),
      on: vi.fn()
    };

    createUpdateService({
      autoUpdater,
      isPackaged: true,
      updateFeedUrl: " https://updates.example.com/aoa/ ",
      onUpdateReady: vi.fn()
    });

    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith(
      "https://updates.example.com/aoa/"
    );
  });

  it("restarts through electron-updater after an update is ready", () => {
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => undefined),
      quitAndInstall: vi.fn(),
      on: vi.fn()
    };
    const service = createUpdateService({
      autoUpdater,
      isPackaged: true,
      onUpdateReady: vi.fn()
    });

    service.restartToUpdate();

    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it("ignores update checks in development", async () => {
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => undefined),
      quitAndInstall: vi.fn(),
      on: vi.fn()
    };
    const service = createUpdateService({
      autoUpdater,
      isPackaged: false,
      onUpdateReady: vi.fn()
    });

    await expect(service.checkForUpdates()).resolves.toEqual({ status: "disabled" });

    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
