import { describe, expect, it, vi } from "vitest";
import { createHttpBackendClient } from "./httpBackendClient";
import type { BackendClient, PostprocessRequest } from "./types";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bootstrapRequest = {
  installationId: "install-1",
  deviceName: "ALEX-PC",
  platform: "windows" as const,
  appVersion: "0.1.0",
};

const postprocessRequest: PostprocessRequest = {
  installationId: "install-1",
  rawText: "raw",
  selectedText: "selected",
  appContext: {
    platform: "windows",
    appName: "notepad.exe",
    windowTitle: "notes.txt",
  },
  mode: "clean",
  language: "zh-CN",
  style: "natural",
  dictionaryTerms: [
    {
      id: "term-1",
      source: "AOA",
      replacement: "AOA",
    },
  ],
};

describe("http backend client", () => {
  it("posts bootstrap requests with bearer auth and projects the response", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        clientId: "client-1",
        serviceStatus: "ok",
        featureFlags: { realtimeTranscription: true, history: false },
        anonymousQuota: { transcriptionSecondsRemaining: 300 },
        rawTraceId: "drop-me",
      }),
    );
    const client = createClient(fetchImpl);

    await expect(client.bootstrap(bootstrapRequest)).resolves.toEqual({
      clientId: "client-1",
      serviceStatus: "ok",
      featureFlags: { realtimeTranscription: true, history: false },
      anonymousQuota: { transcriptionSecondsRemaining: 300 },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/client/bootstrap",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          accept: "application/json",
          authorization: "Bearer access-1",
          "content-type": "application/json",
        }),
        body: JSON.stringify(bootstrapRequest),
      }),
    );
  });

  it("unwraps backend data envelopes before projecting responses", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        code: "10000000",
        message: "success",
        data: {
          clientId: "client-1",
          serviceStatus: "ok",
          featureFlags: { realtimeTranscription: true, history: false },
          anonymousQuota: { transcriptionSecondsRemaining: 300 },
        },
      }),
    );
    const client = createClient(fetchImpl);

    await expect(client.bootstrap(bootstrapRequest)).resolves.toEqual({
      clientId: "client-1",
      serviceStatus: "ok",
      featureFlags: { realtimeTranscription: true, history: false },
      anonymousQuota: { transcriptionSecondsRemaining: 300 },
    });
  });

  it("normalizes base URLs that already include /aoa_api", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        serviceStatus: "ok",
        message: "",
        anonymousQuota: { transcriptionSecondsRemaining: 300 },
        featureFlags: { realtimeTranscription: true, history: true },
      }),
    );
    const client = createHttpBackendClient({
      baseUrl: "https://api.example.com/aoa_api/",
      fetch: fetchImpl,
      getAccessToken: async () => "access-1",
    });

    await client.getServiceStatus("install-1");

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/aoa_api/client/service-status",
    );
  });

  it("posts service status with installation id", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        serviceStatus: "degraded",
        message: "maintenance",
        anonymousQuota: { transcriptionSecondsRemaining: 120 },
        featureFlags: { realtimeTranscription: false, history: true },
      }),
    );
    const client = createClient(fetchImpl);

    await expect(client.getServiceStatus("install-1")).resolves.toEqual({
      serviceStatus: "degraded",
      message: "maintenance",
      anonymousQuota: { transcriptionSecondsRemaining: 120 },
      featureFlags: { realtimeTranscription: false, history: true },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/client/service-status",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ installationId: "install-1" }),
      }),
    );
  });

  it("creates transcription sessions through the real transcription endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        sessionId: "session-1",
        transport: "websocket",
        url: "wss://api.example.com/realtime",
        token: "short-lived",
        expiresInSeconds: 120,
        provider: "openai-realtime-transcription",
        rawTraceId: "drop-me",
      }),
    );
    const client = createClient(fetchImpl);
    const request = {
      installationId: "install-1",
      mode: "realtime" as const,
      language: "auto" as const,
      audioFormat: "pcm16" as const,
      sampleRate: 16000,
    };

    await expect(client.createTranscriptionSession(request)).resolves.toEqual({
      sessionId: "session-1",
      transport: "websocket",
      url: "wss://api.example.com/realtime",
      token: "short-lived",
      expiresInSeconds: 120,
      provider: "openai-realtime-transcription",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/transcription/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
  });

  it("posts postprocess requests and projects the result", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        action: "replace_selection",
        finalText: "final",
        confidence: 0.91,
        usedDictionaryTermIds: ["term-1"],
        warnings: ["low_confidence"],
        rawTraceId: "drop-me",
      }),
    );
    const client = createClient(fetchImpl);

    await expect(client.postprocess(postprocessRequest)).resolves.toEqual({
      action: "replace_selection",
      finalText: "final",
      confidence: 0.91,
      usedDictionaryTermIds: ["term-1"],
      warnings: ["low_confidence"],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/postprocess",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(postprocessRequest),
      }),
    );
  });

  it("gets a fresh access token for every request", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          serviceStatus: "ok",
          message: "",
          anonymousQuota: { transcriptionSecondsRemaining: 300 },
          featureFlags: { realtimeTranscription: true, history: true },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          serviceStatus: "ok",
          message: "",
          anonymousQuota: { transcriptionSecondsRemaining: 300 },
          featureFlags: { realtimeTranscription: true, history: true },
        }),
      );
    const getAccessToken = vi
      .fn()
      .mockResolvedValueOnce("access-1")
      .mockResolvedValueOnce("access-2");
    const client = createHttpBackendClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl,
      getAccessToken,
    });

    await client.getServiceStatus("install-1");
    await client.getServiceStatus("install-1");

    expect(getAccessToken).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer access-1" }),
      }),
    );
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer access-2" }),
      }),
    );
  });

  it("maps HTTP, network, and invalid JSON failures to meaningful errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({ code: "BACKEND_DOWN", message: "down" }, 503),
      )
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    const client = createClient(fetchImpl);

    await expect(client.getServiceStatus("install-1")).rejects.toMatchObject({
      name: "BackendHttpError",
      status: 503,
      message: "down",
    });
    await expect(client.getServiceStatus("install-1")).rejects.toMatchObject({
      name: "BackendHttpError",
      status: 0,
      message: "Network request failed",
    });
    await expect(client.getServiceStatus("install-1")).rejects.toMatchObject({
      name: "BackendHttpError",
      status: 200,
      message: "Backend returned invalid JSON",
    });
  });
});

function createClient(fetchImpl: typeof fetch): BackendClient {
  return createHttpBackendClient({
    baseUrl: "https://api.example.com",
    fetch: fetchImpl,
    getAccessToken: async () => "access-1",
  });
}
