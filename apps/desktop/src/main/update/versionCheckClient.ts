export type VersionPlatform = "WINDOWS" | "MAC" | "LINUX";
export type VersionPhase = "ALPHA" | "BETA" | "PREVIEW" | "RELEASE";
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

  return {
    async check(request): Promise<VersionCheckResult> {
      if (!endpoint) {
        return { disabled: true };
      }
      const url = new URL(endpoint);
      url.searchParams.set("platform", request.platform);
      url.searchParams.set("currentVersion", request.currentVersion);
      const response = await fetchImpl(url.toString(), { method: "GET" });
      if (!response.ok) {
        throw new Error(`VERSION_CHECK_HTTP_${response.status}`);
      }
      return normalizeVersionCheckResponse(await response.json());
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
    input === "PREVIEW" ||
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
