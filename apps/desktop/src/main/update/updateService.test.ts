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

  it("returns up-to-date when no update is available", async () => {
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => ({
        isUpdateAvailable: false,
        updateInfo: { version: "0.1.0" }
      })),
      quitAndInstall: vi.fn(),
      on: vi.fn()
    };
    const service = createUpdateService({
      autoUpdater,
      isPackaged: true,
      onUpdateReady: vi.fn()
    });

    await expect(service.checkForUpdates()).resolves.toEqual({ status: "up-to-date" });
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("returns available when a newer update exists", async () => {
    const autoUpdater = {
      autoDownload: true,
      checkForUpdates: vi.fn(async () => ({
        isUpdateAvailable: true,
        updateInfo: { version: "1.2.3" }
      })),
      quitAndInstall: vi.fn(),
      on: vi.fn()
    };
    const service = createUpdateService({
      autoUpdater,
      isPackaged: true,
      onUpdateReady: vi.fn()
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "available",
      version: "1.2.3"
    });
  });

  it("notifies listeners after an update is downloaded", async () => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => ({
        isUpdateAvailable: true,
        updateInfo: { version: "1.2.3" }
      })),
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

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "available",
      version: "1.2.3"
    });
    listeners.get("update-downloaded")?.[0]?.({ version: "1.2.3" });

    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(updateReady).toHaveBeenCalledWith({ version: "1.2.3" });
  });

  it("returns an error when the updater rejects the check", async () => {
    const onError = vi.fn();
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => {
        throw new Error("FEED_UNAVAILABLE");
      }),
      quitAndInstall: vi.fn(),
      on: vi.fn()
    };
    const service = createUpdateService({
      autoUpdater,
      isPackaged: true,
      onUpdateReady: vi.fn(),
      onError
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "error",
      message: "FEED_UNAVAILABLE"
    });
    expect(onError).toHaveBeenCalledTimes(1);
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

  it("returns a fake available update in development when manually requested", async () => {
    vi.useFakeTimers();
    const updateReady = vi.fn();
    const autoUpdater = {
      autoDownload: false,
      checkForUpdates: vi.fn(async () => undefined),
      quitAndInstall: vi.fn(),
      on: vi.fn()
    };
    const service = createUpdateService({
      autoUpdater,
      isPackaged: false,
      onUpdateReady: updateReady
    });

    await expect(
      service.checkForUpdates({ allowDevelopmentFakeUpdate: true })
    ).resolves.toEqual({
      status: "available",
      version: "0.1.1-dev"
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(updateReady).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(updateReady).toHaveBeenCalledWith({ version: "0.1.1-dev" });
    vi.useRealTimers();
  });

  it("does not restart through electron-updater in development", () => {
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

    service.restartToUpdate();

    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
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
