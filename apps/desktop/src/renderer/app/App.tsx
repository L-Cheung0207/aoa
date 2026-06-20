import { useEffect, useReducer, useRef, useState } from "react";
import type {
  DictionaryTermContext,
  PostprocessMode,
} from "@voice/backend-client";
import type {
  AppSettings,
  InterfaceLanguage,
  RecordingLanguage,
  RecordingMode,
  WaveformStyle,
} from "@voice/shared";
import { DEFAULT_INTERFACE_LANGUAGE } from "@voice/shared";
import { createBrowserRecorderAdapter } from "../features/recorder/browserRecorderAdapter";
import { createRecorderService } from "../features/recorder/recorderService";
import type {
  RecordingState,
  ShortcutHelpPayload,
} from "../../preload/voiceApi";
import type {
  RecordingSnapshot,
  VoiceErrorReason,
} from "../features/recorder/recordingStateMachine";
import {
  createVoiceOperationController,
  VoiceTextInsertionError,
  type VoiceInsertionFallbackEvent,
  type VoiceOperationController,
  type VoicePostprocessResultEvent,
  type VoiceTextTarget,
} from "../features/voice/voiceOperationController";
import { createVoiceRecorderWorkletUrl } from "../features/recorder/voiceRecorderWorkletUrl";
import {
  OverlayWindow,
  type ResultOverlayContent,
} from "../features/overlay/OverlayWindow";
import { loadRendererAppConfig } from "./appConfig";
import { createJavaVoiceSessionProvider } from "./javaVoiceSessionProvider";
import {
  createConfiguredTranscriptionProvider,
  resolveSelectedWsServer,
} from "./transcriptionProviderFactory";
import { selectVoiceService } from "./voiceServiceSelection";
import {
  createInitialVoiceOverlayState,
  selectPendingStartMode,
  selectVoiceOverlayProjection,
  voiceOverlayReducer,
} from "./voiceOverlayState";

const SNAPSHOT_POLL_INTERVAL_MS = 120;
const MODE_HINT_VISIBLE_MS = 2000;
const BUSY_HINT_VISIBLE_MS = 5000;
const INTERACTION_SOUND_DURATION_MS = 90;
const INTERACTION_SOUND_VOLUME_MULTIPLIER = 2;
const RECORDING_LIMIT_WARNING_SECONDS = 60;
const MIN_START_LOADING_MS = 2000;
const THINKING_TIMEOUT_MS = 10000;
const CANCELED_OVERLAY_TIMEOUT_MS = 3000;

interface ControllerBundle {
  controller: VoiceOperationController;
  audio: AppSettings["audio"];
  /** Latest RMS frame, reset to zero after recording stops or errors. */
  getLevel(): number;
  getWaveformSamples(): Int16Array | undefined;
  dispose(): void;
}

