import { useEffect, useRef, useState } from "react";
import type {
  DictionaryTermContext,
  PostprocessRequest,
  PostprocessResult,
} from "@voice/backend-client";
import type {
  AppSettings,
  InterfaceLanguage,
  RecordingLanguage,
  RecordingMode,
  WaveformStyle,
} from "@voice/shared";
import {
  createPostProcessService,
  type PostProcessService,
  type TranscriptionProvider,
} from "@voice/ai";
import { createBrowserRecorderAdapter } from "../features/recorder/browserRecorderAdapter";
import { createRecorderService } from "../features/recorder/recorderService";
import type {
  RecordingState,
  ShortcutHelpPayload,
} from "../../preload/voiceApi";
import type { VoiceErrorReason } from "../features/recorder/recordingStateMachine";
import {
  createVoiceOperationController,
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

const SNAPSHOT_POLL_INTERVAL_MS = 120;
const MODE_HINT_VISIBLE_MS = 2000;
const BUSY_HINT_VISIBLE_MS = 5000;
const INTERACTION_SOUND_DURATION_MS = 90;
const RECORDING_LIMIT_WARNING_SECONDS = 60;
const MIN_START_LOADING_MS = 2000;
const THINKING_TIMEOUT_MS = 10000;
const ONBOARDING_MICROPHONE_STEP = 1;

interface ControllerBundle {
  controller: VoiceOperationController;
  audio: AppSettings["audio"];
  /** 最近一幀的 RMS（線性 0~1，實際通常在 0~0.2 區間）。錄音停止/錯誤後自動歸零。 */
  getLevel(): number;
  getWaveformSamples(): Int16Array | undefined;
  dispose(): void;
}

export function App(): React.JSX.Element {
  const [state, setState] = useState<RecordingState>("idle");
  const [reason, setReason] = useState<VoiceErrorReason | undefined>(undefined);
  const [initError, setInitError] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState<number>(0);
  const [recordingRemainingSeconds, setRecordingRemainingSeconds] = useState<
    number | undefined
  >(undefined);
  const [recordingLimitWarningDismissed, setRecordingLimitWarningDismissed] =
    useState(false);
  const [waveformSamples, setWaveformSamples] = useState<
    Int16Array | undefined
  >(undefined);
  const [result, setResult] = useState<ResultOverlayContent | undefined>(
    undefined,
  );
  const [activeMode, setActiveMode] = useState<RecordingMode | undefined>(
    undefined,
  );
  const [showModeHint, setShowModeHint] = useState(false);
  const [showBusyHint, setShowBusyHint] = useState(false);
  const [shortcutHelp, setShortcutHelp] = useState<
    ShortcutHelpPayload | undefined
  >(undefined);
  const [waveformStyle, setWaveformStyle] =
    useState<WaveformStyle>("waveform-sunset");
  const [uiLanguage, setUiLanguage] = useState<InterfaceLanguage>("zh-CN");
  const [settingsRevision, setSettingsRevision] = useState(0);
  // 將 bundle 提到元件作用域的 ref，便於 onCancel / onConfirm 回撥訪問 controller。
  const bundleRef = useRef<ControllerBundle | undefined>(undefined);
  const resultRef = useRef<ResultOverlayContent | undefined>(undefined);
  const showModeHintRef = useRef(false);
  const busyHintTimerRef = useRef<number | undefined>(undefined);
  const showBusyHintRef = useRef(false);
  const recordingLimitWarningDismissedRef = useRef(false);
  const shortcutHelpVisibleRef = useRef(false);
  const pendingStartModeRef = useRef<RecordingMode | undefined>(undefined);
  const pendingStartStartedAtRef = useRef<number | undefined>(undefined);
  const pendingStartDisplayStateRef = useRef<"listening" | "processing">(
    "listening",
  );
  const pendingStartKindRef = useRef<"start" | "retry" | "stop">("start");
  const thinkingStartedAtRef = useRef<number | undefined>(undefined);
  const thinkingTimeoutFiredRef = useRef(false);
  const thinkingTimeoutTimerRef = useRef<number | undefined>(undefined);
  const lastRecordingModeRef = useRef<RecordingMode>("direct");
  const networkErrorVisibleRef = useRef(false);
  const networkErrorDismissedRef = useRef(false);
  const [networkErrorDismissed, setNetworkErrorDismissed] = useState(false);

  const hideBusyHint = (): void => {
    if (busyHintTimerRef.current) {
      window.clearTimeout(busyHintTimerRef.current);
      busyHintTimerRef.current = undefined;
    }
    showBusyHintRef.current = false;
    setShowBusyHint(false);
  };

  const resetThinkingTimeout = (): void => {
    if (thinkingTimeoutTimerRef.current !== undefined) {
      window.clearTimeout(thinkingTimeoutTimerRef.current);
      thinkingTimeoutTimerRef.current = undefined;
    }
    thinkingStartedAtRef.current = undefined;
    thinkingTimeoutFiredRef.current = false;
  };

  const showThinkingTimeoutError = (): void => {
    thinkingTimeoutTimerRef.current = undefined;
    if (thinkingTimeoutFiredRef.current) {
      return;
    }
    thinkingTimeoutFiredRef.current = true;
    thinkingStartedAtRef.current = undefined;
    pendingStartModeRef.current = undefined;
    pendingStartStartedAtRef.current = undefined;
    networkErrorVisibleRef.current = true;
    networkErrorDismissedRef.current = false;
    setNetworkErrorDismissed(false);
    setReason("transcription");
    hideBusyHint();
    setState("error");
    window.voiceAI.reportRecordingState({
      state: "error",
      mode: undefined,
      reason: "transcription",
    });
    console.warn("[voice] thinking timed out after 10s; closing connection");
    bundleRef.current?.controller.cancel().catch((error) => {
      console.error("[voice] failed to close connection after thinking timeout", error);
    });
  };

  const startThinkingTimeout = (): void => {
    resetThinkingTimeout();
    thinkingStartedAtRef.current = Date.now();
    thinkingTimeoutTimerRef.current = window.setTimeout(
      showThinkingTimeoutError,
      THINKING_TIMEOUT_MS,
    );
  };

  const dismissRecordingLimitWarning = (): void => {
    recordingLimitWarningDismissedRef.current = true;
    setRecordingLimitWarningDismissed(true);
  };

  const resetRecordingLimitWarningDismissed = (): void => {
    if (!recordingLimitWarningDismissedRef.current) {
      return;
    }
    recordingLimitWarningDismissedRef.current = false;
    setRecordingLimitWarningDismissed(false);
  };

  const hideShortcutHelp = (options: { reportIdle?: boolean } = {}): void => {
    const wasVisible = shortcutHelpVisibleRef.current;
    shortcutHelpVisibleRef.current = false;
    setShortcutHelp(undefined);
    if (options.reportIdle && wasVisible) {
      window.voiceAI.reportRecordingState({ state: "idle", mode: undefined });
    }
  };

  const showShortcutHelp = (payload: ShortcutHelpPayload): void => {
    hideBusyHint();
    shortcutHelpVisibleRef.current = true;
    setShortcutHelp(payload);
  };

  const showProcessingBusyHint = (): void => {
    const wasVisible = showBusyHintRef.current;
    if (busyHintTimerRef.current) {
      window.clearTimeout(busyHintTimerRef.current);
    }
    showBusyHintRef.current = true;
    setShowBusyHint(true);
    if (!wasVisible && bundleRef.current) {
      playWarningInteractionSound(bundleRef.current.audio);
    }
    busyHintTimerRef.current = window.setTimeout(() => {
      hideBusyHint();
    }, BUSY_HINT_VISIBLE_MS);
  };

  const setDisplayedResult = (next: ResultOverlayContent | undefined): void => {
    resultRef.current = next;
    setResult(next);
    if (next) {
      resetThinkingTimeout();
      hideShortcutHelp();
      setState("result");
      window.voiceAI.reportRecordingState({ state: "result", mode: undefined });
    }
  };

  const dismissResult = (): void => {
    setDisplayedResult(undefined);
    hideShortcutHelp();
    pendingStartModeRef.current = undefined;
    pendingStartStartedAtRef.current = undefined;
    resetThinkingTimeout();
    setState("idle");
    window.voiceAI.reportRecordingState({ state: "idle", mode: undefined });
  };

  const showStartLoading = (mode: RecordingMode): void => {
    pendingStartModeRef.current = mode;
    pendingStartStartedAtRef.current = Date.now();
    pendingStartDisplayStateRef.current = "listening";
    pendingStartKindRef.current = "start";
    resetThinkingTimeout();
    hideShortcutHelp();
    hideBusyHint();
    networkErrorVisibleRef.current = false;
    networkErrorDismissedRef.current = false;
    setNetworkErrorDismissed(false);
    setReason(undefined);
    setActiveMode(mode);
    showModeHintRef.current = true;
    setShowModeHint(true);
    setState("listening");
    window.voiceAI.reportRecordingState({ state: "listening", mode });
  };

  const showRetryThinking = (mode: RecordingMode): void => {
    pendingStartModeRef.current = mode;
    pendingStartStartedAtRef.current = Date.now();
    pendingStartDisplayStateRef.current = "processing";
    pendingStartKindRef.current = "retry";
    startThinkingTimeout();
    hideShortcutHelp();
    hideBusyHint();
    networkErrorVisibleRef.current = false;
    networkErrorDismissedRef.current = false;
    setNetworkErrorDismissed(false);
    setReason(undefined);
    setActiveMode(mode);
    showModeHintRef.current = false;
    setShowModeHint(false);
    setState("processing");
    window.voiceAI.reportRecordingState({ state: "processing", mode });
  };

  const showStopThinking = (mode: RecordingMode): void => {
    pendingStartModeRef.current = mode;
    pendingStartStartedAtRef.current = Date.now();
    pendingStartDisplayStateRef.current = "processing";
    pendingStartKindRef.current = "stop";
    startThinkingTimeout();
    hideShortcutHelp();
    hideBusyHint();
    networkErrorVisibleRef.current = false;
    networkErrorDismissedRef.current = false;
    setNetworkErrorDismissed(false);
    setReason(undefined);
    setActiveMode(mode);
    showModeHintRef.current = false;
    setShowModeHint(false);
    setState("processing");
    window.voiceAI.reportRecordingState({ state: "processing", mode });
  };

  const dismissNetworkError = (): void => {
    networkErrorVisibleRef.current = false;
    networkErrorDismissedRef.current = true;
    pendingStartModeRef.current = undefined;
    pendingStartStartedAtRef.current = undefined;
    resetThinkingTimeout();
    setNetworkErrorDismissed(true);
    hideShortcutHelp();
    if (state === "error") {
      setState("idle");
      setReason(undefined);
      window.voiceAI.reportRecordingState({ state: "idle", mode: undefined });
    }
  };

  const retryNetworkError = (): void => {
    const mode = lastRecordingModeRef.current;
    networkErrorDismissedRef.current = false;
    setNetworkErrorDismissed(false);
    setDisplayedResult(undefined);
    const controller = bundleRef.current?.controller;
    if (!controller) {
      return;
    }
    if (state === "listening") {
      controller
        .retryTranscription()
        .then((ok) => {
          if (ok) {
            networkErrorVisibleRef.current = false;
            setReason(undefined);
          } else {
            networkErrorVisibleRef.current = true;
            setReason("transcription");
          }
        })
        .catch((error) => {
          networkErrorVisibleRef.current = true;
          setReason("transcription");
          console.error("[voice] 网络错误重试失败", error);
        });
      return;
    }
    showRetryThinking(mode);
    controller.handleToggle(mode).catch((error) => {
      console.error("[voice] 网络错误重试失败", error);
    });
  };

  const openMicrophoneHelp = (): void => {
    window.voiceAI.openHomeSection({
      section: "home",
      onboardingStep: ONBOARDING_MICROPHONE_STEP,
    });
  };

  useEffect(() => {
    showModeHintRef.current = showModeHint;
  }, [showModeHint]);

  useEffect(() => {
    return window.voiceAI.onSettingsChanged((settings) => {
      console.log("[voice] 收到 settings-changed，重新載入語音控制器配置");
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
          postprocessStyle: settings.ai.defaultStyle,
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
            pendingStartModeRef.current = undefined;
            pendingStartStartedAtRef.current = undefined;
            resetThinkingTimeout();
            setState("idle");
          },
          onToggleAccepted: (mode) => {
            showStartLoading(mode);
          },
          onStopAccepted: (mode) => {
            showStopThinking(mode);
          },
          getPendingStartMode: () => pendingStartModeRef.current,
          onBusyDuringProcessing: showProcessingBusyHint,
          onTranscriptionUnavailable: () => {
            networkErrorVisibleRef.current = true;
            networkErrorDismissedRef.current = false;
            setNetworkErrorDismissed(false);
          },
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
      console.warn("[voice] 收到 onShortcutConflict", payload);
      setDisplayedResult(undefined);
      hideShortcutHelp();
      setState("error");
      setReason("shortcut_conflict");
    });

    // 主程序在「處理階段」按下 Escape 時會發出此事件，複用現有取消鏈路退出處理。
    const unsubscribeCancelRequested = window.voiceAI.onCancelRequested(() => {
      if (resultRef.current) {
        console.log("[voice] 收到 onCancelRequested（ESC），關閉結果浮窗");
        dismissResult();
        return;
      }

      console.log(
        "[voice] 收到 onCancelRequested（ESC），呼叫 controller.cancel()",
      );
      bundleRef.current?.controller.cancel().catch((error) => {
        console.error("[voice] ESC 取消失敗", error);
      });
    });

    // 上報給主程序的最近一次狀態，避免輪詢期間重複傳送同一狀態。
    const unsubscribeShortcutHelp = window.voiceAI.onShortcutHelp((payload) => {
      console.log("[voice] 收到 onShortcutHelp");
      showShortcutHelp(payload);
    });
    const unsubscribeShortcutHelpDismiss = window.voiceAI.onShortcutHelpDismiss(
      () => {
        console.log("[voice] 收到 onShortcutHelpDismiss");
        hideShortcutHelp({ reportIdle: true });
      },
    );

    let lastReportedState: RecordingState | undefined;
    let lastReportedReason: VoiceErrorReason | undefined;
    let lastReportedSnapshotRevision = -1;
    let lastReportedRecordingLimitWarning = false;
    let lastReportedBusyHintVisible = false;
    let lastSoundState: RecordingState | undefined;
    let lastNetworkWarningVisible = false;
    let lastRecordingLimitWarningSoundVisible = false;
    let lastHintedListeningMode: RecordingMode | undefined;
    let modeHintTimer: number | undefined;

    const hideModeHint = (): void => {
      if (modeHintTimer) {
        window.clearTimeout(modeHintTimer);
        modeHintTimer = undefined;
      }
      showModeHintRef.current = false;
      setShowModeHint(false);
    };

    const showModeHintFor = (_mode: RecordingMode): void => {
      if (modeHintTimer) {
        window.clearTimeout(modeHintTimer);
      }
      showModeHintRef.current = true;
      setShowModeHint(true);
      modeHintTimer = window.setTimeout(() => {
        hideModeHint();
      }, MODE_HINT_VISIBLE_MS);
    };

    const pollHandle = window.setInterval(() => {
      if (!bundle) {
        return;
      }
      const now = Date.now();
      const snapshot = bundle.controller.getSnapshot();
      const pendingStartMode = pendingStartModeRef.current;
      const pendingStartStartedAt = pendingStartStartedAtRef.current;
      const pendingStartDisplayState = pendingStartDisplayStateRef.current;
      const pendingStartKind = pendingStartKindRef.current;
      const snapshotRevision = bundle.controller.getSnapshotRevision();
      const pendingStartElapsedMs =
        pendingStartStartedAt === undefined
          ? Number.POSITIVE_INFINITY
          : now - pendingStartStartedAt;
      let shouldHoldStopThinking =
        pendingStartKind === "stop" &&
        pendingStartMode !== undefined &&
        pendingStartStartedAt !== undefined &&
        (pendingStartElapsedMs < MIN_START_LOADING_MS ||
          snapshot.state === "listening" ||
          (snapshot.state === "error" &&
            snapshot.reason === "transcription" &&
            networkErrorVisibleRef.current &&
            !networkErrorDismissedRef.current));
      let shouldHoldStartLoading =
        pendingStartMode !== undefined &&
        pendingStartStartedAt !== undefined &&
        pendingStartElapsedMs < MIN_START_LOADING_MS &&
        (pendingStartKind === "retry" ||
          (snapshot.state === "error" &&
            snapshot.reason === "transcription" &&
            networkErrorVisibleRef.current &&
            !networkErrorDismissedRef.current));
      let displayedState: RecordingState = resultRef.current
        ? "result"
        : shouldHoldStopThinking || shouldHoldStartLoading
          ? pendingStartDisplayState
        : networkErrorVisibleRef.current && !networkErrorDismissedRef.current
          ? "error"
          : networkErrorDismissedRef.current &&
              snapshot.state === "error" &&
              snapshot.reason === "transcription"
            ? "idle"
            : pendingStartKind === "start" &&
                pendingStartMode &&
                (snapshot.state === "idle" || snapshot.state === "success")
              ? "listening"
            : snapshot.state;
      const displayedMode =
        displayedState === "result" ? undefined : (snapshot.mode ?? pendingStartMode);
      const thinkingVisible =
        displayedState === "processing" || displayedState === "inserting";
      let thinkingTimedOut = false;
      if (thinkingVisible) {
        if (thinkingStartedAtRef.current === undefined) {
          thinkingStartedAtRef.current = now;
          thinkingTimeoutFiredRef.current = false;
        } else if (
          !thinkingTimeoutFiredRef.current &&
          now - thinkingStartedAtRef.current >= THINKING_TIMEOUT_MS
        ) {
          thinkingTimeoutFiredRef.current = true;
          thinkingStartedAtRef.current = undefined;
          thinkingTimedOut = true;
          pendingStartModeRef.current = undefined;
          pendingStartStartedAtRef.current = undefined;
          shouldHoldStopThinking = false;
          shouldHoldStartLoading = false;
          networkErrorVisibleRef.current = true;
          networkErrorDismissedRef.current = false;
          setNetworkErrorDismissed(false);
          hideBusyHint();
          displayedState = "error";
          console.warn("[voice] 思考超过 10s，自动关闭连接并显示重试");
          bundle.controller.cancel().catch((error) => {
            console.error("[voice] 思考超时后关闭连接失败", error);
          });
        }
      } else {
        resetThinkingTimeout();
      }
      if (
        !shouldHoldStopThinking &&
        !shouldHoldStartLoading &&
        snapshot.state !== "idle" &&
        snapshot.state !== "success"
      ) {
        pendingStartModeRef.current = undefined;
        pendingStartStartedAtRef.current = undefined;
      }
      if (displayedState !== "idle" && displayedState !== "success") {
        hideShortcutHelp();
      }
      if (displayedMode) {
        lastRecordingModeRef.current = displayedMode;
      }
      if (snapshot.state !== "error" || snapshot.reason !== "transcription") {
        if (!networkErrorVisibleRef.current) {
          setReason((current) =>
            current === "transcription" ? undefined : current,
          );
        }
        networkErrorDismissedRef.current = false;
        setNetworkErrorDismissed(false);
      }
      if (displayedState === "listening" && displayedMode) {
        if (lastHintedListeningMode !== displayedMode) {
          lastHintedListeningMode = displayedMode;
          showModeHintFor(displayedMode);
        }
      } else {
        lastHintedListeningMode = undefined;
        hideModeHint();
      }
      if (snapshot.state !== "processing" && snapshot.state !== "inserting") {
        hideBusyHint();
      }
      setState((current) => {
        if (current === displayedState) {
          return current;
        }
        console.log(`[voice] 狀態變更 ${current} -> ${displayedState}`);
        return displayedState;
      });
      const nextReason =
        (shouldHoldStopThinking || shouldHoldStartLoading) && !thinkingTimedOut
        ? undefined
        : networkErrorVisibleRef.current
        ? "transcription"
        : displayedState === "result"
          ? undefined
          : snapshot.reason;
      setReason((current) => {
        if (current === nextReason) {
          return current;
        }
        console.log(
          `[voice] 錯誤原因變更 ${current ?? "無"} -> ${nextReason ?? "無"}`,
        );
        return nextReason;
      });
      // 僅在展示狀態真正變化時上報給 main，避免每 120ms 一次 IPC 噪音。
      const nextMode = displayedMode;
      setActiveMode((current) => (current === nextMode ? current : nextMode));
      const nextRecordingRemainingSeconds =
        snapshot.state === "listening"
          ? bundle.controller.getRecordingRemainingSeconds()
          : undefined;
      const recordingLimitWarningVisible =
        displayedState === "listening" &&
        nextRecordingRemainingSeconds !== undefined &&
        nextRecordingRemainingSeconds <= RECORDING_LIMIT_WARNING_SECONDS &&
        !recordingLimitWarningDismissedRef.current;
      if (
        displayedState !== "listening" ||
        nextRecordingRemainingSeconds === undefined ||
        nextRecordingRemainingSeconds > RECORDING_LIMIT_WARNING_SECONDS
      ) {
        resetRecordingLimitWarningDismissed();
      }
      setRecordingRemainingSeconds((current) =>
        current === nextRecordingRemainingSeconds
          ? current
          : nextRecordingRemainingSeconds,
      );
      const networkWarningVisible =
        networkErrorVisibleRef.current &&
        !networkErrorDismissedRef.current &&
        displayedState === "error";
      const busyHintVisible =
        showBusyHintRef.current &&
        (displayedState === "processing" || displayedState === "inserting");
      if (networkWarningVisible && !lastNetworkWarningVisible) {
        playWarningInteractionSound(bundle.audio);
      }
      lastNetworkWarningVisible = networkWarningVisible;
      if (
        recordingLimitWarningVisible &&
        !lastRecordingLimitWarningSoundVisible
      ) {
        playWarningInteractionSound(bundle.audio);
      }
      lastRecordingLimitWarningSoundVisible = recordingLimitWarningVisible;
      if (!networkWarningVisible && lastSoundState !== displayedState) {
        playInteractionSoundForState(displayedState, bundle.audio);
        lastSoundState = displayedState;
      }
      if (
        lastReportedState !== displayedState ||
        lastReportedReason !== nextReason ||
        lastReportedSnapshotRevision !== snapshotRevision ||
        lastReportedRecordingLimitWarning !== recordingLimitWarningVisible ||
        lastReportedBusyHintVisible !== busyHintVisible
      ) {
        console.log(
          `[voice] 上報托盤狀態 ${lastReportedState ?? "初始"} -> ${displayedState}`,
        );
        window.voiceAI.reportRecordingState({
          state: displayedState,
          mode: displayedMode,
          ...(nextReason !== undefined ? { reason: nextReason } : {}),
          recordingLimitWarning: recordingLimitWarningVisible,
          busyHintVisible,
        });
        lastReportedState = displayedState;
        lastReportedReason = nextReason;
        lastReportedSnapshotRevision = snapshotRevision;
        lastReportedRecordingLimitWarning = recordingLimitWarningVisible;
        lastReportedBusyHintVisible = busyHintVisible;
      }

      // 電平：僅 listening 狀態下顯示即時音量，其他狀態強制歸零，避免殘影。
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
      if (modeHintTimer) {
        window.clearTimeout(modeHintTimer);
      }
      if (busyHintTimerRef.current) {
        window.clearTimeout(busyHintTimerRef.current);
        busyHintTimerRef.current = undefined;
      }
      bundle?.dispose();
      bundleRef.current = undefined;
    };
  }, [settingsRevision]);

  return (
    <OverlayWindow
      state={state}
      {...(shortcutHelp !== undefined ? { shortcutHelp } : {})}
      {...(result !== undefined ? { result } : {})}
      level={level}
      {...(recordingRemainingSeconds !== undefined &&
      recordingRemainingSeconds <= RECORDING_LIMIT_WARNING_SECONDS &&
      !recordingLimitWarningDismissed
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
      {...(initError !== undefined ? { error: initError } : {})}
      onCancel={() => {
        console.log("[voice] 使用者點選 × 取消");
        if (networkErrorVisibleRef.current) {
          networkErrorVisibleRef.current = false;
          networkErrorDismissedRef.current = true;
          pendingStartModeRef.current = undefined;
          pendingStartStartedAtRef.current = undefined;
          setNetworkErrorDismissed(true);
          setReason(undefined);
        }
        // controller 可能尚未初始化（bootstrap 中），此時靜默忽略即可。
        // 注意沒有 bundle 的閉包引用，因為此回撥在 effect 中定義會造成近更難讀，
        // 因此直接通過 window 全域性介面上報狀態不適用；改為從 React 模組作用域共享的 bundleRef 讀取。
        hideBusyHint();
        bundleRef.current?.controller.cancel().catch((error) => {
          console.error("[voice] cancel 失敗", error);
        });
      }}
      onConfirm={() => {
        console.log("[voice] 使用者點選 ✓ 確認");
        bundleRef.current?.controller.confirm().catch((error) => {
          console.error("[voice] confirm 失敗", error);
        });
      }}
      onUndoCancel={() => {
        console.log("[voice] 使用者撤銷取消");
        bundleRef.current?.controller.undoCancel().catch((error) => {
          console.error("[voice] undoCancel 失敗", error);
        });
      }}
      onDismissBusyHint={hideBusyHint}
      onDismissRecordingLimitWarning={dismissRecordingLimitWarning}
      onDismissResult={dismissResult}
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
  postprocessMode: PostprocessRequest["mode"];
  postprocessStyle: PostprocessRequest["style"];
  targetLanguage: "zh-CN" | "en-US";
  audio: AppSettings["audio"];
  onPostprocessResult(event: VoicePostprocessResultEvent): void;
  onClearResult(): void;
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
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
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
    console.warn("[voice] 交互提示音播放失敗（已忽略）", error);
  }
}

function buildController(input: BuildControllerInput): ControllerBundle {
  const workletUrl = createVoiceRecorderWorkletUrl();

  const recorder = createRecorderService({
    adapter: createBrowserRecorderAdapter({
      mediaDevices: navigator.mediaDevices,
      AudioContextConstructor: AudioContext,
      workletUrl,
    }),
  });

  let voiceServices: {
    transcriptionProvider: TranscriptionProvider;
    postProcessService: PostProcessService;
  };
  const voiceService = selectVoiceService({
    developerEnabled: input.developerEnabled,
    developerWsUrl: input.developerWsUrl,
    javaVoiceWsUrl: input.javaVoiceWsUrl,
  });
  if (voiceService.kind === "developer") {
    console.log("[voice] controller using developer ASR/LLM flow");
    voiceServices = {
      transcriptionProvider: createConfiguredTranscriptionProvider(),
      postProcessService: createPostProcessService({
        backendClient: {
          postprocess: (request): Promise<PostprocessResult> =>
            window.voiceAI.postprocess(request),
        },
      }),
    };
  } else {
    if (voiceService.reason === "developer-unified-endpoint") {
      console.warn(
        `[voice] developer WS URL is a Java voice gateway; using session_start protocol url=${voiceService.url}`,
      );
    }
    console.log(
      `[voice] controller using Java voice gateway url=${voiceService.url}`,
    );
    voiceServices = createJavaVoiceSessionProvider({ url: voiceService.url });
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
        throw new Error(result.message ?? "insert failed");
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
    transcriptionProvider: voiceServices.transcriptionProvider,
    postProcessService: voiceServices.postProcessService,
    textTarget,
    settings: {
      installationId: input.installationId,
      language: input.language,
      sampleRate: 16000,
      inputDeviceId: input.inputDeviceId,
      postprocessMode: input.postprocessMode,
      postprocessStyle: input.postprocessStyle,
      targetLanguage: input.targetLanguage,
      dictionaryTerms,
    },
    getAppContext: () => window.voiceAI.getActiveWindow(),
    onPostprocessResult: input.onPostprocessResult,
    finalResultBehavior: voiceService.kind === "developer"
      ? "client_postprocess"
      : "respect_service_action",
    onTranscriptionUnavailable: input.onTranscriptionUnavailable,
    onHistoryRecord: (historyInput) => {
      if (!input.saveHistory) {
        return;
      }
      void window.voiceAI.createHistoryRecord(historyInput).catch((error) => {
        console.warn("[voice] 儲存歷史記錄失敗（已忽略）", error);
      });
    },
  });

  const unsubscribeToggle = window.voiceAI.onToggleRecording(({ mode }) => {
    console.log(`[voice] 收到 onToggleRecording，mode=${mode}`);
    const snapshot = controller.getSnapshot();
    const pendingStartMode = input.getPendingStartMode();
    if (
      pendingStartMode &&
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
      input.onToggleAccepted(mode);
      void controller.handleToggle(mode);
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
    void controller.handleToggle(mode);
  });

  // 訂閱 recorder 幀事件，快取最近 RMS 供 UI 輪詢讀取。
  // recorder 已被 controller 內部訂閱（轉給 transcription），這裡是第二個訂閱者，互不干擾。
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
