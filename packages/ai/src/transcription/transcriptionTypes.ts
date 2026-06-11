import type {
  AudioFrame,
  RecordingLanguage,
  RecordingMode,
} from "@voice/shared";
import type {
  AppContext,
  PostprocessMode,
  PostprocessResult,
} from "@voice/backend-client";

export interface TranscriptionStartInput {
  installationId: string;
  language: RecordingLanguage;
  sampleRate: 16000;
  mode?: RecordingMode;
  selectedText?: string;
  targetLanguage?: "zh-CN" | "en-US";
  postprocessMode?: PostprocessMode;
  appContext?: AppContext;
}

export type TranscriptionEvent =
  | {
      type: "started";
    }
  | {
      type: "partial";
      text: string;
    }
  | {
      type: "final";
      text: string;
      result?: PostprocessResult;
    }
  | {
      type: "error";
      error: Error;
    }
  | {
      type: "stopped";
    };

export interface TranscriptionProvider {
  subscribe(listener: (event: TranscriptionEvent) => void): () => void;
  start(input: TranscriptionStartInput): Promise<void>;
  sendAudio(frame: AudioFrame): void;
  stop(): Promise<void>;
  cancel(): Promise<void>;
}

export function encodePcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
