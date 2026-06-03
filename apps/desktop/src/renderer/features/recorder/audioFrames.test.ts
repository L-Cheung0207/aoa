import { describe, expect, it } from "vitest";
import {
  convertFloat32ToPcm16,
  calculateRms,
  createAudioFrame,
  createPcmFrameBatcher
} from "./audioFrames";

describe("audio frame helpers", () => {
  it("converts float samples to signed 16-bit PCM with clipping", () => {
    const pcm = convertFloat32ToPcm16(new Float32Array([-2, -1, 0, 0.5, 1, 2]));

    expect(Array.from(pcm)).toEqual([-32768, -32768, 0, 16384, 32767, 32767]);
  });

  it("calculates root mean square volume", () => {
    expect(calculateRms(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5, 5);
  });

  it("creates a timestamped audio frame", () => {
    const frame = createAudioFrame({
      samples: new Float32Array([0, 1]),
      sampleRate: 16000,
      timestampMs: 123
    });

    expect(frame.sampleRate).toBe(16000);
    expect(frame.timestampMs).toBe(123);
    expect(Array.from(frame.pcm)).toEqual([0, 32767]);
    expect(frame.rms).toBeCloseTo(0.7071, 4);
  });

  it("batches tiny worklet frames into fixed-size PCM frames", () => {
    const emitted: Array<{ pcm: number[]; timestampMs: number; rms: number }> = [];
    const batcher = createPcmFrameBatcher({
      targetSamples: 4,
      onFrame: (frame) => {
        emitted.push({
          pcm: Array.from(frame.pcm),
          timestampMs: frame.timestampMs,
          rms: frame.rms
        });
      }
    });

    batcher.push({
      pcm: new Int16Array([1000, 1000]),
      sampleRate: 16000,
      timestampMs: 10,
      rms: 1000 / 32768
    });
    batcher.push({
      pcm: new Int16Array([2000, 2000, 3000]),
      sampleRate: 16000,
      timestampMs: 18,
      rms: Math.sqrt((2000 ** 2 + 2000 ** 2 + 3000 ** 2) / 3) / 32768
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.pcm).toEqual([1000, 1000, 2000, 2000]);
    expect(emitted[0]?.timestampMs).toBe(10);

    batcher.flush();

    expect(emitted).toHaveLength(2);
    expect(emitted[1]?.pcm).toEqual([3000]);
    expect(emitted[1]?.timestampMs).toBe(18);
  });
});
