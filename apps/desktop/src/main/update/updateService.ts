import type { UpdateDownloadedEvent } from "electron-updater";

export interface UpdateReadyPayload {
  version?: string;
}

export type UpdateCheckResult =
  | { status: "checking" }
  | { status: "disabled" };

export interface UpdateService {
  checkForUpdates(): Promise<UpdateCheckResult>;
  restartToUpdate(): void;
}

export interface AutoUpdaterAdapter {
  autoDownload: boolean;
  checkForUpdates(): Promise<unknown>;
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
  updateFeedUrl?: string;
  onUpdateReady(payload: UpdateReadyPayload): void;
  onError?(error: Error): void;
}

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
    async checkForUpdates(): Promise<UpdateCheckResult> {
      if (!shouldCheckForUpdates(isPackaged)) {
        return { status: "disabled" };
      }
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      return { status: "checking" };
    },
    restartToUpdate(): void {
      autoUpdater.quitAndInstall(false, true);
    }
  };
}
