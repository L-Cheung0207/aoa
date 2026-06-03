import type { AudioFrame } from "@voice/shared";

export interface CreateAudioFrameInput {
  samples: Float32Array;
  sampleRate: 16000;
  timestampMs: number;
}

export interface PcmFrameBatcher {
  push(frame: AudioFrame): void;
  flush(): void;
}

export interface CreatePcmFrameBatcherOptions {
  targetSamples: number;
  onFrame(frame: AudioFrame): void;
}

export function convertFloat32ToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index] ?? 0, -1, 1);
    pcm[index] = Math.round(sample < 0 ? sample * 32768 : sample * 32767);
  }

  return pcm;
}

export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;

  for (const sample of samples) {
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / samples.length);
}

export function createAudioFrame(input: CreateAudioFrameInput): AudioFrame {
  return {
    pcm: convertFloat32ToPcm16(input.samples),
    sampleRate: input.sampleRate,
    timestampMs: input.timestampMs,
    rms: calculateRms(input.samples)
  };
}

export function createPcmFrameBatcher(
  options: CreatePcmFrameBatcherOptions
): PcmFrameBatcher {
  let pending = new Int16Array(0);
  let pendingTimestampMs = 0;
  let pendingWeightedRmsSquares = 0;
  let hasPending = false;

  const emit = (pcm: Int16Array, timestampMs: number, weightedRmsSquares: number): void => {
    options.onFrame({
      pcm,
      sampleRate: 16000,
      timestampMs,
      rms: Math.sqrt(weightedRmsSquares / pcm.length)
    });
  };

  return {
    push: (frame) => {
      if (frame.pcm.length === 0) {
        return;
      }

      if (!hasPending) {
        pendingTimestampMs = frame.timestampMs;
        hasPending = true;
      }

      const merged = new Int16Array(pending.length + frame.pcm.length);
      merged.set(pending, 0);
      merged.set(frame.pcm, pending.length);
      pending = merged;
      pendingWeightedRmsSquares += frame.rms ** 2 * frame.pcm.length;

      while (pending.length >= options.targetSamples) {
        const chunk = pending.slice(0, options.targetSamples);
        const chunkWeightedRmsSquares =
          pendingWeightedRmsSquares * (options.targetSamples / pending.length);
        emit(chunk, pendingTimestampMs, chunkWeightedRmsSquares);

        pending = pending.slice(options.targetSamples);
        pendingWeightedRmsSquares -= chunkWeightedRmsSquares;
        pendingTimestampMs = frame.timestampMs;
        hasPending = pending.length > 0;
      }
    },
    flush: () => {
      if (!hasPending || pending.length === 0) {
        return;
      }

      emit(pending, pendingTimestampMs, pendingWeightedRmsSquares);
      pending = new Int16Array(0);
      pendingWeightedRmsSquares = 0;
      hasPending = false;
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
