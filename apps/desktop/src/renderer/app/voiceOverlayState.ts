import type { RecordingMode } from "@voice/shared";
import type { RecordingState, ShortcutHelpPayload } from "../../preload/voiceApi";
import type {
  RecordingSnapshot,
  VoiceErrorReason,
} from "../features/recorder/recordingStateMachine";
import type { ResultOverlayContent } from "../features/overlay/OverlayWindow";

export const DEFAULT_MIN_LOADING_MS = 2000;
export const DEFAULT_THINKING_TIMEOUT_MS = 10000;
export const DEFAULT_CANCELED_AUTO_CLOSE_MS = 3000;
export const DEFAULT_RECORDING_LIMIT_WARNING_SECONDS = 60;

export type PendingTransitionKind = "start" | "retry" | "stop";

export interface PendingTransition {
  kind: PendingTransitionKind;
  mode: RecordingMode;
  startedAtMs: number;
  displayState: "listening" | "processing";
}

export interface VoiceOverlayState {
  pendingTransition: PendingTransition | undefined;
  networkDismissed: boolean;
  forcedNetworkErrorVisible: boolean;
  localErrorReason: VoiceErrorReason | undefined;
  result: ResultOverlayContent | undefined;
  shortcutHelp: ShortcutHelpPayload | undefined;
  busyHintVisible: boolean;
  recordingLimitWarningDismissed: boolean;
  thinkingStartedAtMs: number | undefined;
  thinkingTimeoutFired: boolean;
  canceledStartedAtMs: number | undefined;
  lastSnapshotState: RecordingSnapshot["state"] | undefined;
}

export type VoiceOverlayAction =
  | { type: "syncSnapshot"; snapshot: RecordingSnapshot; nowMs: number }
  | { type: "beginStart"; mode: RecordingMode; nowMs: number }
  | { type: "beginRetry"; mode: RecordingMode; nowMs: number }
  | { type: "beginStop"; mode: RecordingMode; nowMs: number }
  | { type: "clearPendingTransition" }
  | { type: "dismissNetworkError" }
  | { type: "resetNetworkError" }
  | { type: "showLocalError"; reason: VoiceErrorReason }
  | { type: "clearLocalError" }
  | { type: "showResult"; result: ResultOverlayContent }
  | { type: "dismissResult" }
  | { type: "showShortcutHelp"; shortcutHelp: ShortcutHelpPayload }
  | { type: "hideShortcutHelp" }
  | { type: "showBusyHint" }
  | { type: "hideBusyHint" }
  | { type: "dismissRecordingLimitWarning" }
  | { type: "resetRecordingLimitWarningDismissed" }
  | { type: "markThinkingTimedOut" };

export interface SelectVoiceOverlayProjectionInput {
  overlay: VoiceOverlayState;
  snapshot: RecordingSnapshot;
  nowMs: number;
  recordingRemainingSeconds?: number | undefined;
  minLoadingMs?: number;
  thinkingTimeoutMs?: number;
  canceledAutoCloseMs?: number;
  recordingLimitWarningSeconds?: number;
}

export interface VoiceOverlayProjection {
  state: RecordingState;
  mode: RecordingMode | undefined;
  reason?: VoiceErrorReason;
  result?: ResultOverlayContent;
  shortcutHelp?: ShortcutHelpPayload;
  busyHintVisible: boolean;
  recordingLimitWarningVisible: boolean;
  networkWarningVisible: boolean;
  shouldClearPendingTransition: boolean;
  shouldAutoCloseCanceled: boolean;
  shouldCancelForThinkingTimeout: boolean;
}

export function createInitialVoiceOverlayState(): VoiceOverlayState {
  return {
    pendingTransition: undefined,
    networkDismissed: false,
    forcedNetworkErrorVisible: false,
    localErrorReason: undefined,
    result: undefined,
    shortcutHelp: undefined,
    busyHintVisible: false,
    recordingLimitWarningDismissed: false,
    thinkingStartedAtMs: undefined,
    thinkingTimeoutFired: false,
    canceledStartedAtMs: undefined,
    lastSnapshotState: undefined,
  };
}

export function selectPendingStartMode(
  overlay: VoiceOverlayState,
): RecordingMode | undefined {
  return overlay.pendingTransition?.kind === "start"
    ? overlay.pendingTransition.mode
    : undefined;
}