export function App(): React.JSX.Element {
  const [initError, setInitError] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState<number>(0);
  const [recordingRemainingSeconds, setRecordingRemainingSeconds] = useState<
    number | undefined
  >(undefined);
  const [waveformSamples, setWaveformSamples] = useState<
    Int16Array | undefined
  >(undefined);
  const [showModeHint, setShowModeHint] = useState(false);
  const [waveformStyle, setWaveformStyle] =
    useState<WaveformStyle>("waveform-mono");
  const [uiLanguage, setUiLanguage] = useState<InterfaceLanguage>(
    DEFAULT_INTERFACE_LANGUAGE,
  );
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [projectionNowMs, setProjectionNowMs] = useState(() => Date.now());
  const [controllerSnapshot, setControllerSnapshot] =
    useState<RecordingSnapshot>({ state: "idle", mode: undefined });
  const [snapshotRevision, setSnapshotRevision] = useState(-1);
  const [overlayState, dispatchOverlay] = useReducer(
    voiceOverlayReducer,
    undefined,
    createInitialVoiceOverlayState,
  );
  const overlayProjection = selectVoiceOverlayProjection({
    overlay: overlayState,
    snapshot: controllerSnapshot,
    nowMs: projectionNowMs,
    recordingRemainingSeconds,
    minLoadingMs: MIN_START_LOADING_MS,
    thinkingTimeoutMs: THINKING_TIMEOUT_MS,
    canceledAutoCloseMs: CANCELED_OVERLAY_TIMEOUT_MS,
    recordingLimitWarningSeconds: RECORDING_LIMIT_WARNING_SECONDS,
  });
  const state = overlayProjection.state;
  const reason = overlayProjection.reason;
  const errorMessage = overlayProjection.errorMessage;
  const result = overlayProjection.result;
  const insertionFallbackText = overlayProjection.insertionFallbackText;
  const insertionFallbackMode = overlayProjection.insertionFallbackMode;
  const activeMode = overlayProjection.mode;
  const showBusyHint = overlayProjection.busyHintVisible;
  const shortcutHelp = overlayProjection.shortcutHelp;
  const networkErrorDismissed = overlayState.networkDismissed;
  const overlayError = errorMessage ?? initError;
  // Keep controller bundle in component scope for overlay callbacks.
  const bundleRef = useRef<ControllerBundle | undefined>(undefined);
  const showModeHintRef = useRef(false);
  const busyHintTimerRef = useRef<number | undefined>(undefined);
  const lastRecordingModeRef = useRef<RecordingMode>("direct");
  const lastReportedStateRef = useRef<RecordingState | undefined>(undefined);
  const lastReportedReasonRef = useRef<VoiceErrorReason | undefined>(undefined);
  const lastReportedSnapshotRevisionRef = useRef(-1);
  const lastReportedRecordingLimitWarningRef = useRef(false);
  const lastReportedBusyHintVisibleRef = useRef(false);
  const lastSoundStateRef = useRef<RecordingState | undefined>(undefined);
  const lastNetworkWarningVisibleRef = useRef(false);
  const lastRecordingLimitWarningSoundVisibleRef = useRef(false);
  const overlayStateRef = useRef(overlayState);
  const overlayProjectionRef = useRef(overlayProjection);
  const modeHintTimerRef = useRef<number | undefined>(undefined);
  const lastHintedListeningModeRef = useRef<RecordingMode | undefined>(undefined);

  useEffect(() => {
    overlayStateRef.current = overlayState;
    overlayProjectionRef.current = overlayProjection;
  }, [overlayProjection, overlayState]);

  const hideBusyHint = (): void => {
    if (busyHintTimerRef.current) {
      window.clearTimeout(busyHintTimerRef.current);
      busyHintTimerRef.current = undefined;
    }
    dispatchOverlay({ type: "hideBusyHint" });
  };

  const dismissRecordingLimitWarning = (): void => {
    dispatchOverlay({ type: "dismissRecordingLimitWarning" });
  };

  const hideShortcutHelp = (options: { reportIdle?: boolean } = {}): void => {
    const wasVisible = overlayStateRef.current.shortcutHelp !== undefined;
    dispatchOverlay({ type: "hideShortcutHelp" });
    if (options.reportIdle && wasVisible) {
      window.voiceAI.reportRecordingState({ state: "idle", mode: undefined });
    }
  };

  const showShortcutHelp = (payload: ShortcutHelpPayload): void => {
    hideBusyHint();
    dispatchOverlay({ type: "showShortcutHelp", shortcutHelp: payload });
  };

  const showProcessingBusyHint = (): void => {
    const wasVisible = overlayStateRef.current.busyHintVisible;
    if (busyHintTimerRef.current) {
      window.clearTimeout(busyHintTimerRef.current);
    }
    dispatchOverlay({ type: "showBusyHint" });
    if (!wasVisible && bundleRef.current) {
      playWarningInteractionSound(bundleRef.current.audio);
    }
    busyHintTimerRef.current = window.setTimeout(() => {
      hideBusyHint();
    }, BUSY_HINT_VISIBLE_MS);
  };

  const setDisplayedResult = (next: ResultOverlayContent | undefined): void => {
    if (next) {
      hideShortcutHelp();
      dispatchOverlay({ type: "showResult", result: next });
      return;
    }
    dispatchOverlay({ type: "dismissResult" });
  };

  const dismissResult = (): void => {
    setDisplayedResult(undefined);
    hideShortcutHelp();
  };

  const showInsertionFallback = (event: VoiceInsertionFallbackEvent): void => {
    const { mode, text } = event;
    if (!text.trim()) {
      return;
    }
    hideShortcutHelp();
    hideBusyHint();
    dispatchOverlay({ type: "showInsertionFallback", mode, text });
  };

  const dismissInsertionFallback = (): void => {
    dispatchOverlay({ type: "dismissInsertionFallback" });
    hideShortcutHelp();
    bundleRef.current?.controller.cancel().catch((error) => {
      console.error("[voice] dismiss insertion fallback reset failed", error);
    });
  };

  const showStartLoading = (mode: RecordingMode): void => {
    hideShortcutHelp();
    hideBusyHint();
    dispatchOverlay({ type: "beginStart", mode, nowMs: Date.now() });
    showModeHintRef.current = true;
    setShowModeHint(true);
  };

  const showRetryThinking = (mode: RecordingMode): void => {
    hideShortcutHelp();
    hideBusyHint();
    dispatchOverlay({ type: "beginRetry", mode, nowMs: Date.now() });
    showModeHintRef.current = false;
    setShowModeHint(false);
  };

  const showStopThinking = (mode: RecordingMode): void => {
    hideShortcutHelp();
    hideBusyHint();
    dispatchOverlay({ type: "beginStop", mode, nowMs: Date.now() });
    showModeHintRef.current = false;
    setShowModeHint(false);
  };

  const dismissNetworkError = (): void => {
    dispatchOverlay({ type: "dismissNetworkError" });
    hideShortcutHelp();
  };

  const retryNetworkError = (): void => {
    const mode = lastRecordingModeRef.current;
    setDisplayedResult(undefined);
    const bundle = bundleRef.current;
    if (!bundle) {
      return;
    }
    const controller = bundle.controller;
    const snapshot = controller.getSnapshot();
    const retryableListening =
      snapshot.state === "listening" &&
      snapshot.transcriptionStatus === "unavailable";
    const retryableError =
      snapshot.state === "error" && snapshot.reason === "transcription";
    if (!retryableListening && !retryableError) {
      console.warn(
        `[voice] network retry ignored; state=${snapshot.state} reason=${snapshot.reason ?? "none"} transcriptionStatus=${snapshot.transcriptionStatus ?? "none"}`,
      );
      return;
    }
    showRetryThinking(mode);
    controller
      .retryTranscription()
      .then(() => undefined)
      .catch((error) => {
        console.error("[voice] network error retry failed", error);
      });
  };

  const openMicrophoneHelp = (): void => {
    hideBusyHint();
    hideShortcutHelp();
    bundleRef.current?.controller.cancel().catch((error) => {
      console.error("[voice] microphone help cancel failed", error);
    });
    window.voiceAI.openMicrophoneHelp();
  };

  useEffect(() => {
    showModeHintRef.current = showModeHint;
  }, [showModeHint]);

  const hideModeHint = (): void => {
    if (modeHintTimerRef.current) {
      window.clearTimeout(modeHintTimerRef.current);
      modeHintTimerRef.current = undefined;
    }
    showModeHintRef.current = false;
    setShowModeHint(false);
  };

  const showModeHintFor = (_mode: RecordingMode): void => {
    if (modeHintTimerRef.current) {
      window.clearTimeout(modeHintTimerRef.current);
    }
    showModeHintRef.current = true;
    setShowModeHint(true);
    modeHintTimerRef.current = window.setTimeout(() => {
      hideModeHint();
    }, MODE_HINT_VISIBLE_MS);
  };

  useEffect(() => {
    return window.voiceAI.onSettingsChanged((settings) => {
      console.log("[voice] settings changed; rebuilding controller config");
      document.documentElement.dataset.theme = settings.ui.theme;
      setUiLanguage(settings.ui.language);
      setSettingsRevision((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let bundle: ControllerBundle | undefined;

    const initialize = async (): Promise<void> => {
      try {
        const bootstrapResponse = await window.voiceAI.bootstrapClient();
        const settings = await window.voiceAI.getSettings();
        const appConfig = await loadRendererAppConfig();
        if (cancelled) {
          return;
        }
        console.log(
          `[voice] renderer config developer.enabled=${settings.developer.enabled} javaVoiceWsUrl=${appConfig.javaVoiceWsUrl}`,
        );
        document.documentElement.dataset.theme = settings.ui.theme;
        setWaveformStyle(settings.recording.waveformStyle);
        setUiLanguage(settings.ui.language);
        bundle = buildController({
          installationId: bootstrapResponse.installationId,
          language: settings.recording.language,
          inputDeviceId: settings.recording.inputDeviceId,
          saveHistory: settings.privacy.saveHistory,
          developerEnabled: settings.developer.enabled,
          developerWsUrl: resolveSelectedWsServer(settings.ws)?.url,
          javaVoiceWsUrl: appConfig.javaVoiceWsUrl,
          postprocessMode: settings.ai.defaultMode,
          targetLanguage: settings.translation.targetLanguage,
          audio: settings.audio,
          onPostprocessResult: (event) => {
            setDisplayedResult({
              rawText: event.rawText,
              selectedText: event.selectedText,
              finalText: event.result.finalText,
              warnings: event.result.warnings,
            });
          },
          onClearResult: () => {
            setDisplayedResult(undefined);
          },
          onInsertionFallback: showInsertionFallback,
          onToggleAccepted: (mode) => {
            showStartLoading(mode);
          },
          onStopAccepted: (mode) => {
            showStopThinking(mode);
          },
          getPendingStartMode: () => selectPendingStartMode(overlayStateRef.current),
          onBusyDuringProcessing: showProcessingBusyHint,
          onTranscriptionUnavailable: () => undefined,
        });
        bundleRef.current = bundle;
      } catch (error) {
        if (!cancelled) {
          setInitError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void initialize();

    const unsubscribeConflict = window.voiceAI.onShortcutConflict((payload) => {
      console.warn("[voice] shortcut conflict received", payload);
      setDisplayedResult(undefined);
      hideShortcutHelp();
      dispatchOverlay({
        type: "showLocalError",
        reason: "shortcut_conflict",
        ...(payload.reason ? { message: payload.reason } : {}),
      });
    });

    // Escape while processing is routed here by the main process.
    const unsubscribeCancelRequested = window.voiceAI.onCancelRequested(() => {
      if (overlayStateRef.current.result) {
        console.log("[voice] cancel requested by ESC; dismissing result");
        dismissResult();
        return;
      }
      if (overlayStateRef.current.insertionFallbackText) {
        console.log("[voice] cancel requested by ESC; dismissing insertion fallback");
        dismissInsertionFallback();
        return;
      }

      console.log(
        "[voice] cancel requested by ESC; calling controller.cancel()",
      );
      bundleRef.current?.controller.cancel().catch((error) => {
        console.error("[voice] ESC cancel failed", error);
      });
    });

    // Shortcut help is controlled by main-process shortcut state.
    const unsubscribeShortcutHelp = window.voiceAI.onShortcutHelp((payload) => {
      console.log("[voice] shortcut help received");
      showShortcutHelp(payload);
    });
    const unsubscribeShortcutHelpDismiss = window.voiceAI.onShortcutHelpDismiss(
      () => {
        console.log("[voice] shortcut help dismiss received");
        hideShortcutHelp({ reportIdle: true });
      },
    );

    const pollHandle = window.setInterval(() => {
      if (!bundle) {
        return;
      }
      const now = Date.now();
      const snapshot = bundle.controller.getSnapshot();
      const nextSnapshotRevision = bundle.controller.getSnapshotRevision();

      dispatchOverlay({ type: "syncSnapshot", snapshot, nowMs: now });
      setControllerSnapshot(snapshot);
      setSnapshotRevision(nextSnapshotRevision);
      setProjectionNowMs(now);

      const nextRecordingRemainingSeconds =
        snapshot.state === "listening"
          ? bundle.controller.getRecordingRemainingSeconds()
          : undefined;
      setRecordingRemainingSeconds((current) =>
        current === nextRecordingRemainingSeconds
          ? current
          : nextRecordingRemainingSeconds,
      );

      const nextLevel = snapshot.state === "listening" ? bundle.getLevel() : 0;
      setLevel((current) => (current === nextLevel ? current : nextLevel));
      const nextWaveformSamples =
        snapshot.state === "listening"
          ? bundle.getWaveformSamples()
          : undefined;
      setWaveformSamples((current) =>
        current === nextWaveformSamples ? current : nextWaveformSamples,
      );
    }, SNAPSHOT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      unsubscribeConflict();
      unsubscribeCancelRequested();
      unsubscribeShortcutHelp();
      unsubscribeShortcutHelpDismiss();
      window.clearInterval(pollHandle);
      if (modeHintTimerRef.current) {
        window.clearTimeout(modeHintTimerRef.current);
        modeHintTimerRef.current = undefined;
      }
      if (busyHintTimerRef.current) {
        window.clearTimeout(busyHintTimerRef.current);
        busyHintTimerRef.current = undefined;
      }
      bundle?.dispose();
      bundleRef.current = undefined;
    };
  }, [settingsRevision]);

  useEffect(() => {
    if (activeMode) {
      lastRecordingModeRef.current = activeMode;
    }
  }, [activeMode]);

  useEffect(() => {
    const recordingLimitWarningVisible =
      overlayProjection.recordingLimitWarningVisible;
    const busyHintVisible = overlayProjection.busyHintVisible;
    if (
      lastReportedStateRef.current === state &&
      lastReportedReasonRef.current === reason &&
      lastReportedSnapshotRevisionRef.current === snapshotRevision &&
      lastReportedRecordingLimitWarningRef.current ===
        recordingLimitWarningVisible &&
      lastReportedBusyHintVisibleRef.current === busyHintVisible
    ) {
      return;
    }

    window.voiceAI.reportRecordingState({
      state,
      mode: activeMode,
      ...(reason !== undefined ? { reason } : {}),
      recordingLimitWarning: recordingLimitWarningVisible,
      busyHintVisible,
    });
    lastReportedStateRef.current = state;
    lastReportedReasonRef.current = reason;
    lastReportedSnapshotRevisionRef.current = snapshotRevision;
    lastReportedRecordingLimitWarningRef.current = recordingLimitWarningVisible;
    lastReportedBusyHintVisibleRef.current = busyHintVisible;
  }, [
    activeMode,
    overlayProjection.busyHintVisible,
    overlayProjection.recordingLimitWarningVisible,
    reason,
    snapshotRevision,
    state,
  ]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) {
      return;
    }
    const networkWarningVisible = overlayProjection.networkWarningVisible;
    const recordingLimitWarningVisible =
      overlayProjection.recordingLimitWarningVisible;

    if (networkWarningVisible && !lastNetworkWarningVisibleRef.current) {
      playWarningInteractionSound(bundle.audio);
    }
    lastNetworkWarningVisibleRef.current = networkWarningVisible;

    if (
      recordingLimitWarningVisible &&
      !lastRecordingLimitWarningSoundVisibleRef.current
    ) {
      playWarningInteractionSound(bundle.audio);
    }
    lastRecordingLimitWarningSoundVisibleRef.current =
      recordingLimitWarningVisible;

    if (!networkWarningVisible && lastSoundStateRef.current !== state) {
      playInteractionSoundForState(state, bundle.audio);
      lastSoundStateRef.current = state;
    }
  }, [
    overlayProjection.networkWarningVisible,
    overlayProjection.recordingLimitWarningVisible,
    state,
  ]);

  useEffect(() => {
    if (state === "listening" && activeMode) {
      if (lastHintedListeningModeRef.current !== activeMode) {
        lastHintedListeningModeRef.current = activeMode;
        showModeHintFor(activeMode);
      }
      return;
    }
    lastHintedListeningModeRef.current = undefined;
    hideModeHint();
  }, [activeMode, state]);

  useEffect(() => {
    if (overlayProjection.shouldClearPendingTransition) {
      dispatchOverlay({ type: "clearPendingTransition" });
    }
  }, [overlayProjection.shouldClearPendingTransition]);

  useEffect(() => {
    if (!overlayProjection.shouldAutoCloseCanceled) {
      return;
    }
    bundleRef.current?.controller.cancel().catch((error) => {
      console.error("[voice] canceled overlay auto-close failed", error);
    });
  }, [overlayProjection.shouldAutoCloseCanceled]);

  useEffect(() => {
    if (!overlayProjection.shouldCancelForThinkingTimeout) {
      return;
    }
    dispatchOverlay({ type: "markThinkingTimedOut" });
    console.warn("[voice] thinking timed out after 10s; closing connection");
    bundleRef.current?.controller.cancel().catch((error) => {
      console.error("[voice] failed to close connection after thinking timeout", error);
    });
  }, [overlayProjection.shouldCancelForThinkingTimeout]);

  useEffect(() => {
    if (
      state !== "idle" &&
      state !== "success" &&
      overlayState.shortcutHelp !== undefined
    ) {
      dispatchOverlay({ type: "hideShortcutHelp" });
    }
  }, [overlayState.shortcutHelp, state]);

  useEffect(() => {
    if (
      state !== "processing" &&
      state !== "inserting" &&
      overlayState.busyHintVisible
    ) {
      hideBusyHint();
    }
  }, [overlayState.busyHintVisible, state]);

  useEffect(() => {
    if (
      overlayState.recordingLimitWarningDismissed &&
      (state !== "listening" ||
        recordingRemainingSeconds === undefined ||
        recordingRemainingSeconds > RECORDING_LIMIT_WARNING_SECONDS)
    ) {
      dispatchOverlay({ type: "resetRecordingLimitWarningDismissed" });
    }
  }, [
    overlayState.recordingLimitWarningDismissed,
    recordingRemainingSeconds,
    state,
  ]);

  useEffect(() => {
    const snapshotNetworkError =
      (controllerSnapshot.state === "error" &&
        controllerSnapshot.reason === "transcription") ||
      (controllerSnapshot.state === "listening" &&
        controllerSnapshot.transcriptionStatus === "unavailable");
    if (!snapshotNetworkError && overlayState.networkDismissed) {
      dispatchOverlay({ type: "resetNetworkError" });
    }
  }, [
    controllerSnapshot.reason,
    controllerSnapshot.state,
    controllerSnapshot.transcriptionStatus,
    overlayState.networkDismissed,
  ]);

  return (
    <OverlayWindow
      state={state}
      {...(shortcutHelp !== undefined ? { shortcutHelp } : {})}
      {...(result !== undefined ? { result } : {})}
      {...(insertionFallbackText !== undefined ? { insertionFallbackText } : {})}
      {...(insertionFallbackMode !== undefined ? { insertionFallbackMode } : {})}
      level={level}
      {...(recordingRemainingSeconds !== undefined &&
      overlayProjection.recordingLimitWarningVisible
        ? { recordingRemainingSeconds }
        : {})}
      {...(waveformSamples !== undefined ? { waveformSamples } : {})}
      waveformStyle={waveformStyle}
      language={uiLanguage}
      {...(activeMode !== undefined ? { mode: activeMode } : {})}
      {...(activeMode !== undefined
        ? {
            modeHintLabel: getModeHintLabel(activeMode, uiLanguage),
            modeHintVisible: showModeHint,
          }
        : {})}
      busyHintVisible={showBusyHint}
      {...(reason === "transcription" && !networkErrorDismissed
        ? {
            onDismissNetworkError: dismissNetworkError,
            onRetryNetworkError: retryNetworkError,
          }
        : {})}
      onOpenMicrophoneHelp={openMicrophoneHelp}
      {...(reason !== undefined ? { reason } : {})}
      {...(overlayError !== undefined ? { error: overlayError } : {})}
      onCancel={() => {
        console.log("[voice] user clicked cancel");
        if (overlayProjectionRef.current.networkWarningVisible) {
          dispatchOverlay({ type: "dismissNetworkError" });
        }
        if (overlayStateRef.current.localErrorReason !== undefined) {
          dispatchOverlay({ type: "clearLocalError" });
        }
        // Controller may still be bootstrapping; missing bundle means no-op.
        hideBusyHint();
        bundleRef.current?.controller.cancel().catch((error) => {
          console.error("[voice] cancel failed", error);
        });
      }}
      onConfirm={() => {
        console.log("[voice] user clicked confirm");
        bundleRef.current?.controller.confirm().catch((error) => {
          console.error("[voice] confirm failed", error);
        });
      }}
      onUndoCancel={() => {
        console.log("[voice] user clicked undo cancel");
        bundleRef.current?.controller.undoCancel().catch((error) => {
          console.error("[voice] undoCancel failed", error);
        });
      }}
      onDismissBusyHint={hideBusyHint}
      onDismissRecordingLimitWarning={dismissRecordingLimitWarning}
      onDismissResult={dismissResult}
      onDismissInsertionFallback={dismissInsertionFallback}
    />
  );
}

interface BuildControllerInput {
  installationId: string;
  language: RecordingLanguage;
  inputDeviceId: string;
  saveHistory: boolean;
  developerEnabled: boolean;
  developerWsUrl: string | undefined;
  javaVoiceWsUrl: string;
  postprocessMode: PostprocessMode;
  targetLanguage: "zh-CN" | "en-US";
  audio: AppSettings["audio"];
  onPostprocessResult(event: VoicePostprocessResultEvent): void;
  onClearResult(): void;
  onInsertionFallback(event: VoiceInsertionFallbackEvent): void;
  onToggleAccepted(mode: RecordingMode): void;
  onStopAccepted(mode: RecordingMode): void;
  getPendingStartMode(): RecordingMode | undefined;
  onBusyDuringProcessing(): void;
  onTranscriptionUnavailable(): void;
}

function getModeHintLabel(
  mode: RecordingMode,
  language: InterfaceLanguage,
): string {
  if (language === "en-US") {
    switch (mode) {
      case "direct":
        return "Voice Input";
      case "processSelection":
        return "Smart Rewrite";
      case "translate":
        return "Translate";
    }
  }
  if (language === "zh-TW") {
    switch (mode) {
      case "direct":
        return "語音輸入模式";
      case "processSelection":
        return "智慧改寫模式";
      case "translate":
        return "翻譯模式";
    }
  }
  switch (mode) {
    case "direct":
      return "语音输入模式";
    case "processSelection":
      return "智能改写模式";
    case "translate":
      return "翻译模式";
  }
}

function playInteractionSoundForState(
  state: RecordingState,
  audioSettings: AppSettings["audio"],
): void {
  if (!audioSettings.interactionSounds) {
    return;
  }

  switch (state) {
    case "listening":
      playInteractionTone(660, 0.045);
      return;
    case "success":
    case "result":
      playInteractionTone(880, 0.04);
      return;
    case "error":
      playInteractionTone(220, 0.055);
      return;
    default:
      return;
  }
}

function playWarningInteractionSound(
  audioSettings: AppSettings["audio"],
): void {
  if (!audioSettings.interactionSounds) {
    return;
  }

  playInteractionTone(520, 0.045);
  window.setTimeout(() => {
    playInteractionTone(520, 0.035);
  }, 120);
}

function playInteractionTone(frequency: number, volume: number): void {
  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const outputVolume = Math.min(
      1,
      volume * INTERACTION_SOUND_VOLUME_MULTIPLIER,
    );
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(outputVolume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + INTERACTION_SOUND_DURATION_MS / 1000,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + INTERACTION_SOUND_DURATION_MS / 1000);
    oscillator.onended = () => {
      void context.close();
    };
  } catch (error) {
    console.warn("[voice] interaction sound playback failed; ignored", error);
  }
}

function buildController(input: BuildControllerInput): ControllerBundle {
  const workletUrl = createVoiceRecorderWorkletUrl();
  const revealSensitiveLogs = import.meta.env.DEV;

  const recorder = createRecorderService({
    adapter: createBrowserRecorderAdapter({
      mediaDevices: navigator.mediaDevices,
      AudioContextConstructor: AudioContext,
      workletUrl,
    }),
  });

  const voiceService = selectVoiceService({
    developerEnabled: input.developerEnabled,
    developerWsUrl: input.developerWsUrl,
    javaVoiceWsUrl: input.javaVoiceWsUrl,
  });
  if (voiceService.kind === "developer") {
    console.warn("[voice] controller using legacy developer ASR provider");
  } else if (voiceService.reason === "developer-unified-endpoint") {
    console.warn(
      `[voice] developer API URL overrides Java voice gateway url=${redactUrlForLog(voiceService.url, revealSensitiveLogs)}`,
    );
  }
  const transcriptionProvider =
    voiceService.kind === "developer"
      ? createConfiguredTranscriptionProvider()
      : createJavaVoiceSessionProvider({
          url: voiceService.url,
          revealSensitiveLogs,
        });
  if (voiceService.kind === "java") {
    console.log(
      `[voice] controller using Java voice gateway url=${redactUrlForLog(voiceService.url, revealSensitiveLogs)}`,
    );
  }

  const textTarget: VoiceTextTarget = {
    getSelectedText: () => window.voiceAI.getSelectedText(),
    insertText: async (text) => {
      console.log(`[voice] textTarget.insertText request textLength=${text.length}`);
      const result = await window.voiceAI.insertText(text);
      console.log(
        `[voice] textTarget.insertText result ok=${result.ok} strategy=${result.strategy} message=${result.message ?? ""}`,
      );
      if (!result.ok) {
        throw new VoiceTextInsertionError(
          result.message ?? "insert failed",
          result.fallbackText ?? text,
        );
      }
    },
    replaceSelection: async (text, expectedSelectedText) => {
      console.log(
        `[voice] textTarget.replaceSelection request textLength=${text.length} expectedSelectedTextLength=${expectedSelectedText?.length ?? 0}`,
      );
      const result = await window.voiceAI.replaceSelectedText(
        text,
        expectedSelectedText,
      );
      console.log(
        `[voice] textTarget.replaceSelection result ok=${result.ok} strategy=${result.strategy} message=${result.message ?? ""}`,
      );
      if (!result.ok) {
        throw new Error(result.message ?? "insert failed");
      }
    },
  };

  const dictionaryTerms: DictionaryTermContext[] = [];

  const controller = createVoiceOperationController({
    recorder,
    transcriptionProvider,
    textTarget,
    settings: {
      installationId: input.installationId,
      language: input.language,
      sampleRate: 16000,
      inputDeviceId: input.inputDeviceId,
      postprocessMode: input.postprocessMode,
      targetLanguage: input.targetLanguage,
      dictionaryTerms,
    },
    getAppContext: () => window.voiceAI.getActiveWindow(),
    onPostprocessResult: input.onPostprocessResult,
    onTranscriptionUnavailable: input.onTranscriptionUnavailable,
    onHistoryRecord: (historyInput) => {
      if (!input.saveHistory) {
        return;
      }
      void window.voiceAI.createHistoryRecord(historyInput).catch((error) => {
        console.warn("[voice] failed to create history record; ignored", error);
      });
    },
  });

  const unsubscribeToggle = window.voiceAI.onToggleRecording(
    ({ mode, selectedText, previewSelectedText }) => {
      console.log(`[voice] toggle recording received mode=${mode}`);
      const snapshot = controller.getSnapshot();
      const pendingStartMode = input.getPendingStartMode();
      const handleOptions =
        selectedText !== undefined || previewSelectedText !== undefined
          ? {
              ...(selectedText !== undefined ? { selectedText } : {}),
              ...(previewSelectedText !== undefined
                ? { previewSelectedText }
                : {}),
            }
          : undefined;
      if (
        pendingStartMode &&
        (snapshot.state === "idle" ||
          snapshot.state === "success" ||
          snapshot.state === "listening") &&
        (mode === "direct" || mode === pendingStartMode)
      ) {
        input.onStopAccepted(pendingStartMode);
        void controller.handleToggle(mode);
        return;
      }
      if (snapshot.state === "processing" || snapshot.state === "inserting") {
        input.onBusyDuringProcessing();
        return;
      }
      if (
        snapshot.state === "idle" ||
        snapshot.state === "success" ||
        snapshot.state === "error"
      ) {
        input.onClearResult();
        if (mode !== "processSelection") {
          input.onToggleAccepted(mode);
        }
        void controller.handleToggle(mode, handleOptions);
        return;
      } else if (
        snapshot.state === "listening" &&
        (mode === "direct" || mode === snapshot.mode)
      ) {
        input.onStopAccepted(snapshot.mode ?? mode);
        void controller.handleToggle(mode);
        return;
      }
      input.onClearResult();
      void controller.handleToggle(mode, handleOptions);
    },
  );

  // Recorder is also observed here for UI level/waveform rendering.
  // Controller owns the business subscription; this listener is display-only.
  let latestRms = 0;
  let latestWaveformSamples: Int16Array | undefined;
  const unsubscribeLevel = recorder.subscribe((event) => {
    if (event.type === "frame") {
      latestRms = event.frame.rms;
      latestWaveformSamples = event.frame.pcm;
    } else if (event.type === "stop" || event.type === "error") {
      latestRms = 0;
      latestWaveformSamples = undefined;
    }
  });

  return {
    controller,
    audio: input.audio,
    getLevel: () => latestRms,
    getWaveformSamples: () => latestWaveformSamples,
    dispose: () => {
      unsubscribeToggle();
      unsubscribeLevel();
      controller.dispose();
      URL.revokeObjectURL(workletUrl);
    },
  };
}

function redactUrlForLog(input: string, revealSensitive = false): string {
  if (revealSensitive) {
    try {
      return new URL(input).toString();
    } catch {
      return input;
    }
  }
  try {
    const parsed = new URL(input);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(?:AccessCode|accessCode|token|apiKey|password|secret)$/i.test(key)) {
        parsed.searchParams.set(key, "***");
      }
    }
    return parsed.toString();
  } catch {
    return input.replace(
      /([?&](?:AccessCode|accessCode|token|apiKey|password|secret)=)[^&\s]+/gi,
      "$1***",
    );
  }
}
