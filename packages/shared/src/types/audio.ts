export interface AudioFrame {
  pcm: Int16Array;
  sampleRate: 16000;
  timestampMs: number;
  rms: number;
}
