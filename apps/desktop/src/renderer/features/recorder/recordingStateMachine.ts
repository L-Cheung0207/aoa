import type { RecordingMode } from "@voice/shared";
import type { RecordingState } from "../../../preload/voiceApi";

export type ControllerRecordingState = Exclude<RecordingState, "result">;

export type VoiceErrorReason =
  | "mic"
  | "transcription"
  | "postprocess"
  | "insertion"
  | "no_selection"
  | "shortcut_conflict";

export type RecordingEvent =
  | { type: "start"; mode: RecordingMode }
  | { type: "cancel" }
  | { type: "undoCancel" }
  | { type: "stop" }
  | { type: "insert" }
  | { type: "retry"; mode: RecordingMode }
  | { type: "success" }
  | { type: "fail"; reason: VoiceErrorReason }
  | { type: "reset" };

export interface RecordingSnapshot {
  state: ControllerRecordingState;
  /** 僅在 listening/processing/inserting 階段有值 */
  mode: RecordingMode | undefined;
  /** 僅在 error 狀態下有值 */
  reason?: VoiceErrorReason;
  transcriptionStatus?: "starting" | "ready" | "unavailable";
}

export interface RecordingStateMachine {
  getSnapshot(): RecordingSnapshot;
  /** 向後相容：返回當前狀態（不包含 mode / reason） */
  getState(): ControllerRecordingState;
  send(event: RecordingEvent): RecordingSnapshot;
}

type TransitionMap = Partial<Record<RecordingEvent["type"], ControllerRecordingState>>;

const transitions: Record<ControllerRecordingState, TransitionMap> = {
  idle: {
    start: "listening",
    fail: "error"
  },
  listening: {
    cancel: "canceled",
    stop: "processing",
    fail: "error",
    reset: "idle"
  },
  canceled: {
    undoCancel: "processing",
    reset: "idle",
    fail: "error"
  },
  processing: {
    insert: "inserting",
    fail: "error",
    reset: "idle"
  },
  inserting: {
    success: "success",
    fail: "error",
    reset: "idle"
  },
  success: {
    reset: "idle",
    // 第一次會話成功後狀態機停留在 success 等待 reset；若使用者直接按 Right ALT 開啟下一輪，
    // controller 會發 start 事件，必須允許 success → listening，否則狀態機靜默忽略、UI 卡住。
    start: "listening"
  },
  error: {
    reset: "idle",
    start: "listening",
    retry: "processing"
  }
};

const MODE_CLEARING_STATES: ReadonlySet<ControllerRecordingState> = new Set([
  "idle",
  "success",
  "error"
]);

export function createRecordingStateMachine(): RecordingStateMachine {
  let snapshot: RecordingSnapshot = { state: "idle", mode: undefined };

  return {
    getSnapshot: () => snapshot,
    getState: () => snapshot.state,
    send: (event) => {
      const next = transitions[snapshot.state][event.type];
      if (!next) {
        return snapshot;
      }

      const nextMode: RecordingMode | undefined = (() => {
        if (event.type === "start" || event.type === "retry") {
          return event.mode;
        }
        if (MODE_CLEARING_STATES.has(next)) {
          return undefined;
        }
        return snapshot.mode;
      })();

      const nextReason: VoiceErrorReason | undefined =
        event.type === "fail" ? event.reason : undefined;

      snapshot = nextReason
        ? { state: next, mode: nextMode, reason: nextReason }
        : { state: next, mode: nextMode };
      return snapshot;
    }
  };
}
