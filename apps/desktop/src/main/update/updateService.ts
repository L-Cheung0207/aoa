import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { UpdateDownloadedEvent } from "electron-updater";
import type {
  VersionCheckClient,
  VersionPhase,
  VersionPlatform,
  VersionUpdateType
} from "./versionCheckClient";
import { sanitizeUrlForLog } from "../log/logSanitizer";

export interface UpdateMetadata {
  version?: string;
  phase?: VersionPhase;
  updateType?: VersionUpdateType;
  updateLog?: string;
  downloadUrl?: string;
  packageSha256?: string;
  packageSize?: number;
  packageName?: string;
}

export interface UpdateReadyPayload extends UpdateMetadata {}

export interface BackendInstallerDownloadProgress {
  phase: "downloading" | "verifying";
  percent?: number | undefined;
  transferredBytes?: number | undefined;
  totalBytes?: number | undefined;
}

export interface UpdateDownloadProgressPayload
  extends Omit<BackendInstallerDownloadProgress, "phase"> {
  phase: "checking" | BackendInstallerDownloadProgress["phase"];
  packageName?: string | undefined;
  version?: string | undefined;
}

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

export interface BackendInstallerDownloadInput {
  url: string;
  packageSha256?: string | undefined;
  packageName?: string | undefined;
  packageSize?: number | undefined;
  onProgress?: ((payload: BackendInstallerDownloadProgress) => void) | undefined;
}

export interface BackendInstallerDownloader {
  download(input: BackendInstallerDownloadInput): Promise<string>;
}

export interface BackendInstallerLaunchInput {
  installerPath: string;
  installDir?: string | undefined;
}

export type BackendInstallerLauncher = (input: BackendInstallerLaunchInput) => void;

export interface WindowsExecutableMetadata {
  productName: string;
  fileDescription: string;
  companyName: string;
  originalFilename: string;
  internalName: string;
}

type WindowsExecutableMetadataInspector = (
  filePath: string
) => Promise<WindowsExecutableMetadata | undefined>;

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
  currentInstallDir?: string | undefined;
  currentVersion?: string | undefined;
  directDownloader?: BackendInstallerDownloader | undefined;
  isPackaged: boolean;
  logger?: UpdateLogger | undefined;
  platform?: VersionPlatform | undefined;
  quitApp?: (() => void) | undefined;
  spawnInstaller?: BackendInstallerLauncher | undefined;
  updateFeedUrl?: string | undefined;
  versionCheckClient?: VersionCheckClient | undefined;
  onUpdateReady(payload: UpdateReadyPayload): void;
  onDownloadProgress?(payload: UpdateDownloadProgressPayload): void;
  onError?(error: Error): void;
}

