import type {
  BackendClient,
  ClientBootstrapRequest,
  ClientBootstrapSnapshot,
  PostprocessRequest,
  PostprocessResult,
  ServiceStatusSnapshot,
  TranscriptionSession,
  TranscriptionSessionRequest
} from "./types";

const featureFlags = {
  realtimeTranscription: true,
  postprocess: true,
  history: true
};

const anonymousQuota = {
  transcriptionSecondsRemaining: 600,
  postprocessRequestsRemaining: 100
};

export function createMockBackendClient(): BackendClient {
  return {
    async bootstrap(_request: ClientBootstrapRequest): Promise<ClientBootstrapSnapshot> {
      return {
        clientId: "mock-anonymous-client",
        serviceStatus: "ok",
        featureFlags,
        anonymousQuota
      };
    },

    async getServiceStatus(_installationId: string): Promise<ServiceStatusSnapshot> {
      return {
        serviceStatus: "ok",
        message: "",
        featureFlags,
        anonymousQuota
      };
    },

    async createTranscriptionSession(
      _request: TranscriptionSessionRequest
    ): Promise<TranscriptionSession> {
      return {
        sessionId: "mock-transcription-session",
        transport: "websocket",
        url: "ws://127.0.0.1:8787/mock/realtime",
        token: "mock-short-lived-token",
        expiresInSeconds: 120,
        provider: "mock"
      };
    },

    async postprocess(request: PostprocessRequest): Promise<PostprocessResult> {
      if (request.mode === "translate") {
        return {
          action: "insert",
          finalText: "Meeting tomorrow at 3 PM.",
          confidence: 0.9,
          usedDictionaryTermIds: [],
          warnings: []
        };
      }

      return {
        action: request.selectedText ? "replace_selection" : "insert",
        finalText:
          request.rawText === "嗯我想说不是这个改成明天下午三点开会"
            ? "明天下午三点开会。"
            : request.rawText,
        confidence: 0.92,
        usedDictionaryTermIds: request.dictionaryTerms.map((term) => term.id),
        warnings: []
      };
    }
  };
}
