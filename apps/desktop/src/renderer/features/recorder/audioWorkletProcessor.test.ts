import { afterEach, describe, expect, it, vi } from "vitest";

describe("voice recorder audio worklet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("downmixes all input channels to mono before emitting PCM", async () => {
    let processorCtor:
      | (new () => {
          port: { postMessage: ReturnType<typeof vi.fn> };
          process(inputs: Float32Array[][]): boolean;
        })
      | undefined;

    vi.stubGlobal(
      "AudioWorkletProcessor",
      class {
        readonly port = { postMessage: vi.fn() };
      }
    );
    vi.stubGlobal("currentTime", 0.25);
    vi.stubGlobal(
      "registerProcessor",
      (_name: string, ctor: typeof processorCtor) => {
        processorCtor = ctor;
      }
    );

    await import("./audioWorkletProcessor");

    const processor = new processorCtor!();
    processor.process([
      [
        new Float32Array([0, 0]),
        new Float32Array([1, -1])
      ]
    ]);

    expect(processor.port.postMessage).toHaveBeenCalledWith({
      pcm: new Int16Array([16384, -16384]),
      sampleRate: 16000,
      timestampMs: 250,
      rms: 0.5
    });
  });
});