export function voiceOverlayReducer(
  state: VoiceOverlayState,
  action: VoiceOverlayAction,
): VoiceOverlayState {
  switch (action.type) {
    case "syncSnapshot": {
      const nextCanceledStartedAtMs =
        action.snapshot.state === "canceled"
          ? state.lastSnapshotState === "canceled"
            ? state.canceledStartedAtMs
            : action.nowMs
          : undefined;
      const thinkingVisible =
        action.snapshot.state === "processing" || action.snapshot.state === "inserting";
      const nextThinkingStartedAtMs = thinkingVisible
        ? state.thinkingStartedAtMs ?? action.nowMs
        : state.pendingTransition?.displayState === "processing"
          ? state.thinkingStartedAtMs
          : undefined;

      return {
        ...state,
        canceledStartedAtMs: nextCanceledStartedAtMs,
        thinkingStartedAtMs: nextThinkingStartedAtMs,
        thinkingTimeoutFired: thinkingVisible ? state.thinkingTimeoutFired : false,
        lastSnapshotState: action.snapshot.state,
      };
    }
    case "beginStart":
      return {
        ...state,
        pendingTransition: {
          kind: "start",
          mode: action.mode,
          startedAtMs: action.nowMs,
          displayState: "listening",
        },
        networkDismissed: false,
        forcedNetworkErrorVisible: false,
        localErrorReason: undefined,
        result: undefined,
        busyHintVisible: false,
        thinkingStartedAtMs: undefined,
        thinkingTimeoutFired: false,
      };
    case "beginRetry":
      return {
        ...state,
        pendingTransition: {
          kind: "retry",
          mode: action.mode,
          startedAtMs: action.nowMs,
          displayState: "processing",
        },
        networkDismissed: false,
        forcedNetworkErrorVisible: false,
        localErrorReason: undefined,
        result: undefined,
        busyHintVisible: false,
        thinkingStartedAtMs: action.nowMs,
        thinkingTimeoutFired: false,
      };
    case "beginStop":
      return {
        ...state,
        pendingTransition: {
          kind: "stop",
          mode: action.mode,
          startedAtMs: action.nowMs,
          displayState: "processing",
        },
        networkDismissed: false,
        forcedNetworkErrorVisible: false,
        localErrorReason: undefined,
        busyHintVisible: false,
        thinkingStartedAtMs: action.nowMs,
        thinkingTimeoutFired: false,
      };
    case "clearPendingTransition":
      return {
        ...state,
        pendingTransition: undefined,
      };
    case "dismissNetworkError":
      return {
        ...state,
        networkDismissed: true,
        forcedNetworkErrorVisible: false,
        pendingTransition: undefined,
        thinkingStartedAtMs: undefined,
        thinkingTimeoutFired: false,
      };
    case "resetNetworkError":
      return {
        ...state,
        networkDismissed: false,
        forcedNetworkErrorVisible: false,
      };
    case "showLocalError":
      return {
        ...state,
        localErrorReason: action.reason,
        pendingTransition: undefined,
        result: undefined,
        busyHintVisible: false,
        thinkingStartedAtMs: undefined,
        thinkingTimeoutFired: false,
      };
    case "clearLocalError":
      return {
        ...state,
        localErrorReason: undefined,
      };
    case "showResult":
      return {
        ...state,
        result: action.result,
        pendingTransition: undefined,
        localErrorReason: undefined,
        thinkingStartedAtMs: undefined,
        thinkingTimeoutFired: false,
      };
    case "dismissResult":
      return {
        ...state,
        result: undefined,
        pendingTransition: undefined,
        thinkingStartedAtMs: undefined,
        thinkingTimeoutFired: false,
      };
    case "showShortcutHelp":
      return {
        ...state,
        shortcutHelp: action.shortcutHelp,
        busyHintVisible: false,
      };
    case "hideShortcutHelp":
      return {
        ...state,
        shortcutHelp: undefined,
      };
    case "showBusyHint":
      return {
        ...state,
        busyHintVisible: true,
      };
    case "hideBusyHint":
      return {
        ...state,
        busyHintVisible: false,
      };
    case "dismissRecordingLimitWarning":
      return {
        ...state,
        recordingLimitWarningDismissed: true,
      };
    case "resetRecordingLimitWarningDismissed":
      return {
        ...state,
        recordingLimitWarningDismissed: false,
      };
    case "markThinkingTimedOut":
      return {
        ...state,
        networkDismissed: false,
        forcedNetworkErrorVisible: true,
        pendingTransition: undefined,
        busyHintVisible: false,
        thinkingStartedAtMs: undefined,
        thinkingTimeoutFired: true,
      };
  }
}

