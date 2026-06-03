import type { BackendClient } from "@voice/backend-client";
import type { RecordingLanguage } from "@voice/shared";
import {
  encodePcm16ToBase64,
  type TranscriptionEvent,
  type TranscriptionProvider
} from "./transcriptionTypes";

export interface RealtimeSocket {
  send(message: string): void;
  close(): Promise<void>;
  onMessage(handler: (message: string) => void): void;
  onError(handler: (error: Error) => void): void;
  emitMessage?(message: string): void;
  emitError?(error: Error): void;
}

export interface RealtimeSocketFactory {
  connect(url: string, token: string): Promise<RealtimeSocket>;
}

export interface CreateRealtimeTranscriptionProviderOptions {
  backendClient: Pick<BackendClient, "createTranscriptionSession">;
  socketFactory: RealtimeSocketFactory;
}

type RealtimeServerMessage =
  | {
      type: "partial";
      text: string;
    }
  | {
      type: "final";
      text: string;
    }
  | {
      type: "error";
      message: string;
    };

export function createRealtimeTranscriptionProvider(
  options: CreateRealtimeTranscriptionProviderOptions
): TranscriptionProvider {
  const listeners = new Set<(event: TranscriptionEvent) => void>();
  let socket: RealtimeSocket | undefined;

  const emit = (event: TranscriptionEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input) => {
      const session = await options.backendClient.createTranscriptionSession({
        installationId: input.installationId,
        mode: "realtime",
        language: toBackendLanguage(input.language),
        audioFormat: "pcm16",
        sampleRate: input.sampleRate
      });
      socket = await options.socketFactory.connect(session.url, session.token);
      socket.onMessage((message) => handleServerMessage(message, emit));
      socket.onError((error) => emit({ type: "error", error }));
      emit({ type: "started" });
    },
    sendAudio: (frame) => {
      if (!socket) {
        throw new Error("Transcription session is not active");
      }

      socket.send(
        JSON.stringify({
          type: "audio",
          audio: encodePcm16ToBase64(frame.pcm),
          sampleRate: frame.sampleRate,
          timestampMs: frame.timestampMs
        })
      );
    },
    stop: async () => {
      if (!socket) {
        return;
      }

      const activeSocket = socket;
      socket = undefined;
      activeSocket.send(JSON.stringify({ type: "stop" }));
      await activeSocket.close();
      emit({ type: "stopped" });
    },
    cancel: async () => {
      if (!socket) {
        return;
      }

      const activeSocket = socket;
      socket = undefined;
      await activeSocket.close();
      emit({ type: "stopped" });
    }
  };
}

function handleServerMessage(
  message: string,
  emit: (event: TranscriptionEvent) => void
): void {
  const parsed = parseServerMessage(message);

  if (!parsed) {
    return;
  }

  if (parsed.type === "error") {
    emit({ type: "error", error: new Error(parsed.message) });
    return;
  }

  emit({ type: parsed.type, text: parsed.text });
}

function parseServerMessage(message: string): RealtimeServerMessage | undefined {
  try {
    const parsed = JSON.parse(message) as Partial<RealtimeServerMessage>;

    if (
      (parsed.type === "partial" || parsed.type === "final") &&
      typeof parsed.text === "string"
    ) {
      return parsed as RealtimeServerMessage;
    }

    if (parsed.type === "error" && typeof parsed.message === "string") {
      return parsed as RealtimeServerMessage;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function toBackendLanguage(lang: RecordingLanguage): "auto" | "zh-CN" | "en-US" {
  switch (lang) {
    case "mandarin":
    case "zh-CN":
      return "zh-CN";
    case "english":
    case "en-US":
      return "en-US";
    case "auto":
    default:
      return "auto";
  }
}
