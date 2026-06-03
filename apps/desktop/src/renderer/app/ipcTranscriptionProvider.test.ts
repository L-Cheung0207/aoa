import { describe, expect, it, vi } from "vitest";
import type { AudioFrame } from "@voice/shared";
import { createIpcTranscriptionProvider } from "./ipcTranscriptionProvider";

function createFrame(): AudioFrame {
  return {
    pcm: new Int16Array([10, 20]),
    sampleRate: 16000,
    timestampMs: 42,
    rms: 0.5
  };
}

describe("IPC transcription provider", () => {
  it("forwards provider commands to the preload transcription transport", async () => {
    const calls: unknown[] = [];
    const provider = createIpcTranscriptionProvider({
      startTranscription: async (input) => {
        calls.push(["start", input]);
      },
      sendTranscriptionAudio: async (frame) => {
        calls.push(["audio", Array.from(frame.pcm), frame.timestampMs]);
      },
      stopTranscription: async () => {
        calls.push(["stop"]);
        return {};
      },
      cancelTranscription: async () => {
        calls.push(["cancel"]);
      },
      onTranscriptionEvent: () => () => undefined
    });

    await provider.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    provider.sendAudio(createFrame());
    await provider.stop();
    await provider.cancel();

    expect(calls).toEqual([
      [
        "start",
        { installationId: "install-1", language: "cantonese", sampleRate: 16000 }
      ],
      ["audio", [10, 20], 42],
      ["stop"],
      ["cancel"]
    ]);
  });

  it("emits serialized main-process transcription events as transcription events", () => {
    let eventListener:
      | ((event: { type: "error"; message: string } | { type: "final"; text: string }) => void)
      | undefined;
    const provider = createIpcTranscriptionProvider({
      startTranscription: vi.fn(async () => undefined),
      sendTranscriptionAudio: vi.fn(async () => undefined),
      stopTranscription: vi.fn(async () => ({})),
      cancelTranscription: vi.fn(async () => undefined),
      onTranscriptionEvent: (listener) => {
        eventListener = listener;
        return () => undefined;
      }
    });
    const events: Array<{ type: string; text?: string; message?: string }> = [];
    provider.subscribe((event) => {
      events.push({
        type: event.type,
        ...(event.type === "final" ? { text: event.text } : {}),
        ...(event.type === "error" ? { message: event.error.message } : {})
      });
    });

    eventListener?.({ type: "final", text: "hello" });
    eventListener?.({ type: "error", message: "connect failed" });

    expect(events).toEqual([
      { type: "final", text: "hello" },
      { type: "error", message: "connect failed" }
    ]);
  });

  it("compensates race by emitting final from stop() result when event channel is late", async () => {
    const provider = createIpcTranscriptionProvider({
      startTranscription: vi.fn(async () => undefined),
      sendTranscriptionAudio: vi.fn(async () => undefined),
      stopTranscription: vi.fn(async () => ({ finalText: "三二一" })),
      cancelTranscription: vi.fn(async () => undefined),
      // 模拟事件通道始终没发 final（跨 IPC 竞态）
      onTranscriptionEvent: () => () => undefined
    });
    const finals: string[] = [];
    provider.subscribe((event) => {
      if (event.type === "final") {
        finals.push(event.text);
      }
    });

    await provider.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    await provider.stop();

    expect(finals).toEqual(["三二一"]);
  });

  it("does not double-emit final when event channel already delivered it before stop()", async () => {
    let eventListener:
      | ((event: { type: "final"; text: string }) => void)
      | undefined;
    const provider = createIpcTranscriptionProvider({
      startTranscription: vi.fn(async () => undefined),
      sendTranscriptionAudio: vi.fn(async () => undefined),
      stopTranscription: vi.fn(async () => ({ finalText: "late" })),
      cancelTranscription: vi.fn(async () => undefined),
      onTranscriptionEvent: (listener) => {
        eventListener = listener as never;
        return () => undefined;
      }
    });
    const finals: string[] = [];
    provider.subscribe((event) => {
      if (event.type === "final") {
        finals.push(event.text);
      }
    });

    await provider.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    eventListener?.({ type: "final", text: "early" });
    await provider.stop();

    // 已通过事件收到 final，stop 返回值里的 finalText 不应再补发一次。
    expect(finals).toEqual(["early"]);
  });
  it("continues receiving events after canceling and starting again", async () => {
    let eventListener: ((event: { type: "final"; text: string }) => void) | undefined;
    const unsubscribes: Array<ReturnType<typeof vi.fn>> = [];
    const provider = createIpcTranscriptionProvider({
      startTranscription: vi.fn(async () => undefined),
      sendTranscriptionAudio: vi.fn(async () => undefined),
      stopTranscription: vi.fn(async () => ({})),
      cancelTranscription: vi.fn(async () => undefined),
      onTranscriptionEvent: (listener) => {
        eventListener = listener as never;
        const unsubscribe = vi.fn(() => {
          if (eventListener === listener) {
            eventListener = undefined;
          }
        });
        unsubscribes.push(unsubscribe);
        return unsubscribe;
      }
    });
    const finals: string[] = [];
    provider.subscribe((event) => {
      if (event.type === "final") {
        finals.push(event.text);
      }
    });

    await provider.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    await provider.cancel();
    await provider.start({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    eventListener?.({ type: "final", text: "after cancel" });

    expect(finals).toEqual(["after cancel"]);
    expect(unsubscribes).toHaveLength(2);
    expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
  });
});