const DEVELOPMENT_FAKE_UPDATE_VERSION = "0.1.1-dev";
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
    currentInstallDir,
    currentVersion,
    directDownloader = createBackendInstallerDownloader(),
    isPackaged,
    logger = console,
    onDownloadProgress,
    onError,
    onUpdateReady,
    platform,
    quitApp,
    spawnInstaller = createBackendInstallerLauncher(),
    updateFeedUrl,
    versionCheckClient
  } = options;
  let currentCheck: Promise<UpdateCheckResult> | undefined;
  let latestAvailablePayload: UpdateReadyPayload | undefined;
  let latestReadyPayload: UpdateReadyPayload | undefined;
  let latestBackendInstallerPath: string | undefined;

  autoUpdater.autoDownload = true;
  logger.log("[update] electron-updater autoDownload enabled");
  const normalizedFeedUrl = updateFeedUrl?.trim();
  if (normalizedFeedUrl) {
    autoUpdater.setFeedURL?.(normalizedFeedUrl);
    logger.log(
      `[update] feed url configured url=${sanitizeUrlForLog(normalizedFeedUrl)}`
    );
  }

  autoUpdater.on("update-downloaded", (event) => {
    const payload = {
      ...latestAvailablePayload,
      version: event.version ?? latestAvailablePayload?.version
    };
    latestReadyPayload = payload;
    latestBackendInstallerPath = undefined;
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
            onDownloadProgress,
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
          latestReadyPayload = DEVELOPMENT_FAKE_UPDATE_PAYLOAD;
          latestBackendInstallerPath = undefined;
          logger.log(
            `[update] development fake update ready version=${DEVELOPMENT_FAKE_UPDATE_PAYLOAD.version}`
          );
          onUpdateReady(DEVELOPMENT_FAKE_UPDATE_PAYLOAD);
          return {
            status: "ready",
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
        directDownloader,
        logger,
        onDownloadProgress,
        onError,
        onUpdateReady,
        platform,
        setLatestAvailablePayload: (payload) => {
          latestAvailablePayload = payload;
        },
        setLatestBackendInstallerPath: (installerPath) => {
          latestBackendInstallerPath = installerPath;
        },
        setLatestReadyPayload: (payload) => {
          latestReadyPayload = payload;
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
      if (latestBackendInstallerPath) {
        logger.log(
          `[update] launching backend installer path=${latestBackendInstallerPath}`
        );
        spawnInstaller({
          installerPath: latestBackendInstallerPath,
          installDir: currentInstallDir
        });
        quitApp?.();
        return;
      }
      autoUpdater.quitAndInstall(false, true);
    }
  };
}

async function runDevelopmentBackendUpdateCheck({
  currentVersion,
  logger,
  onDownloadProgress,
  onError,
  onUpdateReady,
  platform,
  setLatestAvailablePayload,
  setLatestReadyPayload,
  versionCheckClient
}: {
  currentVersion?: string | undefined;
  logger: UpdateLogger;
  onDownloadProgress?: ((payload: UpdateDownloadProgressPayload) => void) | undefined;
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
    onDownloadProgress,
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
  setLatestReadyPayload(payload);
  logger.log(
    `[update] development backend update ready version=${payload.version ?? ""} type=${payload.updateType ?? ""}`
  );
  onUpdateReady(payload);
  return { status: "ready", ...payload };
}

async function runBackendUpdateCheck({
  autoUpdater,
  currentVersion,
  directDownloader,
  logger,
  onDownloadProgress,
  onError,
  onUpdateReady,
  platform,
  setLatestAvailablePayload,
  setLatestBackendInstallerPath,
  setLatestReadyPayload,
  skipAutoUpdaterCheck = false,
  versionCheckClient
}: {
  autoUpdater?: AutoUpdaterAdapter | undefined;
  currentVersion?: string | undefined;
  directDownloader?: BackendInstallerDownloader | undefined;
  logger: UpdateLogger;
  onDownloadProgress?: ((payload: UpdateDownloadProgressPayload) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  onUpdateReady?: ((payload: UpdateReadyPayload) => void) | undefined;
  platform?: VersionPlatform | undefined;
  setLatestAvailablePayload(payload: UpdateReadyPayload): void;
  setLatestBackendInstallerPath?: ((installerPath: string) => void) | undefined;
  setLatestReadyPayload?: ((payload: UpdateReadyPayload) => void) | undefined;
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
    onDownloadProgress?.({ phase: "checking", percent: 0 });
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
    setOptionalPayloadField(payload, "packageSha256", backendResult.packageSha256);
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

    if (directDownloader && isHttpUrl(payload.downloadUrl)) {
      try {
        return await downloadBackendInstallerUpdate({
          availableResult,
          directDownloader,
          logger,
          onDownloadProgress,
          onError,
          onUpdateReady,
          payload,
          setLatestBackendInstallerPath,
          setLatestReadyPayload
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `[update] backend installer download failed url=${sanitizeUrlForLog(
            payload.downloadUrl ?? ""
          )} message=${message}`
        );
        onError?.(error instanceof Error ? error : new Error(message));
        return { status: "error", message };
      }
    }

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
      if (
        isRecoverableUpdaterFeedError(error) &&
        directDownloader &&
        isHttpUrl(payload.downloadUrl)
      ) {
        logger.warn(
          `[update] electron-updater feed unavailable; falling back to backend installer download message=${message}`
        );
        return downloadBackendInstallerUpdate({
          availableResult,
          directDownloader,
          logger,
          onDownloadProgress,
          onError,
          onUpdateReady,
          payload,
          setLatestBackendInstallerPath,
          setLatestReadyPayload
        });
      }
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

async function downloadBackendInstallerUpdate({
  availableResult,
  directDownloader,
  logger,
  onDownloadProgress,
  onError,
  onUpdateReady,
  payload,
  setLatestBackendInstallerPath,
  setLatestReadyPayload
}: {
  availableResult: Extract<UpdateCheckResult, { status: "available" }>;
  directDownloader: BackendInstallerDownloader;
  logger: UpdateLogger;
  onDownloadProgress?: ((payload: UpdateDownloadProgressPayload) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  onUpdateReady?: ((payload: UpdateReadyPayload) => void) | undefined;
  payload: UpdateReadyPayload;
  setLatestBackendInstallerPath?: ((installerPath: string) => void) | undefined;
  setLatestReadyPayload?: ((payload: UpdateReadyPayload) => void) | undefined;
}): Promise<UpdateCheckResult> {
  if (!isTrustedVoiceAssistantInstallerName(payload)) {
    const packageMismatchError = new Error("UPDATE_INSTALLER_PACKAGE_MISMATCH");
    logger.warn(
      `[update] backend installer rejected packageName=${payload.packageName ?? ""} downloadUrl=${sanitizeUrlForLog(
        payload.downloadUrl ?? ""
      )}`
    );
    onError?.(packageMismatchError);
    return { status: "error", message: packageMismatchError.message };
  }
  logger.log(
    `[update] backend installer download started url=${sanitizeUrlForLog(
      payload.downloadUrl ?? ""
    )} packageName=${payload.packageName ?? ""}`
  );
  const totalBytes = normalizePackageSize(payload.packageSize);
  onDownloadProgress?.({
    phase: "downloading",
    percent: 0,
    transferredBytes: 0,
    ...(totalBytes !== undefined ? { totalBytes } : {}),
    packageName: payload.packageName,
    version: payload.version
  });
  const installerPath = await directDownloader.download({
    url: payload.downloadUrl ?? "",
    packageSha256: payload.packageSha256,
    packageName: payload.packageName,
    packageSize: totalBytes,
    onProgress: (progress) => {
      onDownloadProgress?.({
        ...progress,
        packageName: payload.packageName,
        version: payload.version
      });
    }
  });
  setLatestBackendInstallerPath?.(installerPath);
  const readyPayload = toUpdateReadyPayload(availableResult);
  setLatestReadyPayload?.(readyPayload);
  logger.log(
    `[update] backend installer downloaded path=${installerPath} version=${readyPayload.version ?? ""}`
  );
  onUpdateReady?.(readyPayload);
  return { status: "ready", ...readyPayload };
}

function isRecoverableUpdaterFeedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = "code" in error ? String(error.code) : "";
  return (
    (code === "ENOENT" && error.message.includes("app-update.yml")) ||
    error.message.includes("latest.yml") ||
    error.message.includes("app-update.yml") ||
    error.message.includes("Cannot find channel")
  );
}

function isHttpUrl(input: string | undefined): input is string {
  if (!input) {
    return false;
  }
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isTrustedVoiceAssistantInstallerName(payload: UpdateReadyPayload): boolean {
  const candidateName = payload.packageName?.trim() || fileNameFromUrl(payload.downloadUrl);
  return /^voice assistant(?: setup)?(?:[\s._-].*)?\.exe$/i.test(candidateName);
}

function fileNameFromUrl(input: string | undefined): string {
  if (!input) {
    return "";
  }
  try {
    return basename(new URL(input).pathname);
  } catch {
    return "";
  }
}

interface DownloadFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body?: unknown;
  arrayBuffer?: (() => Promise<ArrayBuffer>) | undefined;
}

type DownloadFetch = (input: string) => Promise<DownloadFetchResponse>;

const execFileAsync = promisify(execFile);

export function createBackendInstallerDownloader({
  fetchImpl = fetch,
  inspectExecutableMetadata = inspectWindowsExecutableMetadata,
  logger = console,
  updatesDir = join(tmpdir(), "voice-assistant-updates")
}: {
  fetchImpl?: DownloadFetch | undefined;
  inspectExecutableMetadata?: WindowsExecutableMetadataInspector | undefined;
  logger?: UpdateLogger | undefined;
  updatesDir?: string | undefined;
} = {}): BackendInstallerDownloader {
  return {
    async download(input): Promise<string> {
      const response = await fetchImpl(input.url);
      if (!response.ok) {
        throw new Error(`UPDATE_INSTALLER_DOWNLOAD_HTTP_${response.status}`);
      }
      await mkdir(updatesDir, { recursive: true });
      const filePath = join(
        updatesDir,
        sanitizeInstallerFileName(input.packageName ?? input.url)
      );
      const expectedSha256 = normalizeSha256(input.packageSha256);
      if (input.packageSha256 !== undefined && !expectedSha256) {
        throw new Error("UPDATE_INSTALLER_SHA256_INVALID");
      }
      if (!expectedSha256) {
        logger.warn(
          "[update] backend installer checksum missing; falling back to executable metadata trust"
        );
      }
      const totalBytes = normalizePackageSize(input.packageSize);
      const actualSha256 = await writeDownloadToFileAndHash(response, filePath, {
        totalBytes,
        onProgress: input.onProgress
      });
      if (expectedSha256 && actualSha256 !== expectedSha256) {
        throw new Error("UPDATE_INSTALLER_SHA256_MISMATCH");
      }
      const metadata = await inspectExecutableMetadata(filePath);
      if (!metadata) {
        if (!expectedSha256) {
          throw new Error("UPDATE_INSTALLER_TRUST_UNVERIFIED");
        }
        return filePath;
      }
      const metadataHasIdentity = hasExecutableMetadataIdentity(metadata);
      if (!expectedSha256 && !metadataHasIdentity) {
        throw new Error("UPDATE_INSTALLER_TRUST_UNVERIFIED");
      }
      if (metadataHasIdentity && !isTrustedVoiceAssistantExecutableMetadata(metadata)) {
        throw new Error("UPDATE_INSTALLER_METADATA_MISMATCH");
      }
      return filePath;
    }
  };
}

function normalizeSha256(input: string | undefined): string | undefined {
  const normalized = input?.trim().toLowerCase();
  return normalized && /^[a-f0-9]{64}$/.test(normalized)
    ? normalized
    : undefined;
}

async function writeDownloadToFileAndHash(
  response: DownloadFetchResponse,
  filePath: string,
  options: {
    totalBytes?: number | undefined;
    onProgress?: ((payload: BackendInstallerDownloadProgress) => void) | undefined;
  } = {}
): Promise<string> {
  const hash = createHash("sha256");
  let transferredBytes = 0;
  const emitProgress = (): void => {
    options.onProgress?.({
      phase: "downloading",
      percent: calculateDownloadPercent(transferredBytes, options.totalBytes),
      transferredBytes,
      ...(options.totalBytes !== undefined ? { totalBytes: options.totalBytes } : {})
    });
  };
  const responseBody = toNodeReadableStream(response.body);
  if (responseBody) {
    const hashingStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk);
        transferredBytes += chunk.byteLength;
        emitProgress();
        callback(null, chunk);
      }
    });
    await pipeline(
      Readable.fromWeb(responseBody),
      hashingStream,
      createWriteStream(filePath)
    );
    options.onProgress?.({
      phase: "verifying",
      percent: calculateDownloadPercent(transferredBytes, options.totalBytes),
      transferredBytes,
      ...(options.totalBytes !== undefined ? { totalBytes: options.totalBytes } : {})
    });
    return hash.digest("hex");
  }

  if (response.arrayBuffer) {
    const buffer = Buffer.from(await response.arrayBuffer());
    hash.update(buffer);
    transferredBytes = buffer.byteLength;
    emitProgress();
    await pipeline(Readable.from(buffer), createWriteStream(filePath));
    options.onProgress?.({
      phase: "verifying",
      percent: calculateDownloadPercent(transferredBytes, options.totalBytes),
      transferredBytes,
      ...(options.totalBytes !== undefined ? { totalBytes: options.totalBytes } : {})
    });
    return hash.digest("hex");
  }

  throw new Error("UPDATE_INSTALLER_DOWNLOAD_BODY_MISSING");
}

function normalizePackageSize(input: number | undefined): number | undefined {
  return typeof input === "number" && Number.isFinite(input) && input > 0
    ? Math.round(input)
    : undefined;
}

function calculateDownloadPercent(
  transferredBytes: number,
  totalBytes: number | undefined
): number | undefined {
  if (!totalBytes || totalBytes <= 0) {
    return undefined;
  }
  return Math.min(100, Math.max(0, Math.round((transferredBytes / totalBytes) * 100)));
}

function toNodeReadableStream(input: unknown): NodeReadableStream<Uint8Array> | undefined {
  return input && typeof input === "object" && typeof (input as { getReader?: unknown }).getReader === "function"
    ? (input as NodeReadableStream<Uint8Array>)
    : undefined;
}

function sanitizeInstallerFileName(input: string): string {
  const rawName = input.includes("://")
    ? basename(new URL(input).pathname)
    : basename(input);
  const safeName = decodeURIComponent(rawName)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .trim();
  return safeName || "Voice Assistant Update.exe";
}

export async function inspectWindowsExecutableMetadata(
  filePath: string,
  runPowerShell: (script: string) => Promise<string> = runPowerShellJson
): Promise<WindowsExecutableMetadata | undefined> {
  if (process.platform !== "win32" && runPowerShell === runPowerShellJson) {
    return undefined;
  }
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$info = (Get-Item -LiteralPath ${quotePowerShellString(filePath)}).VersionInfo`,
    "$result = [ordered]@{}",
    "$result.ProductName = [string]$info.ProductName",
    "$result.FileDescription = [string]$info.FileDescription",
    "$result.CompanyName = [string]$info.CompanyName",
    "$result.OriginalFilename = [string]$info.OriginalFilename",
    "$result.InternalName = [string]$info.InternalName",
    "$result | ConvertTo-Json -Compress"
  ].join("; ");
  const raw = await runPowerShell(script);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    productName: readMetadataString(parsed.ProductName),
    fileDescription: readMetadataString(parsed.FileDescription),
    companyName: readMetadataString(parsed.CompanyName),
    originalFilename: readMetadataString(parsed.OriginalFilename),
    internalName: readMetadataString(parsed.InternalName)
  };
}

async function runPowerShellJson(script: string): Promise<string> {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    script
  ]);
  return stdout;
}

function quotePowerShellString(input: string): string {
  return `'${input.replace(/'/g, "''")}'`;
}

