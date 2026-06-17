import type {
  TranscriptionEvent,
  TranscriptionProvider,
  TranscriptionStartInput
} from "@voice/ai";
import type { AudioFrame } from "@voice/shared";

export type SerializedTranscriptionEvent =
  | { type: "started" }
  | { type: "partial"; text: string }
  | { type: "final"; text: string }
  | { type: "error"; message: string }
  | { type: "stopped" };

/**
 * 主程序 stopTranscription IPC 的返回值。帶上本次會話的最終文本，用於補償
 * renderer 側“stop reply 已到，但 final event 還未派發”的跨 IPC 通道競態。
 */
export interface TranscriptionStopResult {
  finalText?: string;
}

export interface IpcTranscriptionTransport {
  startTranscription(input: TranscriptionStartInput): Promise<void>;
  sendTranscriptionAudio(frame: AudioFrame): Promise<void>;
  stopTranscription(): Promise<TranscriptionStopResult | undefined | void>;
  cancelTranscription(): Promise<void>;
  onTranscriptionEvent(
    listener: (event: SerializedTranscriptionEvent) => void
  ): () => void;
}

export function createIpcTranscriptionProvider(
  transport: IpcTranscriptionTransport
): TranscriptionProvider {
  const listeners = new Set<(event: TranscriptionEvent) => void>();
  /**
   * 本次會話是否已通過事件通道收到 final。stop() resolve 時若為 false，則使用
   * transport.stopTranscription() 的返回值裡的 finalText 補發一次 final，避免
   * voiceOperationController 拿到空的 finalTranscript。
   */
  let receivedFinal = false;
  let unsubscribeTransport: (() => void) | undefined;

  const emit = (event: TranscriptionEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const ensureTransportSubscription = (): void => {
    if (unsubscribeTransport) {
      return;
    }
    unsubscribeTransport = transport.onTranscriptionEvent((event) => {
      if (event.type === "final") {
        receivedFinal = true;
      }
      emit(deserializeEvent(event));
    });
  };

  ensureTransportSubscription();

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input) => {
      receivedFinal = false;
      ensureTransportSubscription();
      await transport.startTranscription(input);
    },
    sendAudio: (frame) => {
      void transport.sendTranscriptionAudio(frame).catch((error) => {
        emit({ type: "error", error: normalizeError(error) });
      });
    },
    stop: async () => {
      const result = (await transport.stopTranscription()) ?? undefined;
      // 跨 IPC 通道競態兌現：如果 invoke reply 先於 voice:transcription-event 到達
      // renderer，this 處 receivedFinal 仍是 false，就用主程序返回值裡的 finalText 補發
      // 一次 final，確保上層 controller 拿到有內容的 finalTranscript 去插入游標處。
      if (
        !receivedFinal &&
        result !== undefined &&
        typeof result.finalText === "string"
      ) {
        console.warn(
          `[transcription-ipc] stop reply 先於 final event 到達，使用返回值補發 finalTextLength=${result.finalText.length}`
        );
        receivedFinal = true;
        emit({ type: "final", text: result.finalText });
      }
    },
    cancel: async () => {
      await transport.cancelTranscription();
      unsubscribeTransport?.();
      unsubscribeTransport = undefined;
    }
  };
}

function deserializeEvent(event: SerializedTranscriptionEvent): TranscriptionEvent {
  if (event.type === "error") {
    return { type: "error", error: new Error(event.message) };
  }
  return event;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
