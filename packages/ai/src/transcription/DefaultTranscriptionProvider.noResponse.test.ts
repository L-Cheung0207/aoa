import { describe, expect, it, vi } from "vitest";
import type { AudioFrame } from "@voice/shared";
import {
  createDefaultTranscriptionProvider,
  type TranscriptionSocket
} from "./DefaultTranscriptionProvider";
import type { TranscriptionEvent } from "./transcriptionTypes";

interface FakeSocket extends TranscriptionSocket {
  sent: string[];
  closed: boolean;
  openHandler?: () => void;
  messageHandler?: (message: string) => void;
  closeHandler?: (event: { code?: number; reason?: string; wasClean?: boolean }) => void;
}

function createFakeSocket(): FakeSocket {
  const socket: FakeSocket = {
    sent: [],
    closed: false,
    send: (message) => {
      socket.sent.push(message);
    },
    close: () => {
      socket.closed = true;
      socket.closeHandler?.();
    },
    onOpen: (handler) => {
      socket.openHandler = handler;
    },
    onMessage: (handler) => {
      socket.messageHandler = handler;
    },
    onError: () => undefined,
    onClose: (handler) => {
      socket.closeHandler = handler;
    },
    emitOpen: () => socket.openHandler?.(),
    emitMessage: (message) => socket.messageHandler?.(message),
    emitClose: () => socket.closeHandler?.({})
  };
  return socket;
}

function createFrame(): AudioFrame {
  return {
    pcm: new Int16Array([1, -1, 2, -2]),
    sampleRate: 16000,
    timestampMs: 0,
    rms: 0.05
  };
}

describe("default transcription provider no-response handling", () => {
  it("uses the normal final timeout by default when audio was sent but no server message arrives", async () => {
    vi.useFakeTimers();
    try {
      const socket = createFakeSocket();
      const provider = createDefaultTranscriptionProvider({
        socketFactory: { connect: () => socket },
        generateVoiceId: () => "v-default-no-response",
        finalTimeoutMs: 60_000
      });
      const events: TranscriptionEvent[] = [];
      provider.subscribe((event) => events.push(event));

      const startPromise = provider.start({
        installationId: "inst",
        language: "auto",
        sampleRate: 16000
      });
      socket.emitOpen?.();
      await startPromise;

      provider.sendAudio(createFrame());

      let settled = false;
      const stopPromise = provider.stop().then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(59_999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await stopPromise;

      expect(events).toContainEqual({ type: "final", text: "" });
      expect(events.at(-1)?.type).toBe("stopped");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a short timeout when no server message arrives", async () => {
    vi.useFakeTimers();
    try {
      const socket = createFakeSocket();
      const provider = createDefaultTranscriptionProvider({
        socketFactory: { connect: () => socket },
        generateVoiceId: () => "v-no-response",
        finalTimeoutMs: 60_000,
        noResponseFinalTimeoutMs: 1_000
      });
      const events: TranscriptionEvent[] = [];
      provider.subscribe((event) => events.push(event));

      const startPromise = provider.start({
        installationId: "inst",
        language: "auto",
        sampleRate: 16000
      });
      socket.emitOpen?.();
      await startPromise;

      provider.sendAudio(createFrame());

      let settled = false;
      const stopPromise = provider.stop().then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await stopPromise;

      expect(events).toContainEqual({ type: "final", text: "" });
      expect(events.at(-1)?.type).toBe("stopped");
    } finally {
      vi.useRealTimers();
    }
  });

  it("resolves stop if the socket closes before a final arrives", async () => {
    vi.useFakeTimers();
    try {
      const socket = createFakeSocket();
      const provider = createDefaultTranscriptionProvider({
        socketFactory: { connect: () => socket },
        generateVoiceId: () => "v-close-before-final",
        finalTimeoutMs: 60_000
      });
      const events: TranscriptionEvent[] = [];
      provider.subscribe((event) => events.push(event));

      const startPromise = provider.start({
        installationId: "inst",
        language: "auto",
        sampleRate: 16000
      });
      socket.emitOpen?.();
      await startPromise;

      provider.sendAudio(createFrame());

      const stopPromise = provider.stop();
      socket.emitClose?.();
      await stopPromise;

      expect(events).toContainEqual({ type: "final", text: "" });
      expect(events.at(-1)?.type).toBe("stopped");
    } finally {
      await vi.runOnlyPendingTimersAsync();
      vi.useRealTimers();
    }
  });
});
