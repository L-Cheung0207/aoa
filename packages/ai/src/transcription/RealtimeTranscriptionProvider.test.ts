import { describe, expect, it } from "vitest";
import type { AudioFrame } from "@voice/shared";
import type { BackendClient, TranscriptionSessionRequest } from "@voice/backend-client";
import { createRealtimeTranscriptionProvider, type RealtimeSocket, type RealtimeSocketFactory } from "./RealtimeTranscriptionProvider";

function createAudioFrame(): AudioFrame {
  return {
    pcm: new Int16Array([1, -1]),
    sampleRate: 16000,
    timestampMs: 10,
    rms: 0.2
  };
}

describe("realtime transcription provider", () => {
  it("creates a short session and streams audio frames", async () => {
    const requestedSessions: TranscriptionSessionRequest[] = [];
    const sentMessages: string[] = [];
    const backendClient: Pick<BackendClient, "createTranscriptionSession"> = {
      createTranscriptionSession: async (request) => {
        requestedSessions.push(request);
        return {
          sessionId: "sess_1",
          transport: "websocket",
          url: "wss://example.test/realtime",
          token: "short_token",
          expiresInSeconds: 120,
          provider: "mock"
        };
      }
    };
    const socketFactory: RealtimeSocketFactory = {
      connect: async (_url, _token) => createSocket(sentMessages)
    };
    const provider = createRealtimeTranscriptionProvider({ backendClient, socketFactory });
    const events: string[] = [];
    provider.subscribe((event) => events.push(event.type));

    await provider.start({
      installationId: "inst_test",
      language: "auto",
      sampleRate: 16000
    });
    provider.sendAudio(createAudioFrame());
    await provider.stop();

    expect(requestedSessions).toEqual([
      {
        installationId: "inst_test",
        mode: "realtime",
        language: "auto",
        audioFormat: "pcm16",
        sampleRate: 16000
      }
    ]);
    expect(JSON.parse(sentMessages[0] ?? "{}")).toEqual({
      type: "audio",
      audio: "AQD//w==",
      sampleRate: 16000,
      timestampMs: 10
    });
    expect(JSON.parse(sentMessages[1] ?? "{}")).toEqual({ type: "stop" });
    expect(events).toEqual(["started", "stopped"]);
  });

  it("emits partial and final events from socket messages", async () => {
    let socket: RealtimeSocket | undefined;
    const backendClient: Pick<BackendClient, "createTranscriptionSession"> = {
      createTranscriptionSession: async () => ({
        sessionId: "sess_1",
        transport: "websocket",
        url: "wss://example.test/realtime",
        token: "short_token",
        expiresInSeconds: 120,
        provider: "mock"
      })
    };
    const socketFactory: RealtimeSocketFactory = {
      connect: async () => {
        socket = createSocket([]);
        return socket;
      }
    };
    const provider = createRealtimeTranscriptionProvider({ backendClient, socketFactory });
    const events: string[] = [];
    provider.subscribe((event) => {
      if (event.type === "partial" || event.type === "final") {
        events.push(`${event.type}:${event.text}`);
      }
    });

    await provider.start({
      installationId: "inst_test",
      language: "auto",
      sampleRate: 16000
    });
    socket?.emitMessage(JSON.stringify({ type: "partial", text: "明天" }));
    socket?.emitMessage(JSON.stringify({ type: "final", text: "明天下午三点开会。" }));

    expect(events).toEqual(["partial:明天", "final:明天下午三点开会。"]);
  });

  it("rejects audio before a session starts", () => {
    const provider = createRealtimeTranscriptionProvider({
      backendClient: {
        createTranscriptionSession: async () => {
          throw new Error("not used");
        }
      },
      socketFactory: {
        connect: async () => createSocket([])
      }
    });

    expect(() => provider.sendAudio(createAudioFrame())).toThrow("Transcription session is not active");
  });
});

function createSocket(sentMessages: string[]): RealtimeSocket {
  let messageHandler: ((message: string) => void) | undefined;
  let errorHandler: ((error: Error) => void) | undefined;

  return {
    send: (message) => {
      sentMessages.push(message);
    },
    close: async () => undefined,
    onMessage: (handler) => {
      messageHandler = handler;
    },
    onError: (handler) => {
      errorHandler = handler;
    },
    emitMessage: (message) => messageHandler?.(message),
    emitError: (error) => errorHandler?.(error)
  };
}
