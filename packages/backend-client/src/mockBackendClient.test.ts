import { describe, expect, it } from "vitest";
import { createMockBackendClient } from "./mockBackendClient";

describe("mock backend client", () => {
  it("bootstraps an anonymous Windows client", async () => {
    const client = createMockBackendClient();

    const snapshot = await client.bootstrap({
      installationId: "inst_test",
      deviceName: "Test PC",
      platform: "windows",
      appVersion: "0.1.0"
    });

    expect(snapshot.clientId).toBe("mock-anonymous-client");
    expect(snapshot.serviceStatus).toBe("ok");
    expect(snapshot.featureFlags.realtimeTranscription).toBe(true);
  });

  it("creates a short-lived transcription session", async () => {
    const client = createMockBackendClient();

    const session = await client.createTranscriptionSession({
      installationId: "inst_test",
      mode: "realtime",
      language: "auto",
      audioFormat: "pcm16",
      sampleRate: 16000
    });

    expect(session.transport).toBe("websocket");
    expect(session.token).toBe("mock-short-lived-token");
    expect(session.expiresInSeconds).toBe(120);
  });
});
