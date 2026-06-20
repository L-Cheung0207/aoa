import { requestBackendJson, type BackendJsonError } from "@voice/shared";
import type {
  AnonymousQuota,
  BackendClient,
  ClientBootstrapSnapshot,
  FeatureFlags,
  PostprocessRequest,
  PostprocessResult,
  ServiceStatusSnapshot,
  TranscriptionSession,
  TranscriptionSessionRequest,
} from "./types";

export interface CreateHttpBackendClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  getAccessToken(): Promise<string>;
}

type HttpMethod = "POST";

export class BackendHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BackendHttpError";
    this.status = status;
  }
}

export function createHttpBackendClient(
  options: CreateHttpBackendClientOptions,
): BackendClient {
  const baseUrl = normalizeBackendBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    bootstrap(request): Promise<ClientBootstrapSnapshot> {
      return requestJson(fetchImpl, baseUrl, options.getAccessToken, {
        endpoint: "client/bootstrap",
        method: "POST",
        body: request,
        normalize: normalizeClientBootstrapSnapshot,
      });
    },

    getServiceStatus(installationId): Promise<ServiceStatusSnapshot> {
      return requestJson(fetchImpl, baseUrl, options.getAccessToken, {
        endpoint: "client/service-status",
        method: "POST",
        body: { installationId },
        normalize: normalizeServiceStatusSnapshot,
      });
    },

    createTranscriptionSession(
      request: TranscriptionSessionRequest,
    ): Promise<TranscriptionSession> {
      return requestJson(fetchImpl, baseUrl, options.getAccessToken, {
        endpoint: "transcription/session",
        method: "POST",
        body: request,
        normalize: normalizeTranscriptionSession,
      });
    },

    postprocess(request: PostprocessRequest): Promise<PostprocessResult> {
      return requestJson(fetchImpl, baseUrl, options.getAccessToken, {
        endpoint: "postprocess",
        method: "POST",
        body: request,
        normalize: normalizePostprocessResult,
      });
    },
  };
}

function normalizeBackendBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (pathSegments[pathSegments.length - 1] !== "aoa_api") {
    pathSegments.push("aoa_api");
  }
  url.pathname = `/${pathSegments.join("/")}`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function buildBackendUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}/${endpoint.replace(/^\/+/, "")}`;
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  getAccessToken: () => Promise<string>,
  options: {
    endpoint: string;
    method: HttpMethod;
    body: unknown;
    normalize(input: unknown): T;
  },
): Promise<T> {
  const accessToken = await getAccessToken();
  return requestBackendJson(fetchImpl, buildBackendUrl(baseUrl, options.endpoint), {
    method: options.method,
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    body: options.body,
    normalize: options.normalize,
    mapHttpError: createHttpError,
    mapTransportError: mapBackendTransportError,
  });
}

function createHttpError(status: number, body: unknown): BackendHttpError {
  if (!isRecord(body)) {
    return new BackendHttpError(status, "Backend request failed");
  }
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : "Backend request failed";
  return new BackendHttpError(status, message);
}

function mapBackendTransportError(error: BackendJsonError): BackendHttpError {
  return new BackendHttpError(error.status, error.message);
}

function normalizeClientBootstrapSnapshot(
  input: unknown,
): ClientBootstrapSnapshot {
  const payload = readRecord(input);
  return {
    clientId: readRequiredString(payload.clientId),
    serviceStatus: readServiceStatus(payload.serviceStatus),
    featureFlags: readFeatureFlags(payload.featureFlags),
    anonymousQuota: readAnonymousQuota(payload.anonymousQuota),
  };
}

function normalizeServiceStatusSnapshot(input: unknown): ServiceStatusSnapshot {
  const payload = readRecord(input);
  return {
    serviceStatus: readServiceStatus(payload.serviceStatus),
    message: readRequiredString(payload.message),
    anonymousQuota: readAnonymousQuota(payload.anonymousQuota),
    featureFlags: readFeatureFlags(payload.featureFlags),
  };
}

function normalizeTranscriptionSession(input: unknown): TranscriptionSession {
  const payload = readRecord(input);
  return {
    sessionId: readRequiredString(payload.sessionId),
    transport: readTranscriptionTransport(payload.transport),
    url: readRequiredString(payload.url),
    token: readRequiredString(payload.token),
    expiresInSeconds: readRequiredNumber(payload.expiresInSeconds),
    provider: readTranscriptionProvider(payload.provider),
  };
}

function normalizePostprocessResult(input: unknown): PostprocessResult {
  const payload = readRecord(input);
  return {
    action: readPostprocessAction(payload.action),
    finalText: readRequiredString(payload.finalText),
    confidence: readRequiredNumber(payload.confidence),
    usedDictionaryTermIds: readStringArray(payload.usedDictionaryTermIds),
    warnings: readStringArray(payload.warnings),
  };
}

function readFeatureFlags(input: unknown): FeatureFlags {
  const payload = readRecord(input);
  return {
    realtimeTranscription: readRequiredBoolean(payload.realtimeTranscription),
    history: readRequiredBoolean(payload.history),
  };
}

function readAnonymousQuota(input: unknown): AnonymousQuota {
  const payload = readRecord(input);
  return {
    transcriptionSecondsRemaining: readRequiredNumber(
      payload.transcriptionSecondsRemaining,
    ),
  };
}

function readRecord(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) {
    throw new BackendHttpError(200, "Backend returned invalid payload");
  }
  return input;
}

function readRequiredString(input: unknown): string {
  if (typeof input !== "string") {
    throw new BackendHttpError(200, "Backend returned invalid payload");
  }
  return input;
}

function readRequiredNumber(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new BackendHttpError(200, "Backend returned invalid payload");
  }
  return input;
}

function readRequiredBoolean(input: unknown): boolean {
  if (typeof input !== "boolean") {
    throw new BackendHttpError(200, "Backend returned invalid payload");
  }
  return input;
}

function readStringArray(input: unknown): string[] {
  if (!Array.isArray(input) || input.some((item) => typeof item !== "string")) {
    throw new BackendHttpError(200, "Backend returned invalid payload");
  }
  return input;
}

function readServiceStatus(
  input: unknown,
): ClientBootstrapSnapshot["serviceStatus"] {
  if (input === "ok" || input === "degraded" || input === "unavailable") {
    return input;
  }
  throw new BackendHttpError(200, "Backend returned invalid payload");
}

function readTranscriptionTransport(
  input: unknown,
): TranscriptionSession["transport"] {
  if (input === "websocket") {
    return input;
  }
  throw new BackendHttpError(200, "Backend returned invalid payload");
}

function readTranscriptionProvider(
  input: unknown,
): TranscriptionSession["provider"] {
  if (input === "openai-realtime-transcription" || input === "mock") {
    return input;
  }
  throw new BackendHttpError(200, "Backend returned invalid payload");
}

function readPostprocessAction(input: unknown): PostprocessResult["action"] {
  if (
    input === "insert" ||
    input === "replace_selection" ||
    input === "show_result"
  ) {
    return input;
  }
  throw new BackendHttpError(200, "Backend returned invalid payload");
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
