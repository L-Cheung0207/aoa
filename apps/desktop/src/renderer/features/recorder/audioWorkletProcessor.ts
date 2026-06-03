// 重要：AudioWorklet 按規範載入為 classic script（addModule 不支援 type: "module"），
// 此檔案不得出現任何 import/export 語句，否則瀏覽器會拋 SyntaxError 導致 process() 從不執行，
// 懸浮窗音量條也會永遠不動。所有工具物件都必須內聯。
// 僅依賴 declare 宣告提供 TS 型別，編譯後會被擦除，不會生成執行時 import。

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  abstract process(inputs: Float32Array[][]): boolean;
}

declare const currentTime: number;

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function convertFloat32ToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index] ?? 0, -1, 1);
    pcm[index] = Math.round(sample < 0 ? sample * 32768 : sample * 32767);
  }
  return pcm;
}

function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (const sample of samples) {
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples.length);
}

function downmixToMono(channels: Float32Array[]): Float32Array | undefined {
  const firstChannel = channels[0];
  if (!firstChannel) {
    return undefined;
  }
  if (channels.length === 1) {
    return firstChannel;
  }

  const mono = new Float32Array(firstChannel.length);
  for (let sampleIndex = 0; sampleIndex < firstChannel.length; sampleIndex += 1) {
    let sum = 0;
    for (const channel of channels) {
      sum += channel[sampleIndex] ?? 0;
    }
    mono[sampleIndex] = sum / channels.length;
  }
  return mono;
}

class VoiceRecorderWorklet extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const channel = downmixToMono(inputs[0] ?? []);

    if (!channel) {
      return true;
    }

    this.port.postMessage({
      pcm: convertFloat32ToPcm16(channel),
      sampleRate: 16000,
      timestampMs: currentTime * 1000,
      rms: calculateRms(channel)
    });

    return true;
  }
}

registerProcessor("voice-recorder-worklet", VoiceRecorderWorklet);
