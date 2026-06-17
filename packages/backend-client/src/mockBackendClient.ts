import type {
  BackendClient,
  ClientBootstrapRequest,
  ClientBootstrapSnapshot,
  ServiceStatusSnapshot,
  TranscriptionSession,
  TranscriptionSessionRequest,
  PostprocessRequest,
  PostprocessResult,
} from "./types";

const featureFlags = {
  realtimeTranscription: true,
  history: true,
};

const anonymousQuota = {
  transcriptionSecondsRemaining: 600,
};

export function createMockBackendClient(): BackendClient {
  return {
    async bootstrap(
      _request: ClientBootstrapRequest,
    ): Promise<ClientBootstrapSnapshot> {
      return {
        clientId: "mock-anonymous-client",
        serviceStatus: "ok",
        featureFlags,
        anonymousQuota,
      };
    },

    async getServiceStatus(
      _installationId: string,
    ): Promise<ServiceStatusSnapshot> {
      return {
        serviceStatus: "ok",
        message: "",
        featureFlags,
        anonymousQuota,
      };
    },

    async createTranscriptionSession(
      _request: TranscriptionSessionRequest,
    ): Promise<TranscriptionSession> {
      return {
        sessionId: "mock-transcription-session",
        transport: "websocket",
        url: "ws://127.0.0.1:8787/mock/realtime",
        token: "mock-short-lived-token",
        expiresInSeconds: 120,
        provider: "mock",
      };
    },

    async postprocess(request: PostprocessRequest): Promise<PostprocessResult> {
      return {
        action: request.selectedText ? "replace_selection" : "insert",
        finalText:
          request.mode === "translate"
            ? "Meeting tomorrow at 3 PM."
            : "明天下午三点开会。",
        confidence: 0.92,
        usedDictionaryTermIds: request.dictionaryTerms.map((term) => term.id),
        warnings: [],
      };
    },
  };
}
