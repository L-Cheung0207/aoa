import type { AudioFrame } from "@voice/shared";
import type { TranscriptionEvent, TranscriptionProvider, TranscriptionStartInput } from "./transcriptionTypes";

export interface MockTranscriptionProviderOptions {
  partialText: string;
  finalText: string;
}

export function createMockTranscriptionProvider(
  options: MockTranscriptionProviderOptions
): TranscriptionProvider {
  const listeners = new Set<(event: TranscriptionEvent) => void>();
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
    start: async (_input: TranscriptionStartInput) => {
      emit({ type: "started" });
      emit({ type: "partial", text: options.partialText });
    },
    sendAudio: (_frame: AudioFrame) => undefined,
    stop: async () => {
      emit({ type: "final", text: options.finalText });
      emit({ type: "stopped" });
    },
    cancel: async () => {
      emit({ type: "stopped" });
    }
  };
}
