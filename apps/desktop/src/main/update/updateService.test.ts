import { describe, expect, it, vi } from "vitest";
import {
  createUpdateService,
  shouldCheckForUpdates
} from "./updateService";
import type { VersionCheckClient } from "./versionCheckClient";

describe("update service", () => {
  it("does not check for updates while running unpackaged", () => {
    expect(shouldCheckForUpdates(false)).toBe(false);
    expect(shouldCheckForUpdates(true)).toBe(true);
  });

  it("returns up-to-date when the backend reports no update", async () => {
    const autoUpdater = createAutoUpdater();
    const versionCheckClient = createVersionCheckClient(async () => ({
      hasUpdate: false
    }));
    const service = createService({ autoUpdater, versionCheckClient });

    await expect(service.checkForUpdates()).resolves.toEqual({ status: "up-to-date" });
    expect(versionCheckClient.check).toHaveBeenCalledWith({
      platform: "WINDOWS",
      currentVersion: "1.2.3"
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("returns backend metadata and starts electron-updater when an update exists", async () => {
    const autoUpdater = createAutoUpdater();
    const service = createService({
      autoUpdater,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "修复启动异常",
        downloadUrl: "/appVersion/download/abc",
        packageSize: 157286400,
        packageName: "aoa-setup-1.2.4.exe"
      }))
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "available",
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "FORCED",
      updateLog: "修复启动异常",
      downloadUrl: "/appVersion/download/abc",
      packageSize: 157286400,
      packageName: "aoa-setup-1.2.4.exe"
    });
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("returns an error when the backend check rejects", async () => {
    const onError = vi.fn();
    const service = createService({
      onError,
      versionCheckClient: createVersionCheckClient(async () => {
        throw new Error("BACKEND_DOWN");
      })
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "error",
      message: "BACKEND_DOWN"
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("keeps available metadata when electron-updater rejects after backend succeeds", async () => {
    const onError = vi.fn();
    const autoUpdater = createAutoUpdater({
      checkForUpdates: vi.fn(async () => {
        throw new Error("FEED_UNAVAILABLE");
      })
    });
    const service = createService({
      autoUpdater,
      onError,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "RECOMMENDED",
        updateLog: "优化稳定性",
        downloadUrl: "/appVersion/download/abc",
        packageSize: 1024,
        packageName: "setup.exe"
      }))
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "available",
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "RECOMMENDED",
      updateLog: "优化稳定性",
      downloadUrl: "/appVersion/download/abc",
      packageSize: 1024,
      packageName: "setup.exe",
      updaterError: "FEED_UNAVAILABLE"
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("notifies listeners with backend metadata after an update is downloaded", async () => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const autoUpdater = createAutoUpdater({
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        const existing = listeners.get(event) ?? [];
        existing.push(listener);
        listeners.set(event, existing);
      })
    });
    const updateReady = vi.fn();
    const service = createService({
      autoUpdater,
      onUpdateReady: updateReady,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "OPTIONAL",
        updateLog: "新增体验优化",
        downloadUrl: "/appVersion/download/abc",
        packageSize: 2048,
        packageName: "setup.exe"
      }))
    });

    await service.checkForUpdates();
    listeners.get("update-downloaded")?.[0]?.({ version: "1.2.4" });

    expect(updateReady).toHaveBeenCalledWith({
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "OPTIONAL",
      updateLog: "新增体验优化",
      downloadUrl: "/appVersion/download/abc",
      packageSize: 2048,
      packageName: "setup.exe"
    });
  });

  it("reuses an in-flight backend check", async () => {
    let resolveCheck!: (value: { hasUpdate: false }) => void;
    const versionCheckClient = createVersionCheckClient(
      () =>
        new Promise<{ hasUpdate: false }>((resolve) => {
          resolveCheck = resolve;
        })
    );
    const service = createService({ versionCheckClient });

    const first = service.checkForUpdates();
    const second = service.checkForUpdates();
    resolveCheck({ hasUpdate: false });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "up-to-date" },
      { status: "up-to-date" }
    ]);
    expect(versionCheckClient.check).toHaveBeenCalledTimes(1);
  });

  it("configures a generic update feed when a feed URL is provided", () => {
    const autoUpdater = createAutoUpdater({ setFeedURL: vi.fn() });

    createService({
      autoUpdater,
      updateFeedUrl: " https://updates.example.com/aoa/ "
    });

    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith(
      "https://updates.example.com/aoa/"
    );
  });

  it("restarts through electron-updater after an update is ready", () => {
    const autoUpdater = createAutoUpdater();
    const service = createService({ autoUpdater });

    service.restartToUpdate();

    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it("returns a fake available update in development when manually requested", async () => {
    vi.useFakeTimers();
    const updateReady = vi.fn();
    const autoUpdater = createAutoUpdater();
    const service = createService({
      autoUpdater,
      isPackaged: false,
      onUpdateReady: updateReady
    });

    await expect(
      service.checkForUpdates({ allowDevelopmentFakeUpdate: true })
    ).resolves.toEqual({
      status: "available",
      version: "0.1.1-dev",
      updateType: "OPTIONAL",
      updateLog: "Development fake update",
      phase: "RELEASE"
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(updateReady).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(updateReady).toHaveBeenCalledWith({
      version: "0.1.1-dev",
      updateType: "OPTIONAL",
      updateLog: "Development fake update",
      phase: "RELEASE"
    });
    vi.useRealTimers();
  });

  it("does not restart through electron-updater in development", () => {
    const autoUpdater = createAutoUpdater();
    const service = createService({
      autoUpdater,
      isPackaged: false
    });

    service.restartToUpdate();

    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("ignores update checks in development", async () => {
    const autoUpdater = createAutoUpdater();
    const versionCheckClient = createVersionCheckClient(async () => ({
      hasUpdate: false
    }));
    const service = createService({
      autoUpdater,
      isPackaged: false,
      versionCheckClient
    });

    await expect(service.checkForUpdates()).resolves.toEqual({ status: "disabled" });

    expect(versionCheckClient.check).not.toHaveBeenCalled();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});

function createService({
  autoUpdater = createAutoUpdater(),
  currentVersion = "1.2.3",
  isPackaged = true,
  onError = vi.fn(),
  onUpdateReady = vi.fn(),
  platform = "WINDOWS",
  updateFeedUrl,
  versionCheckClient = createVersionCheckClient(async () => ({ hasUpdate: false }))
}: Partial<Parameters<typeof createUpdateService>[0]> = {}) {
  return createUpdateService({
    autoUpdater,
    currentVersion,
    isPackaged,
    onError,
    onUpdateReady,
    platform,
    updateFeedUrl,
    versionCheckClient
  });
}

function createAutoUpdater(overrides: Record<string, unknown> = {}) {
  return {
    autoDownload: false,
    checkForUpdates: vi.fn(async () => ({
      isUpdateAvailable: true,
      updateInfo: { version: "1.2.4" }
    })),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    ...overrides
  };
}

function createVersionCheckClient(
  check: VersionCheckClient["check"]
): VersionCheckClient & { check: ReturnType<typeof vi.fn<VersionCheckClient["check"]>> } {
  return {
    check: vi.fn(check)
  };
}
