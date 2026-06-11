export type PlatformName = "windows";

export interface ClientBootstrapRequest {
  installationId: string;
  deviceName: string;
  platform: PlatformName;
  appVersion: string;
}

export interface FeatureFlags {
  realtimeTranscription: boolean;
  history: boolean;
}

export interface AnonymousQuota {
  transcriptionSecondsRemaining: number;
}

export interface ClientBootstrapSnapshot {
  clientId: string;
  serviceStatus: "ok" | "degraded" | "unavailable";
  featureFlags: FeatureFlags;
  anonymousQuota: AnonymousQuota;
}

export interface ServiceStatusSnapshot {
  serviceStatus: "ok" | "degraded" | "unavailable";
  message: string;
  anonymousQuota: AnonymousQuota;
  featureFlags: FeatureFlags;
}

export interface TranscriptionSessionRequest {
  installationId: string;
  mode: "realtime";
  language: "auto" | "zh-CN" | "en-US";
  audioFormat: "pcm16";
  sampleRate: 16000;
}

export interface TranscriptionSession {
  sessionId: string;
  transport: "websocket";
  url: string;
  token: string;
  expiresInSeconds: number;
  provider: "openai-realtime-transcription" | "mock";
}

export type PostprocessMode =
  | "direct"
  | "clean"
  | "formal"
  | "translate"
  | "summarize"
  | "list";

export type PostprocessStyle = "natural" | "formal" | "concise" | "friendly";

export interface DictionaryTermContext {
  id: string;
  source: string;
  replacement: string;
  description?: string;
}

export interface AppContext {
  platform: PlatformName;
  appName: string;
  windowTitle: string;
}

export interface PostprocessResult {
  action: "insert" | "replace_selection" | "show_result";
  finalText: string;
  confidence: number;
  usedDictionaryTermIds: string[];
  warnings: string[];
}

export interface BackendClient {
  bootstrap(request: ClientBootstrapRequest): Promise<ClientBootstrapSnapshot>;
  getServiceStatus(installationId: string): Promise<ServiceStatusSnapshot>;
  createTranscriptionSession(
    request: TranscriptionSessionRequest,
  ): Promise<TranscriptionSession>;
}

export interface BackendErrorPayload {
  code: string;
  message: string;
}

export interface ClientFacingError {
  code:
    | "client_blocked"
    | "quota_exceeded"
    | "rate_limited"
    | "ai_session_expired"
    | "backend_unavailable"
    | "network_error";
  title: string;
  message: string;
}
