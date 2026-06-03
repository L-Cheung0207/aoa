import type { RecordingMode } from "./settings";

export type HistoryRecordStatus = "completed" | "cancelled" | "no_audio" | "error";

export interface HistoryAudioFile {
  path: string;
  url: string;
  sampleRate: 16000;
  durationMs: number;
  sizeBytes: number;
}

export interface HistoryAudioData {
  data: ArrayBuffer;
  mimeType: "audio/wav";
  sizeBytes: number;
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  startedAt: string;
  durationMs: number;
  mode: RecordingMode;
  status: HistoryRecordStatus;
  transcript: string;
  finalText: string;
  selectedText?: string;
  errorMessage?: string;
  audio?: HistoryAudioFile;
}

export interface HistoryAudioInput {
  pcm: Int16Array;
  sampleRate: 16000;
}

export interface CreateHistoryRecordInput {
  startedAt: string;
  durationMs: number;
  mode: RecordingMode;
  status: HistoryRecordStatus;
  transcript: string;
  finalText: string;
  selectedText?: string;
  errorMessage?: string;
  audio?: HistoryAudioInput;
}
