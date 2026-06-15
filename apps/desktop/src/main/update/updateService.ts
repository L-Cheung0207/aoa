import type { UpdateDownloadedEvent } from "electron-updater";
import type {
  VersionCheckClient,
  VersionPhase,
  VersionPlatform,
  VersionUpdateType
} from "./versionCheckClient";

export interface UpdateMetadata {
  version?: string;
  phase?: VersionPhase;
  updateType?: VersionUpdateType;
  updateLog?: string;
  downloadUrl?: string;
  packageSize?: number;
  packageName?: string;
}

export interface UpdateReadyPayload extends UpdateMetadata {}

export type UpdateCheckResult =
  | { status: "disabled" }
  | { status: "up-to-date" }
  | ({ status: "available"; updaterError?: string } & UpdateMetadata)
  | ({ status: "ready" } & UpdateReadyPayload)
  | { status: "error"; message: string };

export interface CheckForUpdatesOptions {
  allowDevelopmentFakeUpdate?: boolean;
}

interface AutoUpdaterCheckResult {
  isUpdateAvailable: boolean;
  updateInfo?: { version?: string };
}

export interface UpdateService {
  checkForUpdates(options?: CheckForUpdatesOptions): Promise<UpdateCheckResult>;
  restartToUpdate(): void;
}

export interface AutoUpdaterAdapter {
  autoDownload: boolean;
  checkForUpdates(): Promise<AutoUpdaterCheckResult | null>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  setFeedURL?(options: string): void;
  on(
    event: "update-downloaded",
    listener: (event: UpdateDownloadedEvent) => void
  ): void;
  on(event: "error", listener: (error: Error) => void): void;
}

export interface CreateUpdateServiceOptions {
  autoUpdater: AutoUpdaterAdapter;
  currentVersion?: string | undefined;
  isPackaged: boolean;
  platform?: VersionPlatform | undefined;
  updateFeedUrl?: string | undefined;
  versionCheckClient?: VersionCheckClient | undefined;
  onUpdateReady(payload: UpdateReadyPayload): void;
  onError?(error: Error): void;
}

const DEVELOPMENT_FAKE_UPDATE_VERSION = "0.1.1-dev";
const DEVELOPMENT_FAKE_UPDATE_READY_DELAY_MS = 300;
const DEVELOPMENT_FAKE_UPDATE_PAYLOAD: UpdateReadyPayload = {
  version: DEVELOPMENT_FAKE_UPDATE_VERSION,
  phase: "RELEASE",
  updateType: "OPTIONAL",
  updateLog: "Development fake update"
};

export function shouldCheckForUpdates(isPackaged: boolean): boolean {
  return isPackaged;
}

export function createUpdateService(
  options: CreateUpdateServiceOptions
): UpdateService {
  const {
    autoUpdater,
    currentVersion,
    isPackaged,
    onError,
    onUpdateReady,
    platform,
    updateFeedUrl,
    versionCheckClient
  } = options;
  let currentCheck: Promise<UpdateCheckResult> | undefined;
  let latestAvailablePayload: UpdateReadyPayload | undefined;
  let latestReadyPayload: UpdateReadyPayload | undefined;

  autoUpdater.autoDownload = true;
  const normalizedFeedUrl = updateFeedUrl?.trim();
  if (normalizedFeedUrl) {
    autoUpdater.setFeedURL?.(normalizedFeedUrl);
  }

  autoUpdater.on("update-downloaded", (event) => {
    const payload = {
      ...latestAvailablePayload,
      version: event.version ?? latestAvailablePayload?.version
    };
    latestReadyPayload = payload;
    onUpdateReady(payload);
  });

  autoUpdater.on("error", (error) => {
    onError?.(error);
  });

  return {
    async checkForUpdates(
      checkOptions: CheckForUpdatesOptions = {}
    ): Promise<UpdateCheckResult> {
      if (!shouldCheckForUpdates(isPackaged)) {
        if (checkOptions.allowDevelopmentFakeUpdate) {
          setTimeout(() => {
            latestReadyPayload = DEVELOPMENT_FAKE_UPDATE_PAYLOAD;
            onUpdateReady(DEVELOPMENT_FAKE_UPDATE_PAYLOAD);
          }, DEVELOPMENT_FAKE_UPDATE_READY_DELAY_MS);
          return {
            status: "available",
            ...DEVELOPMENT_FAKE_UPDATE_PAYLOAD
          };
        }
        return { status: "disabled" };
      }
      if (latestReadyPayload) {
        return { status: "ready", ...latestReadyPayload };
      }
      if (currentCheck) {
        return currentCheck;
      }

      currentCheck = runBackendUpdateCheck({
        autoUpdater,
        currentVersion,
        onError,
        platform,
        setLatestAvailablePayload: (payload) => {
          latestAvailablePayload = payload;
        },
        versionCheckClient
      }).finally(() => {
        currentCheck = undefined;
      });
      return currentCheck;
    },
    restartToUpdate(): void {
      if (!isPackaged) {
        return;
      }
      autoUpdater.quitAndInstall(false, true);
    }
  };
}

async function runBackendUpdateCheck({
  autoUpdater,
  currentVersion,
  onError,
  platform,
  setLatestAvailablePayload,
  versionCheckClient
}: {
  autoUpdater: AutoUpdaterAdapter;
  currentVersion?: string | undefined;
  onError?: ((error: Error) => void) | undefined;
  platform?: VersionPlatform | undefined;
  setLatestAvailablePayload(payload: UpdateReadyPayload): void;
  versionCheckClient?: VersionCheckClient | undefined;
}): Promise<UpdateCheckResult> {
  if (!versionCheckClient || !platform || !currentVersion) {
    return { status: "disabled" };
  }

  try {
    const backendResult = await versionCheckClient.check({
      platform,
      currentVersion
    });
    if ("disabled" in backendResult) {
      return { status: "disabled" };
    }
    if (!backendResult.hasUpdate) {
      return { status: "up-to-date" };
    }

    const payload: UpdateReadyPayload = {
      version: backendResult.versionCode,
      phase: backendResult.phase,
      updateType: backendResult.updateType,
      updateLog: backendResult.updateLog,
      downloadUrl: backendResult.downloadUrl,
      packageSize: backendResult.packageSize,
      packageName: backendResult.packageName
    };
    setLatestAvailablePayload(payload);

    const availableResult: Extract<UpdateCheckResult, { status: "available" }> = {
      status: "available",
      ...payload
    };

    try {
      await autoUpdater.checkForUpdates();
      return availableResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onError?.(error instanceof Error ? error : new Error(message));
      return {
        ...availableResult,
        updaterError: message
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onError?.(error instanceof Error ? error : new Error(message));
    return { status: "error", message };
  }
}