export function selectVoiceOverlayProjection(
  input: SelectVoiceOverlayProjectionInput,
): VoiceOverlayProjection {
  const minLoadingMs = input.minLoadingMs ?? DEFAULT_MIN_LOADING_MS;
  const thinkingTimeoutMs =
    input.thinkingTimeoutMs ?? DEFAULT_THINKING_TIMEOUT_MS;
  const canceledAutoCloseMs =
    input.canceledAutoCloseMs ?? DEFAULT_CANCELED_AUTO_CLOSE_MS;
  const recordingLimitWarningSeconds =
    input.recordingLimitWarningSeconds ??
    DEFAULT_RECORDING_LIMIT_WARNING_SECONDS;
  const pending = input.overlay.pendingTransition;
  const pendingElapsedMs = pending
    ? input.nowMs - pending.startedAtMs
    : Number.POSITIVE_INFINITY;
  const stopTransitionSettled =
    pending?.kind === "stop" &&
    (input.snapshot.state === "success" ||
      input.snapshot.state === "idle" ||
      input.snapshot.state === "error");
  const pendingActive =
    pending !== undefined &&
    pendingElapsedMs < minLoadingMs &&
    (pending.kind === "retry" ||
      (pending.kind === "start" &&
        (input.snapshot.state === "idle" ||
          input.snapshot.state === "success")) ||
      (pending.kind === "stop" && !stopTransitionSettled));
  const pendingStartActive =
    pending?.kind === "start" &&
    (input.snapshot.state === "idle" || input.snapshot.state === "success");
  const transcriptionUnavailable =
    input.snapshot.state === "listening" &&
    input.snapshot.transcriptionStatus === "unavailable";
  const snapshotTranscriptionError =
    input.snapshot.state === "error" &&
    input.snapshot.reason === "transcription";
  const networkVisible =
    input.overlay.forcedNetworkErrorVisible ||
    ((!input.overlay.networkDismissed &&
      (transcriptionUnavailable || snapshotTranscriptionError)));
  const dismissedSnapshotNetworkError =
    input.overlay.networkDismissed && snapshotTranscriptionError;
  const stopWaitingForController =
    pending?.kind === "stop" &&
    input.snapshot.state === "listening" &&
    !transcriptionUnavailable;
  const shouldAutoCloseCanceled =
    input.snapshot.state === "canceled" &&
    input.overlay.canceledStartedAtMs !== undefined &&
    input.nowMs - input.overlay.canceledStartedAtMs >= canceledAutoCloseMs;

  let state: RecordingState = input.overlay.result
    ? "result"
    : shouldAutoCloseCanceled
      ? "idle"
      : pendingActive
        ? pending.displayState
        : stopWaitingForController
          ? pending.displayState
        : input.overlay.localErrorReason
          ? "error"
          : networkVisible
            ? "error"
          : dismissedSnapshotNetworkError
            ? "idle"
            : pendingStartActive
              ? "listening"
              : input.snapshot.state;
  let mode =
    state === "result" ||
    state === "idle" ||
    state === "error"
      ? undefined
      : (input.snapshot.mode ?? pending?.mode);
  let reason: VoiceErrorReason | undefined =
    state === "error" && input.overlay.localErrorReason !== undefined
      ? input.overlay.localErrorReason
      : state === "error" && networkVisible
      ? "transcription"
      : state === "idle" || state === "success"
        ? undefined
      : state === "result"
        ? undefined
        : input.snapshot.reason;
  const thinkingVisible = state === "processing" || state === "inserting";
  const shouldCancelForThinkingTimeout =
    thinkingVisible &&
    !input.overlay.thinkingTimeoutFired &&
    input.overlay.thinkingStartedAtMs !== undefined &&
    input.nowMs - input.overlay.thinkingStartedAtMs >= thinkingTimeoutMs;

  if (shouldCancelForThinkingTimeout) {
    state = "error";
    mode = undefined;
    reason = "transcription";
  }

  const busyHintVisible =
    input.overlay.busyHintVisible &&
    (state === "processing" || state === "inserting");
  const recordingLimitWarningVisible =
    state === "listening" &&
    input.recordingRemainingSeconds !== undefined &&
    input.recordingRemainingSeconds <= recordingLimitWarningSeconds &&
    !input.overlay.recordingLimitWarningDismissed;
  const networkWarningVisible = state === "error" && reason === "transcription";
  const shouldClearPendingTransition =
    pending !== undefined &&
    (stopTransitionSettled ||
      (!pendingActive &&
        !stopWaitingForController &&
        !pendingStartActive &&
        input.snapshot.state !== "idle" &&
        input.snapshot.state !== "success"));

  return {
    state,
    mode,
    ...(reason !== undefined ? { reason } : {}),
    ...(input.overlay.result !== undefined ? { result: input.overlay.result } : {}),
    ...(input.overlay.shortcutHelp !== undefined
      ? { shortcutHelp: input.overlay.shortcutHelp }
      : {}),
    busyHintVisible,
    recordingLimitWarningVisible,
    networkWarningVisible,
    shouldClearPendingTransition,
    shouldAutoCloseCanceled,
    shouldCancelForThinkingTimeout,
  };
}
