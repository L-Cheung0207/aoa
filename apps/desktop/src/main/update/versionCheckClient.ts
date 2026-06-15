export type VersionPlatform = "WINDOWS" | "MAC" | "LINUX";
export type VersionPhase = "ALPHA" | "BETA" | "RELEASE";
export type VersionUpdateType = "FORCED" | "RECOMMENDED" | "OPTIONAL";

export interface VersionCheckRequest {
  platform: VersionPlatform;
  currentVersion: string;
}

export type VersionCheckResult =
  | { disabled: true }
  | { hasUpdate: false }
  | {
      hasUpdate: true;
      versionCode: string;
      phase: VersionPhase;
      updateType: VersionUpdateType;
      updateLog: string;
      downloadUrl: string;
      packageSize?: number | undefined;
      packageName?: string | undefined;
    };

export interface VersionCheckClient {
  check(request: VersionCheckRequest): Promise<VersionCheckResult>;
}

export interface HttpVersionCheckClientOptions {
  endpoint?: string | undefined;
  fetch?: FetchLike | undefined;
  logger?: VersionCheckLogger | undefined;
  phase?: VersionPhase | undefined;
}

export interface VersionCheckLogger {
  log(message: string): void;
  warn(message: string): void;
}

type FetchLike = (
  input: string,
  init: { method: "GET" }
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}>;

interface BackendEnvelope {
  data?: unknown;
}

export function createHttpVersionCheckClient(
  options: HttpVersionCheckClientOptions
): VersionCheckClient {
  const endpoint = options.endpoint?.trim();
  const fetchImpl = options.fetch ?? fetch;
  const logger = options.logger ?? console;
  const phase = options.phase ?? "ALPHA";

  return {
    async check(request): Promise<VersionCheckResult> {
      if (!endpoint) {
        logger.log("[update] version check disabled: endpoint missing");
        return { disabled: true };
      }
      const url = new URL(endpoint);
      url.searchParams.set("platform", request.platform);
      url.searchParams.set("currentVersion", request.currentVersion);
      url.searchParams.set("phase", phase);
      logger.log(`[update] version check request url=${url.toString()}`);
      const response = await fetchImpl(url.toString(), { method: "GET" });
      if (!response.ok) {
        logger.warn(`[update] version check failed status=${response.status}`);
        throw new Error(`VERSION_CHECK_HTTP_${response.status}`);
      }
      const result = normalizeVersionCheckResponse(await response.json());
      if ("disabled" in result) {
        logger.log("[update] version check response disabled");
      } else if (!result.hasUpdate) {
        logger.log("[update] version check response hasUpdate=false");
      } else {
        logger.log(
          `[update] version check response hasUpdate=true version=${result.versionCode} type=${result.updateType}`
        );
      }
      return result;
    }
  };
}

export function normalizeVersionCheckResponse(input: unknown): VersionCheckResult {
  const data = unwrapData(input);
  if (!isRecord(data)) {
    throw new Error("VERSION_CHECK_INVALID_PAYLOAD");
  }
  if (data.hasUpdate === false) {
    return { hasUpdate: false };
  }
  if (data.hasUpdate !== true) {
    throw new Error("VERSION_CHECK_INVALID_PAYLOAD");
  }

  const versionCode = readRequiredString(data.versionCode);
  const phase = readPhase(data.phase);
  const updateType = readUpdateType(data.updateType);
  const downloadUrl = readRequiredString(data.downloadUrl);
  if (!versionCode || !downloadUrl) {
    throw new Error("VERSION_CHECK_INVALID_PAYLOAD");
  }

  return {
    hasUpdate: true,
    versionCode,
    phase,
    updateType,
    updateLog: readOptionalString(data.updateLog) ?? "",
    downloadUrl,
    packageSize: readOptionalNumber(data.packageSize),
    packageName: readOptionalString(data.packageName)
  };
}

function unwrapData(input: unknown): unknown {
  if (isRecord(input) && "data" in input) {
    return (input as BackendEnvelope).data;
  }
  return input;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function readRequiredString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function readOptionalString(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const normalized = input.trim();
  return normalized ? normalized : undefined;
}

function readOptionalNumber(input: unknown): number | undefined {
  return typeof input === "number" && Number.isFinite(input) ? input : undefined;
}

function readPhase(input: unknown): VersionPhase {
  if (
    input === "ALPHA" ||
    input === "BETA" ||
    input === "RELEASE"
  ) {
    return input;
  }
  throw new Error("VERSION_CHECK_INVALID_PAYLOAD");
}

function readUpdateType(input: unknown): VersionUpdateType {
  if (
    input === "FORCED" ||
    input === "RECOMMENDED" ||
    input === "OPTIONAL"
  ) {
    return input;
  }
  throw new Error("VERSION_CHECK_INVALID_PAYLOAD");
}
