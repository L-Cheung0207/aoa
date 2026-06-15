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

export interface UpdateLogger {
  log(message: string): void;
  warn(message: string): void;
}

export interface CreateUpdateServiceOptions {
  allowDevelopmentBackendCheck?: boolean | undefined;
  autoUpdater: AutoUpdaterAdapter;
  currentVersion?: string | undefined;
  isPackaged: boolean;
  logger?: UpdateLogger | undefined;
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
    allowDevelopmentBackendCheck = false,
    autoUpdater,
    currentVersion,
    isPackaged,
    logger = console,
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
  logger.log("[update] electron-updater autoDownload enabled");
  const normalizedFeedUrl = updateFeedUrl?.trim();
  if (normalizedFeedUrl) {
    autoUpdater.setFeedURL?.(normalizedFeedUrl);
    logger.log(`[update] feed url configured url=${normalizedFeedUrl}`);
  }

  autoUpdater.on("update-downloaded", (event) => {
    const payload = {
      ...latestAvailablePayload,
      version: event.version ?? latestAvailablePayload?.version
    };
    latestReadyPayload = payload;
    logger.log(
      `[update] download ready version=${payload.version ?? ""} type=${payload.updateType ?? ""}`
    );
    onUpdateReady(payload);
  });

  autoUpdater.on("error", (error) => {
    logger.warn(`[update] electron-updater error message=${error.message}`);
    onError?.(error);
  });

