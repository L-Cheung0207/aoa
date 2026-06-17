import { describe, expect, it, vi } from "vitest";
import type {
  TranscriptionEvent,
  TranscriptionSocketFactory,
  TranscriptionProvider,
  TranscriptionStartInput
} from "@voice/ai";
import type { AppSettings, AudioFrame, WsServerConfig } from "@voice/shared";
import {
  createMainTranscriptionService,
  createNodeTranscriptionSocketFactory
} from "./mainTranscriptionService";

function createSettings(): Pick<AppSettings, "ws"> {
  return {
    ws: {
      servers: [
        { url: "wss://direct.example.test/ws" },
        {
          url: "wss://proxied.example.test/ws?AccessCode=secret&token=other-secret",
          proxy: "proxy.example.test:8080",
          proxyUsername: "user",
          proxyPassword: "pass"
        }
      ],
      selectedIndex: 1
    }
  };
}

function createFrame(): AudioFrame {
  return {
    pcm: new Int16Array([1, -2, 3]),
    sampleRate: 16000,
    timestampMs: 12,
    rms: 0.25
  };
}

describe("main transcription service", () => {
  it("creates the provider from the selected WS config including proxy settings", async () => {
    const selectedServers: WsServerConfig[] = [];
    const starts: TranscriptionStartInput[] = [];
    const frames: AudioFrame[] = [];
    const stops = vi.fn(async () => undefined);
    const provider: TranscriptionProvider = {
      subscribe: () => () => undefined,
      start: async (input) => {
        starts.push(input);
      },
      sendAudio: (frame) => {
        frames.push(frame);
      },
      stop: stops,
      cancel: vi.fn(async () => undefined)
    };
    const service = createMainTranscriptionService({
      getSettings: createSettings,
      createProvider: (server) => {
        selectedServers.push(server);
        return provider;
      }
    });

    await service.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    service.sendAudio(createFrame());
    const stopResult = await service.stop();

    expect(selectedServers).toEqual([createSettings().ws.servers[1]]);
    expect(starts).toEqual([
      { installationId: "install-1", language: "cantonese", sampleRate: 16000 }
    ]);
    expect(frames).toHaveLength(1);
    expect(Array.from(frames[0]?.pcm ?? [])).toEqual([1, -2, 3]);
    expect(stops).toHaveBeenCalledTimes(1);
    expect(stopResult).toEqual({});
  });

  it("logs sanitized ASR request parameters when starting a session", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const provider: TranscriptionProvider = {
      subscribe: () => () => undefined,
      start: async () => undefined,
      sendAudio: () => undefined,
      stop: async () => undefined,
      cancel: async () => undefined
    };
    const service = createMainTranscriptionService({
      getSettings: createSettings,
      createProvider: () => provider
    });

    try {
      await service.start({
        installationId: "install-secret",
        language: "cantonese",
        sampleRate: 16000
      });

      const logs = logSpy.mock.calls.map((args) => args.map(String).join(" ")).join("\n");
      expect(logs).toContain("[asr-main] request params");
      expect(logs).toContain(
        "url=wss://proxied.example.test/ws?AccessCode=***&token=***"
      );
      expect(logs).toContain("language=cantonese");
      expect(logs).toContain("sampleRate=16000");
      expect(logs).toContain("selectedIndex=1");
      expect(logs).toContain("proxy=http://proxy.example.test:8080 auth=yes");
      expect(logs).not.toContain("secret");
      expect(logs).not.toContain("pass");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("logs raw ASR request URL in development mode without proxy password", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const provider: TranscriptionProvider = {
      subscribe: () => () => undefined,
      start: async () => undefined,
      sendAudio: () => undefined,
      stop: async () => undefined,
      cancel: async () => undefined
    };
    const service = createMainTranscriptionService({
      getSettings: createSettings,
      createProvider: () => provider,
      revealSensitiveLogs: true
    });

    try {
      await service.start({
        installationId: "install-secret",
        language: "cantonese",
        sampleRate: 16000
      });

      const logs = logSpy.mock.calls.map((args) => args.map(String).join(" ")).join("\n");
      expect(logs).toContain(
        "url=wss://proxied.example.test/ws?AccessCode=secret&token=other-secret"
      );
      expect(logs).toContain("proxy=http://proxy.example.test:8080 auth=yes");
      expect(logs).not.toContain("pass");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("returns the last final text via stop() so renderer can compensate IPC races", async () => {
    let emitEvent: ((event: { type: "final"; text: string }) => void) | undefined;
    const provider: TranscriptionProvider = {
      subscribe: (listener) => {
        emitEvent = listener;
        return () => undefined;
      },
      start: async () => undefined,
      sendAudio: () => undefined,
      stop: async () => undefined,
      cancel: async () => undefined
    };
    const service = createMainTranscriptionService({
      getSettings: createSettings,
      createProvider: () => provider
    });

    await service.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    emitEvent?.({ type: "final", text: "你好" });
    const stopResult = await service.stop();

    expect(stopResult).toEqual({ finalText: "你好" });
  });

  it("cancels and releases the active provider when it reports an error", async () => {
    let emitEvent: ((event: TranscriptionEvent) => void) | undefined;
    const cancels = vi.fn(async () => undefined);
    const provider: TranscriptionProvider = {
      subscribe: (listener) => {
        emitEvent = listener;
        return () => undefined;
      },
      start: async () => undefined,
      sendAudio: () => undefined,
      stop: async () => undefined,
      cancel: cancels
    };
    const service = createMainTranscriptionService({
      getSettings: createSettings,
      createProvider: () => provider
    });

    await service.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    emitEvent?.({ type: "error", error: new Error("WS closed") });
    await Promise.resolve();

    await expect(
      service.start({
        installationId: "install-2",
        language: "cantonese",
        sampleRate: 16000
      })
    ).resolves.toBeUndefined();
    expect(cancels).toHaveBeenCalledTimes(1);
  });

  it("fails clearly when no WS server is configured", async () => {
    const service = createMainTranscriptionService({
      getSettings: () => ({ ws: { servers: [], selectedIndex: 0 } }),
      createProvider: () => {
        throw new Error("should not create provider");
      }
    });

    await expect(
      service.start({
        installationId: "install-1",
        language: "cantonese",
        sampleRate: 16000
      })
    ).rejects.toThrow("No WS server configured");
  });

  it("creates a node socket factory with a proxy agent when proxy is configured", () => {
    const factories: Array<{ url: string; hasAgent: boolean }> = [];
    const socketFactory = createNodeTranscriptionSocketFactory(
      {
        url: "wss://proxied.example.test/ws",
        proxy: "proxy.example.test:8080",
        proxyUsername: "user",
        proxyPassword: "pass"
      },
      {
        WebSocketConstructor: class FakeWebSocket {
          on(): void {}
          once(): void {}
          send(): void {}
          close(): void {}
          constructor(url: string, options: { agent?: unknown }) {
            factories.push({ url, hasAgent: options.agent !== undefined });
          }
        } as never
      }
    ) as TranscriptionSocketFactory;

    socketFactory.connect("wss://proxied.example.test/ws");

    expect(factories).toEqual([
      { url: "wss://proxied.example.test/ws", hasAgent: true }
    ]);
  });

  it("passes node WS close code and reason to the transcription socket", () => {
    let closeHandler: ((code: number, reason: Buffer) => void) | undefined;
    const socketFactory = createNodeTranscriptionSocketFactory(
      { url: "wss://direct.example.test/ws" },
      {
        WebSocketConstructor: class FakeWebSocket {
          on(): void {}
          once(event: string, handler: (code: number, reason: Buffer) => void): void {
            if (event === "close") {
              closeHandler = handler;
            }
          }
          send(): void {}
          close(): void {}
        } as never
      }
    ) as TranscriptionSocketFactory;

    const socket = socketFactory.connect("wss://direct.example.test/ws");
    const closeEvents: Array<{ code?: number; reason?: string }> = [];
    socket.onClose((event) => closeEvents.push(event));
    closeHandler?.(4001, Buffer.from("server detail", "utf8"));

    expect(closeEvents).toEqual([{ code: 4001, reason: "server detail" }]);
  });

  it("logs incoming ASR messages without leaking transcript text", () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message: unknown) => {
      logs.push(String(message));
    });
    let messageHandler: ((payload: string) => void) | undefined;
    const socketFactory = createNodeTranscriptionSocketFactory(
      { url: "wss://direct.example.test/ws" },
      {
        WebSocketConstructor: class FakeWebSocket {
          on(event: string, handler: (payload: string) => void): void {
            if (event === "message") {
              messageHandler = handler;
            }
          }
          once(): void {}
          send(): void {}
          close(): void {}
        } as never
      }
    ) as TranscriptionSocketFactory;

    const socket = socketFactory.connect("wss://direct.example.test/ws");
    socket.onMessage(() => undefined);
    messageHandler?.(
      JSON.stringify({
        type: "final",
        text: "sensitive recognized speech",
        rawText: "another private transcript"
      })
    );

    const joinedLogs = logs.join("\n");
    expect(joinedLogs).toContain("[asr-main] raw message len=");
    expect(joinedLogs).toContain("type=final");
    expect(joinedLogs).toContain("textLength=27");
    expect(joinedLogs).toContain("rawTextLength=26");
    expect(joinedLogs).not.toContain("sensitive recognized speech");
    expect(joinedLogs).not.toContain("another private transcript");
  });
});
