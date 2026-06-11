import type {
  BackendClient,
  ClientBootstrapRequest,
  ClientBootstrapSnapshot,
  ServiceStatusSnapshot,
  TranscriptionSession,
  TranscriptionSessionRequest,
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
  };
}
