import type { AudioFrame } from "@voice/shared";

export interface RecorderOptions {
  sampleRate: 16000;
  maxDurationSeconds: number;
  inputDeviceId: string;
}

export interface RecorderAdapterHandlers {
  onFrame(frame: AudioFrame): void;
  onError(error: Error): void;
}

export interface RecorderSession {
  stop(): Promise<void>;
}

export interface RecorderAdapter {
  start(options: RecorderOptions, handlers: RecorderAdapterHandlers): Promise<RecorderSession>;
}

export type RecorderEvent =
  | {
    type: "start";
  }
  | {
    type: "frame";
    frame: AudioFrame;
  }
  | {
    type: "stop";
  }
  | {
    type: "error";
    error: Error;
  };

export type RecorderServiceState = "idle" | "listening";

export interface RecorderService {
  getState(): RecorderServiceState;
  subscribe(listener: (event: RecorderEvent) => void): () => void;
  start(options?: Partial<RecorderOptions>): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
}

export interface CreateRecorderServiceOptions {
  adapter: RecorderAdapter;
}

export const DEFAULT_RECORDER_MAX_DURATION_SECONDS = 300;

const defaultRecorderOptions: RecorderOptions = {
  sampleRate: 16000,
  maxDurationSeconds: DEFAULT_RECORDER_MAX_DURATION_SECONDS,
  inputDeviceId: ""
};

export function createRecorderService(options: CreateRecorderServiceOptions): RecorderService {
  const listeners = new Set<(event: RecorderEvent) => void>();
  let state: RecorderServiceState = "idle";
  let activeSession: RecorderSession | undefined;

  const emit = (event: RecorderEvent): void => {
    // listener 隔離：單個訂閱者報錯不能影響其他訂閱者。
    // 場景：TranscriptionProvider.sendAudio 過去在 socket 未就緒時會 throw，
    // 會中斷 for…of 迴圈，造成 App.tsx 裡快取 latestRms 的 listener 收不到 frame。
    // 現在用 try/catch 包裹，即使某個 listener 未來重新引入異常也不會跟反所有人。
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("[recorder] listener 丟擲異常，已隔離，不影響其他訂閱者", error);
      }
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (startOptions) => {
      if (state === "listening") {
        throw new Error("Recorder is already listening");
      }

      state = "listening";
      activeSession = await options.adapter.start(
        { ...defaultRecorderOptions, ...startOptions },
        {
          onFrame: (frame) => emit({ type: "frame", frame }),
          onError: (error) => {
            state = "idle";
            activeSession = undefined;
            emit({ type: "error", error });
          }
        }
      );
      emit({ type: "start" });
    },
    stop: async () => {
      if (!activeSession) {
        return;
      }

      const session = activeSession;
      activeSession = undefined;
      await session.stop();
      state = "idle";
      emit({ type: "stop" });
    },
    cancel: async () => {
      await activeSession?.stop();
      activeSession = undefined;
      state = "idle";
    }
  };
}
