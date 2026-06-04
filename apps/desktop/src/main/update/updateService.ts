import type { UpdateDownloadedEvent } from "electron-updater";

export interface UpdateReadyPayload {
  version?: string;
}

export type UpdateCheckResult =
  | { status: "disabled" }
  | { status: "up-to-date" }
  | { status: "available"; version?: string }
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
  isPackaged: boolean;
  updateFeedUrl?: string | undefined;
  onUpdateReady(payload: UpdateReadyPayload): void;
  onError?(error: Error): void;
}

const DEVELOPMENT_FAKE_UPDATE_VERSION = "0.1.1-dev";
const DEVELOPMENT_FAKE_UPDATE_READY_DELAY_MS = 300;

export function shouldCheckForUpdates(isPackaged: boolean): boolean {
  return isPackaged;
}

export function createUpdateService(
  options: CreateUpdateServiceOptions
): UpdateService {
  const { autoUpdater, isPackaged, onError, onUpdateReady, updateFeedUrl } = options;
  autoUpdater.autoDownload = true;
  const normalizedFeedUrl = updateFeedUrl?.trim();
  if (normalizedFeedUrl) {
    autoUpdater.setFeedURL?.(normalizedFeedUrl);
  }

  autoUpdater.on("update-downloaded", (event) => {
    onUpdateReady({ version: event.version });
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
            onUpdateReady({ version: DEVELOPMENT_FAKE_UPDATE_VERSION });
          }, DEVELOPMENT_FAKE_UPDATE_READY_DELAY_MS);
          return {
            status: "available",
            version: DEVELOPMENT_FAKE_UPDATE_VERSION
          };
        }
        return { status: "disabled" };
      }
      try {
        const result = await autoUpdater.checkForUpdates();
        if (!result) {
          return { status: "error", message: "更新檢查已取消" };
        }
        if (result.isUpdateAvailable) {
          const version = result.updateInfo?.version;
          return version
            ? { status: "available", version }
            : { status: "available" };
        }
        return { status: "up-to-date" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onError?.(error instanceof Error ? error : new Error(message));
        return { status: "error", message };
      }
    },
    restartToUpdate(): void {
      if (!isPackaged) {
        return;
      }
      autoUpdater.quitAndInstall(false, true);
    }
  };
}
