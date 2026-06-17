import { afterEach, describe, expect, it, vi } from "vitest";
import type { TranscriptionStartInput } from "@voice/ai";
import type { AudioFrame } from "@voice/shared";
import { createJavaVoiceSessionProvider } from "./javaVoiceSessionProvider";

type FakeListener = (event: { data?: string }) => void;

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly sent: string[] = [];
  readyState = FakeWebSocket.CONNECTING;
  private readonly listeners = new Map<string, FakeListener[]>();

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: FakeListener,
    options?: { once?: boolean },
  ): void {
    const wrapped =
      options?.once === true
        ? (event: { data?: string }): void => {
            this.removeEventListener(type, wrapped);
            listener(event);
          }
        : listener;
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), wrapped]);
  }

  removeEventListener(type: string, listener: FakeListener): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((current) => current !== listener),
    );
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", {});
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatch("open", {});
  }

  message(payload: unknown): void {
    this.dispatch("message", { data: JSON.stringify(payload) });
  }

  private dispatch(type: string, event: { data?: string }): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const startInput: TranscriptionStartInput = {
  installationId: "install-1",
  language: "mandarin",
  sampleRate: 16000,
  mode: "direct",
};

const audioFrame: AudioFrame = {
  pcm: new Int16Array([1, 2, 3]),
  sampleRate: 16000,
  timestampMs: 10,
  rms: 0.1,
};

function sentTypes(socket: FakeWebSocket): string[] {
  return socket.sent.map((message) => JSON.parse(message).type as string);
}

describe("java voice session provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for session_started before resolving start and sending audio", async () => {
    FakeWebSocket.instances = [];
    const provider = createJavaVoiceSessionProvider({
      WebSocketConstructor: FakeWebSocket as unknown as typeof WebSocket,
      url: "ws://test",
    });
    let startResolved = false;

    const startPromise = provider.start(startInput).then(() => {
      startResolved = true;
    });
    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();

    socket?.open();
    await Promise.resolve();
    await Promise.resolve();

    expect(startResolved).toBe(false);
    expect(sentTypes(socket!)).toEqual(["session_start"]);

    provider.sendAudio(audioFrame);
    expect(sentTypes(socket!)).toEqual(["session_start"]);

    socket?.message({ type: "session_started", sessionId: "server-session" });
    await startPromise;

    expect(startResolved).toBe(true);
    provider.sendAudio(audioFrame);
    expect(sentTypes(socket!)).toEqual(["session_start", "audio_frame"]);
  });

  it("logs session_start metadata without leaking selected text or app context", async () => {
    FakeWebSocket.instances = [];
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message: unknown) => {
      logs.push(String(message));
    });
    const provider = createJavaVoiceSessionProvider({
      WebSocketConstructor: FakeWebSocket as unknown as typeof WebSocket,
      url: "ws://test",
    });

    const startPromise = provider.start({
      ...startInput,
      mode: "processSelection",
      selectedText: "do not log selected text",
      appContext: {
        platform: "windows",
        appName: "Private App",
        windowTitle: "Sensitive Window",
      },
      postprocessMode: "clean",
      targetLanguage: "en-US",
    });
    const socket = FakeWebSocket.instances[0];
    socket?.open();
    await Promise.resolve();
    await Promise.resolve();
    socket?.message({ type: "session_started", sessionId: "server-session" });
    await startPromise;

    const joinedLogs = logs.join("\n");
    expect(joinedLogs).toContain(
      "[java-voice] session_start summary sessionId="
    );
    expect(joinedLogs).toContain("selectedTextLength=24");
    expect(joinedLogs).toContain("hasAppContext=true");
    expect(joinedLogs).not.toContain("do not log selected text");
    expect(joinedLogs).not.toContain("Private App");
    expect(joinedLogs).not.toContain("Sensitive Window");
  });
});
