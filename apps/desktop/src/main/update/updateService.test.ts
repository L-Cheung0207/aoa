import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { ReadableStream } from "node:stream/web";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createBackendInstallerDownloader,
  createBackendInstallerLauncher,
  inspectWindowsExecutableMetadata,
  createUpdateService,
  shouldCheckForUpdates,
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
      hasUpdate: false,
    }));
    const service = createService({ autoUpdater, versionCheckClient });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "up-to-date",
    });
    expect(versionCheckClient.check).toHaveBeenCalledWith({
      platform: "WINDOWS",
      currentVersion: "1.2.3",
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("downloads the backend installer directly when an update exists", async () => {
    const autoUpdater = createAutoUpdater();
    const logger = createLogger();
    const onDownloadProgress = vi.fn();
    const updateReady = vi.fn();
    const directDownloader = {
      download: vi.fn(
        async (input: {
          onProgress?: (payload: {
            phase: "downloading" | "verifying";
            percent?: number;
            transferredBytes?: number;
            totalBytes?: number;
          }) => void;
        }) => {
          input.onProgress?.({
            phase: "downloading",
            percent: 50,
            transferredBytes: 78643200,
            totalBytes: 157286400,
          });
          input.onProgress?.({
            phase: "verifying",
            percent: 100,
            transferredBytes: 157286400,
            totalBytes: 157286400,
          });
          return "C:/Temp/Voice Assistant Setup 1.2.4.exe";
        },
      ),
    };
    const service = createService({
      autoUpdater,
      directDownloader,
      logger,
      onDownloadProgress,
      onUpdateReady: updateReady,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "修复启动异常",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageSize: 157286400,
        packageName: "Voice Assistant Setup 1.2.4.exe",
      })),
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "ready",
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "FORCED",
      updateLog: "修复启动异常",
      downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
      packageSha256:
        "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
      packageSize: 157286400,
      packageName: "Voice Assistant Setup 1.2.4.exe",
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(directDownloader.download).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        packageSize: 157286400,
        onProgress: expect.any(Function),
      }),
    );
    expect(onDownloadProgress).toHaveBeenCalledWith({
      phase: "downloading",
      percent: 0,
      transferredBytes: 0,
      totalBytes: 157286400,
      packageName: "Voice Assistant Setup 1.2.4.exe",
      version: "1.2.4",
    });
    expect(onDownloadProgress).toHaveBeenCalledWith({
      phase: "downloading",
      percent: 50,
      transferredBytes: 78643200,
      totalBytes: 157286400,
      packageName: "Voice Assistant Setup 1.2.4.exe",
      version: "1.2.4",
    });
    expect(onDownloadProgress).toHaveBeenCalledWith({
      phase: "verifying",
      percent: 100,
      transferredBytes: 157286400,
      totalBytes: 157286400,
      packageName: "Voice Assistant Setup 1.2.4.exe",
      version: "1.2.4",
    });
    expect(updateReady).toHaveBeenCalledWith({
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "FORCED",
      updateLog: "修复启动异常",
      downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
      packageSha256:
        "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
      packageSize: 157286400,
      packageName: "Voice Assistant Setup 1.2.4.exe",
    });
    expect(logger.log).toHaveBeenCalledWith(
      "[update] backend update available version=1.2.4 type=FORCED",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] backend installer downloaded path=C:/Temp/Voice Assistant Setup 1.2.4.exe version=1.2.4",
    );
  });

  it("returns an error when the backend check rejects", async () => {
    const onError = vi.fn();
    const logger = createLogger();
    const service = createService({
      logger,
      onError,
      versionCheckClient: createVersionCheckClient(async () => {
        throw new Error("BACKEND_DOWN");
      }),
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "error",
      message: "BACKEND_DOWN",
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "[update] check failed message=BACKEND_DOWN",
    );
  });

  it("keeps available metadata when electron-updater rejects after backend succeeds", async () => {
    const onError = vi.fn();
    const autoUpdater = createAutoUpdater({
      checkForUpdates: vi.fn(async () => {
        throw new Error("FEED_UNAVAILABLE");
      }),
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
        packageName: "setup.exe",
      })),
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
      updaterError: "FEED_UNAVAILABLE",
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("does not require electron-updater feed config for backend installer downloads", async () => {
    const updateReady = vi.fn();
    const logger = createLogger();
    const directDownloader = {
      download: vi.fn(
        async () => "C:/Users/Alex/AppData/Local/Temp/voice-updates/setup.exe",
      ),
    };
    const autoUpdater = createAutoUpdater({
      checkForUpdates: vi.fn(async () => {
        throw Object.assign(
          new Error(
            "ENOENT: no such file or directory, open 'C:\\app\\resources\\app-update.yml'",
          ),
          { code: "ENOENT" },
        );
      }),
    });
    const service = createService({
      autoUpdater,
      directDownloader,
      logger,
      onUpdateReady: updateReady,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        packageSize: 1024,
      })),
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "ready",
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "FORCED",
      updateLog: "notes",
      downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
      packageSha256:
        "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
      packageName: "Voice Assistant Setup 1.2.4.exe",
      packageSize: 1024,
    });
    expect(directDownloader.download).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        packageSize: 1024,
        onProgress: expect.any(Function),
      }),
    );
    expect(updateReady).toHaveBeenCalledWith({
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "FORCED",
      updateLog: "notes",
      downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
      packageSha256:
        "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
      packageName: "Voice Assistant Setup 1.2.4.exe",
      packageSize: 1024,
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "[update] backend installer download started url=https://api.example.com/aoa_api/appVersion/download/abc packageName=Voice Assistant Setup 1.2.4.exe",
    );
  });

  it("returns an error when direct backend installer download fails", async () => {
    const onError = vi.fn();
    const logger = createLogger();
    const directDownloader = {
      download: vi.fn(async () => {
        throw new Error("UPDATE_INSTALLER_DOWNLOAD_HTTP_400");
      }),
    };
    const autoUpdater = createAutoUpdater();
    const service = createService({
      autoUpdater,
      directDownloader,
      logger,
      onError,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        packageSize: 1024,
      })),
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "error",
      message: "UPDATE_INSTALLER_DOWNLOAD_HTTP_400",
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "UPDATE_INSTALLER_DOWNLOAD_HTTP_400",
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      "[update] backend installer download failed url=https://api.example.com/aoa_api/appVersion/download/abc message=UPDATE_INSTALLER_DOWNLOAD_HTTP_400",
    );
  });

  it("redacts secret query parameters from backend installer download logs", async () => {
    const logger = createLogger();
    const directDownloader = {
      download: vi.fn(async () => "C:/Temp/Voice Assistant Setup 1.2.4.exe"),
    };
    const service = createService({
      directDownloader,
      logger,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/download/abc?token=secret",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        packageSize: 1024,
      })),
    });

    await expect(service.checkForUpdates()).resolves.toMatchObject({
      status: "ready",
    });
    expect(directDownloader.download).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/download/abc?token=secret",
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] backend installer download started url=https://api.example.com/download/abc?token=*** packageName=Voice Assistant Setup 1.2.4.exe",
    );
    expect(logger.log.mock.calls.join("\n")).not.toContain("token=secret");
  });

  it("rejects backend installer fallback when the package is not Voice Assistant", async () => {
    const updateReady = vi.fn();
    const onError = vi.fn();
    const directDownloader = {
      download: vi.fn(async () => "C:/Temp/Codex Installer.exe"),
    };
    const autoUpdater = createAutoUpdater({
      checkForUpdates: vi.fn(async () => {
        throw Object.assign(new Error("ENOENT: app-update.yml"), {
          code: "ENOENT",
        });
      }),
    });
    const service = createService({
      autoUpdater,
      directDownloader,
      onError,
      onUpdateReady: updateReady,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Codex Installer.exe",
        packageSize: 1294880,
      })),
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "error",
      message: "UPDATE_INSTALLER_PACKAGE_MISMATCH",
    });
    expect(directDownloader.download).not.toHaveBeenCalled();
    expect(updateReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "UPDATE_INSTALLER_PACKAGE_MISMATCH" }),
    );
  });

  it("runs the downloaded backend installer on restart in the current install directory", async () => {
    const spawnInstaller = vi.fn();
    const autoUpdater = createAutoUpdater({
      checkForUpdates: vi.fn(async () => {
        throw Object.assign(new Error("ENOENT: app-update.yml"), {
          code: "ENOENT",
        });
      }),
    });
    const service = createService({
      autoUpdater,
      directDownloader: {
        download: vi.fn(async () => "C:/Temp/Voice Assistant Setup 1.2.4.exe"),
      },
      spawnInstaller,
      currentInstallDir: "C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "OPTIONAL",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      })),
    });

    await service.checkForUpdates();
    service.restartToUpdate();

    expect(spawnInstaller).toHaveBeenCalledWith({
      installerPath: "C:/Temp/Voice Assistant Setup 1.2.4.exe",
      installDir: "C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
    });
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("launches backend installers silently into the current install directory", () => {
    const child = new EventEmitter() as EventEmitter & { unref(): void };
    child.unref = vi.fn();
    const spawnProcess = vi.fn(() => child);
    const launcher = createBackendInstallerLauncher(spawnProcess as never);

    launcher({
      installerPath: "C:/Temp/Voice Assistant Setup 1.2.4.exe",
      installDir: "C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
    });

    expect(spawnProcess).toHaveBeenCalledWith(
      "C:/Temp/Voice Assistant Setup 1.2.4.exe",
      [
        "--silent-update",
        "--updated",
        "/S",
        "--force-run",
        "/currentuser",
        "/D=C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
      ],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }),
    );
    expect(child.unref).toHaveBeenCalled();
  });

  it("downloads backend installers into the updates directory with a safe filename", async () => {
    const updatesDir = await mkdtemp(join(tmpdir(), "voice-update-test-"));
    const downloader = createBackendInstallerDownloader({
      updatesDir,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    try {
      const installerPath = await downloader.download({
        url: "https://api.example.com/download/abc",
        packageSha256:
          "9c0d294c05fc1d88d698034609bb81c0c69196327594e4c69d2915c80fd9850c",
        packageName: "../Voice:Assistant?.exe",
      });

      expect(installerPath).toBe(join(updatesDir, "Voice_Assistant_.exe"));
      await expect(readFile(installerPath, "utf8")).resolves.toBe("installer");
    } finally {
      await rm(updatesDir, { recursive: true, force: true });
    }
  });

  it("reports backend installer download progress while streaming to disk", async () => {
    const updatesDir = await mkdtemp(join(tmpdir(), "voice-update-test-"));
    const onProgress = vi.fn();
    const downloader = createBackendInstallerDownloader({
      updatesDir,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: ReadableStream.from([
          new TextEncoder().encode("voice"),
          new TextEncoder().encode("-installer"),
        ]),
      })),
    });

    try {
      await downloader.download({
        url: "https://api.example.com/download/abc",
        packageSha256:
          "544955daeb1a7103b3373075c2e714d614ef52285c3edb47a7e819cf584165a3",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        packageSize: 15,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledWith({
        phase: "downloading",
        percent: 33,
        transferredBytes: 5,
        totalBytes: 15,
      });
      expect(onProgress).toHaveBeenCalledWith({
        phase: "downloading",
        percent: 100,
        transferredBytes: 15,
        totalBytes: 15,
      });
      expect(onProgress).toHaveBeenCalledWith({
        phase: "verifying",
        percent: 100,
        transferredBytes: 15,
        totalBytes: 15,
      });
    } finally {
      await rm(updatesDir, { recursive: true, force: true });
    }
  });

  it("streams backend installer downloads without package size metadata", async () => {
    const updatesDir = await mkdtemp(join(tmpdir(), "voice-update-test-"));
    const onProgress = vi.fn();
    const downloader = createBackendInstallerDownloader({
      updatesDir,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: ReadableStream.from([
          new TextEncoder().encode("voice"),
          new TextEncoder().encode("-installer"),
        ]),
      })),
    });

    try {
      const installerPath = await downloader.download({
        url: "https://api.example.com/download/abc",
        packageSha256:
          "544955daeb1a7103b3373075c2e714d614ef52285c3edb47a7e819cf584165a3",
        packageName: "Voice Assistant Setup 1.2.4.exe",
        onProgress,
      });

      await expect(readFile(installerPath, "utf8")).resolves.toBe(
        "voice-installer",
      );
      expect(onProgress).toHaveBeenCalledWith({
        phase: "downloading",
        percent: undefined,
        transferredBytes: 5,
      });
      expect(onProgress).toHaveBeenCalledWith({
        phase: "verifying",
        percent: undefined,
        transferredBytes: 15,
      });
    } finally {
      await rm(updatesDir, { recursive: true, force: true });
    }
  });

  it("rejects downloaded installers whose executable metadata is not Voice Assistant", async () => {
    const updatesDir = await mkdtemp(join(tmpdir(), "voice-update-test-"));
    const downloader = createBackendInstallerDownloader({
      updatesDir,
      inspectExecutableMetadata: vi.fn(async () => ({
        productName: "Store Installer",
        fileDescription: "Store Installer",
        companyName: "Microsoft Corporation",
        originalFilename: "StoreInstaller.exe",
        internalName: "StoreInstaller.exe",
      })),
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    try {
      await expect(
        downloader.download({
          url: "https://api.example.com/download/abc",
          packageSha256:
            "9c0d294c05fc1d88d698034609bb81c0c69196327594e4c69d2915c80fd9850c",
          packageName: "Voice Assistant Setup 1.2.4.exe",
        }),
      ).rejects.toThrow("UPDATE_INSTALLER_METADATA_MISMATCH");
    } finally {
      await rm(updatesDir, { recursive: true, force: true });
    }
  });

  it("reads Windows executable metadata through PowerShell", async () => {
    const metadata = await inspectWindowsExecutableMetadata(
      "C:/Temp/Voice Assistant Setup 1.2.4.exe",
      vi.fn(async () =>
        JSON.stringify({
          ProductName: "Voice Assistant",
          FileDescription: "",
          CompanyName: "",
          OriginalFilename: "",
          InternalName: "",
        }),
      ),
    );

    expect(metadata).toEqual({
      productName: "Voice Assistant",
      fileDescription: "",
      companyName: "",
      originalFilename: "",
      internalName: "",
    });
  });

  it("reports backend installer download HTTP errors", async () => {
    const downloader = createBackendInstallerDownloader({
      fetchImpl: vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        body: streamFromText(""),
      })),
    });

    await expect(
      downloader.download({
        url: "https://api.example.com/download/abc",
        packageSha256:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        packageName: "setup.exe",
      }),
    ).rejects.toThrow("UPDATE_INSTALLER_DOWNLOAD_HTTP_500");
  });

  it("allows backend installers without checksums when executable metadata is trusted", async () => {
    const updatesDir = await mkdtemp(join(tmpdir(), "voice-update-test-"));
    const downloader = createBackendInstallerDownloader({
      updatesDir,
      logger: createLogger(),
      inspectExecutableMetadata: vi.fn(async () => ({
        productName: "Voice Assistant",
        fileDescription: "Voice Assistant Setup",
        companyName: "",
        originalFilename: "Voice Assistant Setup.exe",
        internalName: "Voice Assistant Setup.exe",
      })),
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    try {
      await expect(
        downloader.download({
          url: "https://api.example.com/download/abc",
          packageName: "Voice Assistant Setup 1.2.4.exe",
        }),
      ).resolves.toBe(join(updatesDir, "Voice Assistant Setup 1.2.4.exe"));
    } finally {
      await rm(updatesDir, { recursive: true, force: true });
    }
  });

  it("rejects backend installers without checksums when executable metadata is unavailable", async () => {
    const downloader = createBackendInstallerDownloader({
      logger: createLogger(),
      inspectExecutableMetadata: vi.fn(async () => undefined),
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    await expect(
      downloader.download({
        url: "https://api.example.com/download/abc",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      }),
    ).rejects.toThrow("UPDATE_INSTALLER_TRUST_UNVERIFIED");
  });

  it("rejects backend installers without checksums when executable metadata has no trusted identity", async () => {
    const downloader = createBackendInstallerDownloader({
      logger: createLogger(),
      inspectExecutableMetadata: vi.fn(async () => ({
        productName: "",
        fileDescription: "",
        companyName: "",
        originalFilename: "",
        internalName: "",
      })),
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    await expect(
      downloader.download({
        url: "https://api.example.com/download/abc",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      }),
    ).rejects.toThrow("UPDATE_INSTALLER_TRUST_UNVERIFIED");
  });

  it("rejects invalid installer checksums instead of falling back to metadata trust", async () => {
    const downloader = createBackendInstallerDownloader({
      inspectExecutableMetadata: vi.fn(async () => ({
        productName: "Voice Assistant",
        fileDescription: "",
        companyName: "",
        originalFilename: "",
        internalName: "",
      })),
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    await expect(
      downloader.download({
        url: "https://api.example.com/download/abc",
        packageSha256: "not-a-sha256",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      }),
    ).rejects.toThrow("UPDATE_INSTALLER_SHA256_INVALID");
  });

  it("rejects backend installers when the checksum does not match", async () => {
    const downloader = createBackendInstallerDownloader({
      fetchImpl: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        body: streamFromText("installer"),
      })),
    });

    await expect(
      downloader.download({
        url: "https://api.example.com/download/abc",
        packageSha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      }),
    ).rejects.toThrow("UPDATE_INSTALLER_SHA256_MISMATCH");
  });

  it("notifies listeners with backend metadata after an update is downloaded", async () => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const logger = createLogger();
    const autoUpdater = createAutoUpdater({
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        const existing = listeners.get(event) ?? [];
        existing.push(listener);
        listeners.set(event, existing);
      }),
    });
    const updateReady = vi.fn();
    const service = createService({
      autoUpdater,
      logger,
      onUpdateReady: updateReady,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "OPTIONAL",
        updateLog: "新增体验优化",
        downloadUrl: "/appVersion/download/abc",
        packageSize: 2048,
        packageName: "setup.exe",
      })),
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
      packageName: "setup.exe",
    });
    expect(logger.log).toHaveBeenCalledWith(
      "[update] download ready version=1.2.4 type=OPTIONAL",
    );
  });

  it("reuses an in-flight backend check", async () => {
    let resolveCheck!: (value: { hasUpdate: false }) => void;
    const versionCheckClient = createVersionCheckClient(
      () =>
        new Promise<{ hasUpdate: false }>((resolve) => {
          resolveCheck = resolve;
        }),
    );
    const service = createService({ versionCheckClient });

    const first = service.checkForUpdates();
    const second = service.checkForUpdates();
    resolveCheck({ hasUpdate: false });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "up-to-date" },
      { status: "up-to-date" },
    ]);
    expect(versionCheckClient.check).toHaveBeenCalledTimes(1);
  });

  it("stops an in-flight backend check after dispose before starting electron-updater", async () => {
    const backendCheck =
      createDeferred<Awaited<ReturnType<VersionCheckClient["check"]>>>();
    const autoUpdater = createAutoUpdater();
    const onDownloadProgress = vi.fn();
    const onUpdateReady = vi.fn();
    const service = createService({
      autoUpdater,
      onDownloadProgress,
      onUpdateReady,
      versionCheckClient: createVersionCheckClient(() => backendCheck.promise),
    });

    const checkPromise = service.checkForUpdates();
    expect(onDownloadProgress).toHaveBeenCalledWith({
      phase: "checking",
      percent: 0,
    });

    service.dispose?.();
    backendCheck.resolve({
      hasUpdate: true,
      versionCode: "1.2.4",
      phase: "RELEASE",
      updateType: "OPTIONAL",
      updateLog: "notes",
      downloadUrl: "/appVersion/download/abc",
      packageName: "setup.exe",
    });

    await expect(checkPromise).resolves.toEqual({ status: "disabled" });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(onUpdateReady).not.toHaveBeenCalled();
    expect(onDownloadProgress).toHaveBeenCalledTimes(1);
  });

  it("does not publish a direct installer update that finishes after dispose", async () => {
    const installerDownload = createDeferred<string>();
    const onUpdateReady = vi.fn();
    const spawnInstaller = vi.fn();
    const directDownloader = {
      download: vi.fn(() => installerDownload.promise),
    };
    const service = createService({
      directDownloader,
      onUpdateReady,
      spawnInstaller,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "OPTIONAL",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      })),
    });

    const checkPromise = service.checkForUpdates();
    await vi.waitFor(() =>
      expect(directDownloader.download).toHaveBeenCalled(),
    );
    service.dispose?.();
    installerDownload.resolve("C:/Temp/Voice Assistant Setup 1.2.4.exe");

    await expect(checkPromise).resolves.toEqual({ status: "disabled" });
    expect(onUpdateReady).not.toHaveBeenCalled();

    service.restartToUpdate();

    expect(spawnInstaller).not.toHaveBeenCalled();
  });

  it("does not publish direct installer errors that finish after dispose", async () => {
    const installerDownload = createDeferred<string>();
    const logger = createLogger();
    const onError = vi.fn();
    const directDownloader = {
      download: vi.fn(() => installerDownload.promise),
    };
    const service = createService({
      directDownloader,
      logger,
      onError,
      versionCheckClient: createVersionCheckClient(async () => ({
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "OPTIONAL",
        updateLog: "notes",
        downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageName: "Voice Assistant Setup 1.2.4.exe",
      })),
    });

    const checkPromise = service.checkForUpdates();
    await vi.waitFor(() =>
      expect(directDownloader.download).toHaveBeenCalled(),
    );
    service.dispose?.();
    installerDownload.reject(new Error("UPDATE_INSTALLER_DOWNLOAD_HTTP_500"));

    await expect(checkPromise).resolves.toEqual({ status: "disabled" });
    expect(onError).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("backend installer download failed"),
    );
  });

  it("does not publish development backend updates that finish after dispose", async () => {
    const backendCheck =
      createDeferred<Awaited<ReturnType<VersionCheckClient["check"]>>>();
    const onUpdateReady = vi.fn();
    const service = createService({
      allowDevelopmentBackendCheck: true,
      isPackaged: false,
      onUpdateReady,
      versionCheckClient: createVersionCheckClient(() => backendCheck.promise),
    });

    const checkPromise = service.checkForUpdates();
    service.dispose?.();
    backendCheck.resolve({
      hasUpdate: true,
      versionCode: "1.2.4",
      phase: "RELEASE",
      updateType: "OPTIONAL",
      updateLog: "notes",
      downloadUrl: "/appVersion/download/real",
      packageName: "real-setup.exe",
    });

    await expect(checkPromise).resolves.toEqual({ status: "disabled" });
    expect(onUpdateReady).not.toHaveBeenCalled();
  });

  it("configures a generic update feed when a feed URL is provided", () => {
    const autoUpdater = createAutoUpdater({ setFeedURL: vi.fn() });

    createService({
      autoUpdater,
      updateFeedUrl: " https://updates.example.com/aoa/ ",
    });

    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith(
      "https://updates.example.com/aoa/",
    );
  });

  it("restarts through electron-updater after an update is ready", () => {
    const autoUpdater = createAutoUpdater();
    const service = createService({ autoUpdater });

    service.restartToUpdate();

    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it("returns a fake ready update in development when manually requested", async () => {
    const updateReady = vi.fn();
    const autoUpdater = createAutoUpdater();
    const logger = createLogger();
    const service = createService({
      autoUpdater,
      isPackaged: false,
      logger,
      onUpdateReady: updateReady,
    });

    await expect(
      service.checkForUpdates({ allowDevelopmentFakeUpdate: true }),
    ).resolves.toEqual({
      status: "ready",
      version: "0.1.1-dev",
      updateType: "OPTIONAL",
      updateLog: "Development fake update",
      phase: "RELEASE",
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(updateReady).toHaveBeenCalledWith({
      version: "0.1.1-dev",
      updateType: "OPTIONAL",
      updateLog: "Development fake update",
      phase: "RELEASE",
    });
    expect(logger.log).toHaveBeenCalledWith(
      "[update] development fake update ready version=0.1.1-dev",
    );
  });

  it("returns ready backend metadata in development when backend checks are enabled", async () => {
    const updateReady = vi.fn();
    const autoUpdater = createAutoUpdater();
    const logger = createLogger();
    const versionCheckClient = createVersionCheckClient(async () => ({
      hasUpdate: true,
      versionCode: "1.2.4",
      phase: "RELEASE",
      updateType: "OPTIONAL",
      updateLog: "真实后端更新",
      downloadUrl: "/appVersion/download/real",
      packageSize: 4096,
      packageName: "real-setup.exe",
    }));
    const service = createService({
      allowDevelopmentBackendCheck: true,
      autoUpdater,
      isPackaged: false,
      logger,
      onUpdateReady: updateReady,
      versionCheckClient,
    });

    await expect(
      service.checkForUpdates({ allowDevelopmentFakeUpdate: true }),
    ).resolves.toEqual({
      status: "ready",
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "OPTIONAL",
      updateLog: "真实后端更新",
      downloadUrl: "/appVersion/download/real",
      packageSize: 4096,
      packageName: "real-setup.exe",
    });
    expect(versionCheckClient.check).toHaveBeenCalledWith({
      platform: "WINDOWS",
      currentVersion: "1.2.3",
    });
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(updateReady).toHaveBeenCalledWith({
      version: "1.2.4",
      phase: "RELEASE",
      updateType: "OPTIONAL",
      updateLog: "真实后端更新",
      downloadUrl: "/appVersion/download/real",
      packageSize: 4096,
      packageName: "real-setup.exe",
    });
    expect(logger.log).toHaveBeenCalledWith(
      "[update] development backend check enabled",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] electron-updater check skipped: unpackaged runtime",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] development backend update ready version=1.2.4 type=OPTIONAL",
    );
  });

  it("does not restart through electron-updater in development", () => {
    const autoUpdater = createAutoUpdater();
    const service = createService({
      autoUpdater,
      isPackaged: false,
    });

    service.restartToUpdate();

    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("removes auto-updater listeners when disposed", () => {
    const listeners = new Map<string, unknown>();
    const autoUpdater = createAutoUpdater({
      on: vi.fn((event: string, listener: unknown) => {
        listeners.set(event, listener);
      }),
      off: vi.fn(),
    });
    const service = createService({ autoUpdater });

    service.dispose?.();

    expect(autoUpdater.off).toHaveBeenCalledWith(
      "update-downloaded",
      listeners.get("update-downloaded"),
    );
    expect(autoUpdater.off).toHaveBeenCalledWith(
      "error",
      listeners.get("error"),
    );
  });

  it("restores the previous auto-download setting when disposed", () => {
    const autoUpdater = createAutoUpdater({ autoDownload: false });
    const service = createService({ autoUpdater });

    expect(autoUpdater.autoDownload).toBe(true);

    service.dispose?.();

    expect(autoUpdater.autoDownload).toBe(false);
  });

  it("restores the previous feed URL when disposed and the adapter exposes it", () => {
    const autoUpdater = createAutoUpdater({
      getFeedURL: vi.fn(() => "https://updates.example.com/original.yml"),
      setFeedURL: vi.fn(),
    });
    const service = createService({
      autoUpdater,
      updateFeedUrl: "https://updates.example.com/authenticated.yml",
    });

    service.dispose?.();

    expect(autoUpdater.setFeedURL).toHaveBeenNthCalledWith(
      1,
      "https://updates.example.com/authenticated.yml",
    );
    expect(autoUpdater.setFeedURL).toHaveBeenNthCalledWith(
      2,
      "https://updates.example.com/original.yml",
    );
  });

  it("disposes update service side effects only once", () => {
    const autoUpdater = createAutoUpdater({
      autoDownload: false,
      getFeedURL: vi.fn(() => "https://updates.example.com/original.yml"),
      setFeedURL: vi.fn(),
      off: vi.fn(),
    });
    const service = createService({
      autoUpdater,
      updateFeedUrl: "https://updates.example.com/authenticated.yml",
    });

    service.dispose?.();
    service.dispose?.();

    expect(autoUpdater.autoDownload).toBe(false);
    expect(autoUpdater.setFeedURL).toHaveBeenCalledTimes(2);
    expect(autoUpdater.off).toHaveBeenCalledTimes(2);
  });

  it("ignores update checks in development", async () => {
    const autoUpdater = createAutoUpdater();
    const logger = createLogger();
    const versionCheckClient = createVersionCheckClient(async () => ({
      hasUpdate: false,
    }));
    const service = createService({
      autoUpdater,
      isPackaged: false,
      logger,
      versionCheckClient,
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      status: "disabled",
    });

    expect(versionCheckClient.check).not.toHaveBeenCalled();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "[update] check disabled: unpackaged runtime",
    );
  });
});

function createService({
  allowDevelopmentBackendCheck,
  autoUpdater = createAutoUpdater(),
  currentInstallDir,
  currentVersion = "1.2.3",
  directDownloader,
  isPackaged = true,
  logger = createLogger(),
  onDownloadProgress,
  onError = vi.fn(),
  onUpdateReady = vi.fn(),
  platform = "WINDOWS",
  quitApp,
  spawnInstaller,
  updateFeedUrl,
  versionCheckClient = createVersionCheckClient(async () => ({
    hasUpdate: false,
  })),
}: Partial<Parameters<typeof createUpdateService>[0]> = {}) {
  return createUpdateService({
    allowDevelopmentBackendCheck,
    autoUpdater,
    currentInstallDir,
    currentVersion,
    directDownloader,
    isPackaged,
    logger,
    onDownloadProgress,
    onError,
    onUpdateReady,
    platform,
    quitApp,
    spawnInstaller,
    updateFeedUrl,
    versionCheckClient,
  });
}

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
  };
}

function createAutoUpdater(overrides: Record<string, unknown> = {}) {
  return {
    autoDownload: false,
    checkForUpdates: vi.fn(async () => ({
      isUpdateAvailable: true,
      updateInfo: { version: "1.2.4" },
    })),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    ...overrides,
  };
}

function createVersionCheckClient(
  check: VersionCheckClient["check"],
): VersionCheckClient & {
  check: ReturnType<typeof vi.fn<VersionCheckClient["check"]>>;
} {
  return {
    check: vi.fn(check),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function streamFromText(text: string): ReadableStream<Uint8Array> {
  return ReadableStream.from([new TextEncoder().encode(text)]);
}