function readMetadataString(input: unknown): string {
  return typeof input === "string" ? input : "";
}

function isTrustedVoiceAssistantExecutableMetadata(
  metadata: WindowsExecutableMetadata
): boolean {
  return getExecutableMetadataIdentityValues(metadata).some((value) =>
    value.toLowerCase().includes("voice assistant")
  );
}

function hasExecutableMetadataIdentity(metadata: WindowsExecutableMetadata): boolean {
  return getExecutableMetadataIdentityValues(metadata).length > 0;
}

function getExecutableMetadataIdentityValues(
  metadata: WindowsExecutableMetadata
): string[] {
  return [
    metadata.productName,
    metadata.fileDescription,
    metadata.originalFilename,
    metadata.internalName
  ].map((value) => value.trim()).filter(Boolean);
}

export function createBackendInstallerLauncher(
  spawnProcess: typeof spawn = spawn
): BackendInstallerLauncher {
  return (input): void => {
    const args = ["--silent-update", "--updated", "/S", "--force-run", "/currentuser"];
    const installDir = input.installDir?.trim();
    if (installDir) {
      args.push(`/D=${installDir}`);
    }
    const child = spawnProcess(input.installerPath, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  };
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
  setOptionalPayloadField(payload, "packageSha256", result.packageSha256);
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
