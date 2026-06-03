import { describe, expect, it, vi } from "vitest";
import type { AudioFrame } from "@voice/shared";
import { createRecorderService, type RecorderAdapter, type RecorderAdapterHandlers } from "./recorderService";

function createFrame(timestampMs: number): AudioFrame {
  return {
    pcm: new Int16Array([1, 2]),
    sampleRate: 16000,
    timestampMs,
    rms: 0.25
  };
}

describe("recorder service", () => {
  it("emits start frame and stop events", async () => {
    let handlers: RecorderAdapterHandlers | undefined;
    let stopped = false;
    const adapter: RecorderAdapter = {
      start: async (_options, nextHandlers) => {
        handlers = nextHandlers;
        return {
          stop: async () => {
            stopped = true;
          }
        };
      }
    };
    const events: string[] = [];
    const frames: AudioFrame[] = [];
    const recorder = createRecorderService({ adapter });

    recorder.subscribe((event) => {
      events.push(event.type);
      if (event.type === "frame") {
        frames.push(event.frame);
      }
    });

    await recorder.start();
    handlers?.onFrame(createFrame(10));
    await recorder.stop();

    expect(events).toEqual(["start", "frame", "stop"]);
    expect(frames).toEqual([createFrame(10)]);
    expect(stopped).toBe(true);
    expect(recorder.getState()).toBe("idle");
  });

  it("rejects double start while already listening", async () => {
    const adapter: RecorderAdapter = {
      start: async () => ({ stop: async () => undefined })
    };
    const recorder = createRecorderService({ adapter });

    await recorder.start();

    await expect(recorder.start()).rejects.toThrow("Recorder is already listening");
  });

  it("emits adapter errors and returns to idle", async () => {
    let handlers: RecorderAdapterHandlers | undefined;
    const adapter: RecorderAdapter = {
      start: async (_options, nextHandlers) => {
        handlers = nextHandlers;
        return { stop: async () => undefined };
      }
    };
    const events: string[] = [];
    const recorder = createRecorderService({ adapter });
    recorder.subscribe((event) => events.push(event.type));

    await recorder.start();
    handlers?.onError(new Error("microphone denied"));

    expect(events).toEqual(["start", "error"]);
    expect(recorder.getState()).toBe("idle");
  });

  it("单个 listener 抛异常不应中断其他订阅者的 frame 接收", async () => {
    let handlers: RecorderAdapterHandlers | undefined;
    const adapter: RecorderAdapter = {
      start: async (_options, nextHandlers) => {
        handlers = nextHandlers;
        return { stop: async () => undefined };
      }
    };
    const recorder = createRecorderService({ adapter });

    const secondListenerFrames: AudioFrame[] = [];
    recorder.subscribe(() => {
      throw new Error("listener #1 崩了");
    });
    recorder.subscribe((event) => {
      if (event.type === "frame") {
        secondListenerFrames.push(event.frame);
      }
    });

    await recorder.start();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      handlers?.onFrame(createFrame(10));
      handlers?.onFrame(createFrame(20));
    } finally {
      errorSpy.mockRestore();
    }

    expect(secondListenerFrames).toEqual([createFrame(10), createFrame(20)]);
  });
});