  return {
    async checkForUpdates(
      checkOptions: CheckForUpdatesOptions = {}
    ): Promise<UpdateCheckResult> {
      if (!shouldCheckForUpdates(isPackaged)) {
        if (allowDevelopmentBackendCheck) {
          logger.log("[update] development backend check enabled");
          return runDevelopmentBackendUpdateCheck({
            currentVersion,
            logger,
            onError,
            onUpdateReady,
            platform,
            setLatestAvailablePayload: (payload) => {
              latestAvailablePayload = payload;
            },
            setLatestReadyPayload: (payload) => {
              latestReadyPayload = payload;
            },
            versionCheckClient
          });
        }
        if (checkOptions.allowDevelopmentFakeUpdate) {
          logger.log("[update] development fake update scheduled");
          setTimeout(() => {
            latestReadyPayload = DEVELOPMENT_FAKE_UPDATE_PAYLOAD;
            logger.log(
              `[update] development fake update ready version=${DEVELOPMENT_FAKE_UPDATE_PAYLOAD.version}`
            );
            onUpdateReady(DEVELOPMENT_FAKE_UPDATE_PAYLOAD);
          }, DEVELOPMENT_FAKE_UPDATE_READY_DELAY_MS);
          return {
            status: "available",
            ...DEVELOPMENT_FAKE_UPDATE_PAYLOAD
          };
        }
        logger.log("[update] check disabled: unpackaged runtime");
        return { status: "disabled" };
      }
      if (latestReadyPayload) {
        logger.log(
          `[update] returning cached ready update version=${latestReadyPayload.version ?? ""} type=${latestReadyPayload.updateType ?? ""}`
        );
        return { status: "ready", ...latestReadyPayload };
      }
      if (currentCheck) {
        logger.log("[update] reusing in-flight check");
        return currentCheck;
      }

      logger.log("[update] check started");
      currentCheck = runBackendUpdateCheck({
        autoUpdater,
        currentVersion,
        logger,
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
        logger.log("[update] restart skipped: unpackaged runtime");
        return;
      }
      logger.log("[update] restart invoked");
      autoUpdater.quitAndInstall(false, true);
    }
  };
}

async function runDevelopmentBackendUpdateCheck({
  currentVersion,
  logger,
  onError,
  onUpdateReady,
  platform,
  setLatestAvailablePayload,
  setLatestReadyPayload,
  versionCheckClient
}: {
  currentVersion?: string | undefined;
  logger: UpdateLogger;
  onError?: ((error: Error) => void) | undefined;
  onUpdateReady(payload: UpdateReadyPayload): void;
  platform?: VersionPlatform | undefined;
  setLatestAvailablePayload(payload: UpdateReadyPayload): void;
  setLatestReadyPayload(payload: UpdateReadyPayload): void;
  versionCheckClient?: VersionCheckClient | undefined;
}): Promise<UpdateCheckResult> {
  const result = await runBackendUpdateCheck({
    currentVersion,
    logger,
    onError,
    platform,
    setLatestAvailablePayload,
    skipAutoUpdaterCheck: true,
    versionCheckClient
  });
  if (result.status !== "available") {
    return result;
  }
  const payload: UpdateReadyPayload = toUpdateReadyPayload(result);
  setTimeout(() => {
    setLatestReadyPayload(payload);
    logger.log(
      `[update] development backend update ready version=${payload.version ?? ""} type=${payload.updateType ?? ""}`
    );
    onUpdateReady(payload);
  }, DEVELOPMENT_FAKE_UPDATE_READY_DELAY_MS);
  return result;
}

async function runBackendUpdateCheck({
  autoUpdater,
  currentVersion,
  logger,
  onError,
  platform,
  setLatestAvailablePayload,
  skipAutoUpdaterCheck = false,
  versionCheckClient
}: {
  autoUpdater?: AutoUpdaterAdapter | undefined;
  currentVersion?: string | undefined;
  logger: UpdateLogger;
  onError?: ((error: Error) => void) | undefined;
  platform?: VersionPlatform | undefined;
  setLatestAvailablePayload(payload: UpdateReadyPayload): void;
  skipAutoUpdaterCheck?: boolean | undefined;
  versionCheckClient?: VersionCheckClient | undefined;
}): Promise<UpdateCheckResult> {
  if (!versionCheckClient || !platform || !currentVersion) {
    logger.log("[update] check disabled: missing backend config");
    return { status: "disabled" };
  }

  try {
    logger.log(
      `[update] backend check started platform=${platform} currentVersion=${currentVersion}`
    );
    const backendResult = await versionCheckClient.check({
      platform,
      currentVersion
    });
    if ("disabled" in backendResult) {
      logger.log("[update] backend check disabled");
      return { status: "disabled" };
    }
    if (!backendResult.hasUpdate) {
      logger.log("[update] backend no update");
      return { status: "up-to-date" };
    }

    const payload: UpdateReadyPayload = {};
    setOptionalPayloadField(payload, "version", backendResult.versionCode);
    setOptionalPayloadField(payload, "phase", backendResult.phase);
    setOptionalPayloadField(payload, "updateType", backendResult.updateType);
    setOptionalPayloadField(payload, "updateLog", backendResult.updateLog);
    setOptionalPayloadField(payload, "downloadUrl", backendResult.downloadUrl);
    setOptionalPayloadField(payload, "packageSize", backendResult.packageSize);
    setOptionalPayloadField(payload, "packageName", backendResult.packageName);
    setLatestAvailablePayload(payload);
    logger.log(
      `[update] backend update available version=${payload.version ?? ""} type=${payload.updateType ?? ""}`
    );

    const availableResult: Extract<UpdateCheckResult, { status: "available" }> = {
      status: "available",
      ...payload
    };

    try {
      if (skipAutoUpdaterCheck) {
        logger.log("[update] electron-updater check skipped: unpackaged runtime");
        return availableResult;
      }
      logger.log("[update] electron-updater check started");
      await autoUpdater?.checkForUpdates();
      logger.log("[update] electron-updater check completed");
      return availableResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[update] electron-updater check failed message=${message}`);
      onError?.(error instanceof Error ? error : new Error(message));
      return {
        ...availableResult,
        updaterError: message
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[update] check failed message=${message}`);
    onError?.(error instanceof Error ? error : new Error(message));
    return { status: "error", message };
  }
}

function toUpdateReadyPayload(
  result: Extract<UpdateCheckResult, { status: "available" }>
): UpdateReadyPayload {
  const payload: UpdateReadyPayload = {};
  setOptionalPayloadField(payload, "version", result.version);
  setOptionalPayloadField(payload, "phase", result.phase);
  setOptionalPayloadField(payload, "updateType", result.updateType);
  setOptionalPayloadField(payload, "updateLog", result.updateLog);
  setOptionalPayloadField(payload, "downloadUrl", result.downloadUrl);
  setOptionalPayloadField(payload, "packageSize", result.packageSize);
  setOptionalPayloadField(payload, "packageName", result.packageName);
  return payload;
}

function setOptionalPayloadField<Key extends keyof UpdateReadyPayload>(
  payload: UpdateReadyPayload,
  key: Key,
  value: UpdateReadyPayload[Key] | undefined
): void {
  if (value !== undefined) {
    payload[key] = value;
  }
}
