import type { TranscriptionProvider } from "@voice/ai";
import type {
  AppContext,
  DictionaryTermContext,
  PostprocessMode,
  PostprocessResult,
} from "@voice/backend-client";
import type {
  AudioFrame,
  RecordingLanguage,
  RecordingMode,
} from "@voice/shared";
import type {
  RecordingSnapshot,
  VoiceErrorReason,
} from "../recorder/recordingStateMachine";
import { createRecordingStateMachine } from "../recorder/recordingStateMachine";
import {
  DEFAULT_RECORDER_MAX_DURATION_SECONDS,
  type RecorderService,
} from "../recorder/recorderService";
import type {
  CreateHistoryRecordInput,
  HistoryRecordStatus,
} from "@voice/shared";

const MAX_PENDING_TRANSCRIPTION_FRAMES = 30;
const RECORDING_LIMIT_TIMER_FUZZ_MS = 25;

export interface VoiceOperationSettings {
  installationId: string;
  language: RecordingLanguage;
  sampleRate: 16000;
  maxDurationSeconds?: number;
  inputDeviceId: string;
  postprocessMode: PostprocessMode;
  targetLanguage: "zh-CN" | "en-US";
  dictionaryTerms: DictionaryTermContext[];
}

export interface VoiceTextTarget {
  getSelectedText(): Promise<string>;
  insertText(text: string): Promise<void>;
  replaceSelection(text: string, expectedSelectedText?: string): Promise<void>;
}

export interface CreateVoiceOperationControllerOptions {
  recorder: RecorderService;
  transcriptionProvider: TranscriptionProvider;
  textTarget: VoiceTextTarget;
  settings: VoiceOperationSettings;
  getAppContext(): Promise<AppContext>;
  onPostprocessResult?(event: VoicePostprocessResultEvent): void;
  onCancel?(mode: RecordingMode): void;
  onTranscriptionUnavailable?(): void;
  onHistoryRecord?(input: CreateHistoryRecordInput): void;
  now?(): Date;
}

export interface VoicePostprocessResultEvent {
  mode: "processSelection";
  rawText: string;
  selectedText: string;
  result: PostprocessResult;
}

export interface VoiceOperationController {
  getSnapshot(): RecordingSnapshot;
  getSnapshotRevision(): number;
  getRecordingRemainingSeconds(): number | undefined;
  handleToggle(
    mode: RecordingMode,
    options?: { selectedText?: string; previewSelectedText?: string },
  ): Promise<void>;
  /** 使用者主動取消（懸浮窗左側 × 按鈕）：在 listening/processing/inserting/error 下拆掉會話並重置狀態機。 */
  cancel(): Promise<void>;
  /** 使用者主動確認（懸浮窗右側 ✓ 按鈕）：僅在 listening 下按當前 mode 的完整流程收尾。 */
  confirm(): Promise<void>;
  retryTranscription(): Promise<boolean>;
  undoCancel(): Promise<void>;
  dispose(): void;
}

interface ActiveSession {
  mode: RecordingMode;
  selectedText: string;
  previewSelectedText?: string;
  startedAt: string;
  startedAtMs: number;
  audioFrames: Int16Array[];
  recordedTranscriptionFrames: AudioFrame[];
  pendingTranscriptionFrames: AudioFrame[];
  transcriptionReady: boolean;
  transcriptionUnavailable: boolean;
}

export function createVoiceOperationController(
  options: CreateVoiceOperationControllerOptions,
): VoiceOperationController {
  const machine = createRecordingStateMachine();
  let activeSession: ActiveSession | undefined;
  let finalTranscript = "";
  let finalPostprocessResult: PostprocessResult | undefined;
  let snapshotRevision = 0;
  /**
   * 啟動進行中的標記：在 startSession 的兩個 await（recorder.start / provider.start）
   * 跑完之前保持為 true。
   */
  let starting = false;
  /**
   * 啟動期間使用者主動取消時：
   * - 若已經開始開麥，立刻停麥並重置 UI（requestAbortDuringStart）
   * - provider 側仍等啟動收尾後再 cancel，避免 WS 未 open 就 send finished 幀。
   */
  let pendingCancelAfterStart = false;
  /**
   * 啟動期間再次按收尾快捷鍵時，不應取消會話。等 provider ready 後正常 stop，
   * 否則 Java WS 慢連時普通語音輸入會被第二次 RightAlt 誤取消。
   */
  let pendingStopAfterStart = false;
  /** 啟動階段是否已經開始開啟麥克風。 */
  let recorderStartRequested = false;
  const getNow = options.now ?? (() => new Date());
  const recordingMaxDurationSeconds = Math.max(
    1,
    options.settings.maxDurationSeconds ??
      DEFAULT_RECORDER_MAX_DURATION_SECONDS,
  );
  let recordingLimitTimer: ReturnType<typeof setTimeout> | undefined;

  const getTranscriptionStatus = (
    session: ActiveSession,
  ): NonNullable<RecordingSnapshot["transcriptionStatus"]> => {
    if (session.transcriptionUnavailable) {
      return "unavailable";
    }
    return session.transcriptionReady ? "ready" : "starting";
  };

  const updateTranscriptionStatus = (
    session: ActiveSession,
    update: { ready?: boolean; unavailable?: boolean },
  ): void => {
    const previous = getTranscriptionStatus(session);
    if (update.ready !== undefined) {
      session.transcriptionReady = update.ready;
    }
    if (update.unavailable !== undefined) {
      session.transcriptionUnavailable = update.unavailable;
    }
    if (activeSession === session && previous !== getTranscriptionStatus(session)) {
      snapshotRevision += 1;
    }
  };

  const markTranscriptionUnavailable = (session: ActiveSession): void => {
    updateTranscriptionStatus(session, { unavailable: true });
    options.onTranscriptionUnavailable?.();
  };

  const getSnapshot = (): RecordingSnapshot => {
    const snapshot = machine.getSnapshot();
    if (snapshot.state !== "listening" || !activeSession) {
      return snapshot;
    }
    return {
      ...snapshot,
      transcriptionStatus: getTranscriptionStatus(activeSession),
    };
  };

  const clearRecordingLimitTimer = (): void => {
    if (!recordingLimitTimer) {
      return;
    }
    clearTimeout(recordingLimitTimer);
    recordingLimitTimer = undefined;
  };

  const getRecordingRemainingSeconds = (): number | undefined => {
    if (machine.getSnapshot().state !== "listening" || !activeSession) {
      return undefined;
    }

    const elapsedMs = Math.max(
      0,
      getNow().getTime() - activeSession.startedAtMs,
    );
    const remainingMs = recordingMaxDurationSeconds * 1000 - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  };

  const scheduleRecordingLimitTimer = (session: ActiveSession): void => {
    clearRecordingLimitTimer();
    const elapsedMs = Math.max(0, getNow().getTime() - session.startedAtMs);
    const remainingMs = Math.max(
      0,
      recordingMaxDurationSeconds * 1000 - elapsedMs,
    );
    recordingLimitTimer = setTimeout(() => {
      recordingLimitTimer = undefined;
      if (
        activeSession !== session ||
        machine.getSnapshot().state !== "listening"
      ) {
        return;
      }
      console.log(
        "[voice] recording limit reached; stopping session automatically",
      );
      void stopSession().catch((error) => {
        console.error("[voice] automatic recording stop failed", error);
      });
    }, remainingMs + RECORDING_LIMIT_TIMER_FUZZ_MS);
  };

  const requestAbortDuringStart = (
    abortOptions: { preserveCurrentError?: boolean } = {},
  ): void => {
    console.warn("[voice] 啟動進行中，標記 pendingCancel");
    pendingCancelAfterStart = true;
    pendingStopAfterStart = false;
    clearRecordingLimitTimer();
    if (recorderStartRequested) {
      void options.recorder.cancel().catch((error) => {
        console.warn("[voice] 啟動期間立刻停麥失敗（忽略）", error);
      });
    }
    void options.transcriptionProvider.cancel().catch((error) => {
      console.warn("[voice] cancel transcription during start failed", error);
    });
    if (
      abortOptions.preserveCurrentError === true &&
      machine.getSnapshot().state === "error"
    ) {
      return;
    }
    machine.send({ type: "reset" });
  };

  const fail = (reason: VoiceErrorReason): void => {
    console.warn(`[voice] 失敗原因=${reason}`);
    clearRecordingLimitTimer();
    machine.send({ type: "fail", reason });
    snapshotRevision += 1;
  };

  const unsubscribeRecorder = options.recorder.subscribe((event) => {
    if (event.type === "frame") {
      activeSession?.audioFrames.push(new Int16Array(event.frame.pcm));
      activeSession?.recordedTranscriptionFrames.push({
        ...event.frame,
        pcm: new Int16Array(event.frame.pcm),
      });
      const session = activeSession;
      if (!session) {
        return;
      }
      if (!session.transcriptionReady) {
        if (
          session.pendingTranscriptionFrames.length <
          MAX_PENDING_TRANSCRIPTION_FRAMES
        ) {
          session.pendingTranscriptionFrames.push(event.frame);
        }
        return;
      }
      try {
        options.transcriptionProvider.sendAudio(event.frame);
      } catch (error) {
        console.warn("[voice] 发送音频到转写服务失败，录音保持进行中", error);
        markTranscriptionUnavailable(session);
      }
      return;
    }

    if (event.type === "error") {
      console.error("[voice] 錄音器錯誤", event);
      fail("mic");
      activeSession = undefined;
      void options.transcriptionProvider.cancel();
    }
  });

  const unsubscribeTranscription = options.transcriptionProvider.subscribe(
    (event) => {
      if (event.type === "final") {
        finalTranscript = event.text;
        finalPostprocessResult = event.result;
        console.log("[voice] 轉寫最終文本：", finalTranscript);
        return;
      }

      if (event.type === "error") {
        console.error("[voice] 轉寫錯誤", event);
        if (activeSession && machine.getSnapshot().state === "listening") {
          markTranscriptionUnavailable(activeSession);
          return;
        }
        fail("transcription");
        void (async () => {
          await options.recorder.cancel();
          await options.transcriptionProvider.cancel();
        })().catch((error) => {
          console.warn("[voice] 轉寫錯誤後清理會話失敗（已忽略）", error);
        });
      }
    },
  );

  const startTranscriptionForSession = async (
    session: ActiveSession,
    optionsOverride: { replayRecordedFrames?: boolean } = {},
  ): Promise<boolean> => {
    updateTranscriptionStatus(session, { ready: false, unavailable: false });
    try {
      const appContext = await options.getAppContext();
      if (activeSession !== session || pendingCancelAfterStart) {
        return false;
      }
      await options.transcriptionProvider.start({
        installationId: options.settings.installationId,
        language: options.settings.language,
        sampleRate: options.settings.sampleRate,
        mode: session.mode,
        selectedText: session.previewSelectedText ?? session.selectedText,
        targetLanguage: options.settings.targetLanguage,
        postprocessMode: resolveSessionPostprocessMode(options, session),
        appContext,
      });
      if (activeSession !== session) {
        return false;
      }
      updateTranscriptionStatus(session, { ready: true, unavailable: false });
      try {
        const framesToSend = optionsOverride.replayRecordedFrames
          ? session.recordedTranscriptionFrames
          : session.pendingTranscriptionFrames;
        for (const frame of framesToSend) {
          options.transcriptionProvider.sendAudio(frame);
        }
      } catch (sendError) {
        console.warn(
          "[voice] 发送缓存音频到转写服务失败，录音保持进行中",
          sendError,
        );
        markTranscriptionUnavailable(session);
        return false;
      } finally {
        session.pendingTranscriptionFrames = [];
      }
      return true;
    } catch (error) {
      console.error("[voice] 轉寫啟動失敗", error);
      if (activeSession === session) {
        updateTranscriptionStatus(session, { ready: false });
        markTranscriptionUnavailable(session);
      }
      return false;
    }
  };

  const startSession = async (
    mode: RecordingMode,
    startOptions: { selectedText?: string; previewSelectedText?: string } = {},
  ): Promise<void> => {
    console.log(`[voice] 開始會話 mode=${mode}`);
    let selectedText = "";
    if (mode === "processSelection") {
      selectedText =
        startOptions.selectedText ?? (await options.textTarget.getSelectedText());
      console.log(
        `[voice] processSelection 選中文本長度=${selectedText.length}`,
      );
      if (
        !selectedText.trim() &&
        !startOptions.previewSelectedText?.trim()
      ) {
        console.warn("[voice] processSelection 無選中文本，取消啟動");
        fail("no_selection");
        return;
      }
    }

    const startedAt = getNow();
    activeSession = {
      mode,
      selectedText,
      ...(startOptions.previewSelectedText !== undefined
        ? { previewSelectedText: startOptions.previewSelectedText }
        : {}),
      startedAt: startedAt.toISOString(),
      startedAtMs: startedAt.getTime(),
      audioFrames: [],
      recordedTranscriptionFrames: [],
      pendingTranscriptionFrames: [],
      transcriptionReady: false,
      transcriptionUnavailable: false,
    };
    finalTranscript = "";
    finalPostprocessResult = undefined;
    machine.send({ type: "start", mode });
    starting = true;
    recorderStartRequested = false;

    let stage: "recorder" | "transcription" = "recorder";
    let recorderStarted = false;
    let transcriptionStarted = false;
    let shouldCancelAfterStart = false;
    let shouldStopAfterStart = false;
    let keepSessionForRetry = false;
    try {
      stage = "recorder";
      recorderStartRequested = true;
      await options.recorder.start({
        sampleRate: options.settings.sampleRate,
        inputDeviceId: options.settings.inputDeviceId,
        ...(options.settings.maxDurationSeconds !== undefined
          ? { maxDurationSeconds: options.settings.maxDurationSeconds }
          : {}),
      });
      recorderStarted = true;
      if (pendingCancelAfterStart) {
        console.log("[voice] 使用者已在錄音器啟動期間取消，跳過啟動成功收尾");
      } else {
        stage = "transcription";
        transcriptionStarted = await startTranscriptionForSession(activeSession);
        if (!transcriptionStarted) {
          throw new Error("Transcription session is unavailable");
        }
      }

      if (pendingCancelAfterStart) {
        console.log("[voice] 使用者已在轉寫啟動期間取消，跳過啟動成功收尾");
      } else if (activeSession) {
        scheduleRecordingLimitTimer(activeSession);
        console.log("[voice] 會話啟動完成：錄音器已就緒");
      }
    } catch (error) {
      console.error(`[voice] 會話啟動失敗 stage=${stage}`, error);
      const cancelledDuringStart = pendingCancelAfterStart;
      clearRecordingLimitTimer();
      keepSessionForRetry =
        stage === "transcription" && activeSession !== undefined;
      // recorder 啟動失敗或啟動後流程失敗時需關麥，避免麥克風一直佔用。
      if (recorderStarted || stage === "recorder") {
        try {
          await options.recorder.cancel();
        } catch (cancelError) {
          console.warn(
            "[voice] 啟動失敗後取消 recorder 也報錯（忽略）",
            cancelError,
          );
        }
      }
      if (transcriptionStarted || cancelledDuringStart) {
        try {
          await options.transcriptionProvider.cancel();
        } catch (cancelError) {
          console.warn(
            "[voice] 啟動失敗後取消 transcription 也報錯（忽略）",
            cancelError,
          );
        }
      }
      if (cancelledDuringStart) {
        activeSession = undefined;
        machine.send({ type: "reset" });
        snapshotRevision += 1;
        return;
      }
      if (!keepSessionForRetry) {
        activeSession = undefined;
      }
      fail(stage === "recorder" ? "mic" : stageToReason(stage));
      // 啟動失敗時已經把狀態機推到 error，pendingCancelAfterStart 無意義，清掉。
      pendingCancelAfterStart = false;
      throw error;
    } finally {
      shouldCancelAfterStart = pendingCancelAfterStart;
      shouldStopAfterStart = pendingStopAfterStart;
      starting = false;
      recorderStartRequested = false;
      pendingCancelAfterStart = false;
      pendingStopAfterStart = false;
    }
    if (shouldCancelAfterStart) {
      console.log("[voice] 啟動完成後發現 pendingCancel，立即取消會話");
      await cancelSession();
      return;
    }
    if (
      shouldStopAfterStart &&
      activeSession &&
      machine.getSnapshot().state === "listening"
    ) {
      console.log("[voice] 啟動完成後發現 pendingStop，立即停止會話");
      await stopSession();
    }
  };

  const stopSession = async (): Promise<void> => {
    const session = activeSession;
    if (!session) {
      console.log("[voice] 停止會話：當前無活動會話，忽略");
      return;
    }

    console.log(`[voice] 停止會話 mode=${session.mode}`);
    clearRecordingLimitTimer();
    machine.send({ type: "stop" });

    let stage: "recorder" | "transcription" | "postprocess" | "insertion" =
      "recorder";
    let keepSessionForRetry = false;
    try {
      await options.recorder.stop();
      if (activeSession !== session) {
        console.warn(
          "[voice] 停止會話：會話已被取消（recorder 階段後），靜默退出",
        );
        return;
      }
      console.log("[voice] 停止會話：錄音階段完成");
      stage = "transcription";
      if (session.transcriptionUnavailable) {
        throw new Error("Transcription session is unavailable");
      }
      await options.transcriptionProvider.stop();
      if (activeSession !== session) {
        console.warn(
          "[voice] 停止會話：會話已被取消（transcription 階段後），靜默退出",
        );
        return;
      }
      console.log("[voice] 停止會話：轉寫階段完成");
      machine.send({ type: "insert" });
      stage = session.mode === "direct" ? "insertion" : "postprocess";
      const finalText = await applyFinalText(
        options,
        session,
        finalTranscript,
        finalPostprocessResult,
        (nextStage) => {
          console.log(`[voice] 停止會話：進入階段=${nextStage}`);
          stage = nextStage;
        },
      );
      if (activeSession !== session) {
        console.warn(
          "[voice] 停止會話：會話已被取消（applyFinalText 後），靜默退出",
        );
        return;
      }
      machine.send({ type: "success" });
      emitHistoryRecord(options, session, {
        status: finalTranscript.trim() ? "completed" : "no_audio",
        transcript: finalTranscript,
        finalText,
        endedAt: getNow(),
      });
      console.log("[voice] 停止會話：整體成功");
    } catch (error) {
      if (activeSession !== session) {
        console.warn(
          `[voice] 停止會話：會話已被取消，忽略階段=${stage} 的異常`,
          error,
        );
        return;
      }
      console.error(`[voice] 停止會話在階段=${stage} 失敗`, error);
      keepSessionForRetry = stage === "transcription";
      fail(stageToReason(stage));
      throw error;
    } finally {
      if (activeSession === session && !keepSessionForRetry) {
        activeSession = undefined;
        finalTranscript = "";
        finalPostprocessResult = undefined;
      }
    }
  };

  const cancelSession = async (): Promise<void> => {
    const mode = activeSession?.mode;
    const session = activeSession;
    clearRecordingLimitTimer();
    console.log(`[voice] 取消會話（原 mode=${mode ?? "無"}）`);
    // 先切斷會話引用，這樣正在併發執行的 stopSession 恢復時會通過 activeSession !== session 判定靜默退出。
    activeSession = undefined;
    finalTranscript = "";
    finalPostprocessResult = undefined;
    try {
      if (options.recorder.getState() === "listening") {
        await options.recorder.cancel();
      }
    } catch (error) {
      console.warn(
        "[voice] recorder.cancel 異常（已忽略，繼續走 reset）",
        error,
      );
    }
    try {
      await options.transcriptionProvider.cancel();
    } catch (error) {
      console.warn(
        "[voice] transcription.cancel 異常（已忽略，繼續走 reset）",
        error,
      );
    }
    machine.send({ type: "reset" });

    if (mode) {
      options.onCancel?.(mode);
    }
    if (session) {
      emitHistoryRecord(options, session, {
        status: "cancelled",
        transcript: finalTranscript,
        finalText: "",
        endedAt: getNow(),
      });
    }
  };

  const cancelListeningSession = async (): Promise<void> => {
    const session = activeSession;
    if (!session) {
      await cancelSession();
      return;
    }

    clearRecordingLimitTimer();

    console.log(`[voice] 暫停錄音並進入已取消狀態 mode=${session.mode}`);
    try {
      if (options.recorder.getState() === "listening") {
        await options.recorder.stop();
      }
    } catch (error) {
      console.warn(
        "[voice] 進入已取消狀態時 recorder.stop 失敗，改走完整取消",
        error,
      );
      await cancelSession();
      return;
    }

    machine.send({ type: "cancel" });
    options.onCancel?.(session.mode);
  };

  return {
    getSnapshot,
    getSnapshotRevision: () => snapshotRevision,
    getRecordingRemainingSeconds,
    handleToggle: async (mode, handleOptions = {}) => {
      const snapshot = machine.getSnapshot();
      console.log(
        `[voice] handleToggle：收到 mode=${mode} 當前狀態=${snapshot.state} starting=${starting}`,
      );

      // 啟動進行中：立刻停麥並重置 UI；provider 側等 finally 裡 cancelSession。
      if (starting) {
        if (snapshot.state === "error") {
          console.warn("[voice] handleToggle：啟動中且錯誤提示已顯示，忽略重複觸發");
          return;
        }
        if (activeSession) {
          if (mode === "direct" || mode === activeSession.mode) {
            pendingStopAfterStart = true;
            console.log(
              `[voice] handleToggle：啟動中收到收尾觸發 mode=${mode} active=${activeSession.mode}，等待啟動完成後停止`,
            );
            return;
          }
          console.log(
            `[voice] handleToggle：啟動中忽略非當前模式 mode=${mode} active=${activeSession.mode}`,
          );
          return;
        }
        requestAbortDuringStart({ preserveCurrentError: true });
        return;
      }

      if (
        snapshot.state === "idle" ||
        snapshot.state === "error" ||
        snapshot.state === "success"
      ) {
        try {
          await startSession(mode, handleOptions);
        } catch (error) {
          // startSession 的失敗已經通過 fail() 推到 error 狀態，這裡只是兜底阻止 unhandled rejection。
          console.warn("[voice] handleToggle：startSession 拋錯已吞下", error);
        }
        return;
      }

      if (snapshot.state === "canceled") {
        await cancelSession();
        return;
      }

      if (snapshot.state === "listening") {
        if (mode !== "direct" && mode !== snapshot.mode) {
          console.log(
            `[voice] handleToggle：忽略非當前模式收尾 mode=${mode} active=${snapshot.mode ?? "none"}`,
          );
          return;
        }
        await stopSession();
        return;
      }

      // processing / inserting 階段錄音已經停止，若卡在 ASR / 後處理 / 插入的 await，
      // 使用者再次按 Right ALT 必須能把狀態機強制推回 idle，否則整個應用無法恢復。
      if (snapshot.state === "processing" || snapshot.state === "inserting") {
        console.warn(
          `[voice] handleToggle：${snapshot.state} 階段再次觸發，強制取消以保證閉環`,
        );
        await cancelSession();
      }
    },
    cancel: async () => {
      const current = machine.getSnapshot().state;
      console.log(`[voice] cancel：當前狀態=${current} starting=${starting}`);
      if (starting) {
        requestAbortDuringStart();
        return;
      }
      if (current === "idle" || current === "success") {
        // 已經是空閒/已完成。不做事，由上層決定是否隱藏視窗。
        return;
      }
      if (current === "listening") {
        await cancelListeningSession();
        return;
      }
      await cancelSession();
    },
    confirm: async () => {
      const current = machine.getSnapshot().state;
      console.log(`[voice] confirm：當前狀態=${current}`);
      if (starting && activeSession) {
        pendingStopAfterStart = true;
        console.log("[voice] confirm：啟動中，等待啟動完成後停止");
        return;
      }
      if (current !== "listening") {
        // 僅在錄音進行中響應確認；其他狀態請走取消或快捷鍵重啟。
        return;
      }
      await stopSession();
    },
    retryTranscription: async () => {
      const snapshot = machine.getSnapshot();
      const session = activeSession;
      if (!session) {
        return false;
      }
      if (snapshot.state === "listening") {
        if (session.transcriptionReady && !session.transcriptionUnavailable) {
          return true;
        }
        try {
          await options.transcriptionProvider.cancel();
        } catch (error) {
          console.warn("[voice] 重試前清理舊轉寫會話失敗（忽略）", error);
        }
        return startTranscriptionForSession(session, {
          replayRecordedFrames: true,
        });
      }
      if (snapshot.state !== "error" || snapshot.reason !== "transcription") {
        return false;
      }

      machine.send({ type: "retry", mode: session.mode });
      snapshotRevision += 1;
      finalTranscript = "";
      finalPostprocessResult = undefined;
      updateTranscriptionStatus(session, { ready: false, unavailable: false });
      let stage: "transcription" | "postprocess" | "insertion" =
        "transcription";
      try {
        try {
          await options.transcriptionProvider.cancel();
        } catch (error) {
          console.warn("[voice] 重試前清理舊轉寫會話失敗（忽略）", error);
        }
        const started = await startTranscriptionForSession(session, {
          replayRecordedFrames: true,
        });
        if (!started) {
          throw new Error("Transcription session is unavailable");
        }
        await options.transcriptionProvider.stop();
        machine.send({ type: "insert" });
        stage = session.mode === "direct" ? "insertion" : "postprocess";
        const finalText = await applyFinalText(
          options,
          session,
          finalTranscript,
          finalPostprocessResult,
          (nextStage) => {
            stage = nextStage;
          },
        );
        if (activeSession !== session) {
          return false;
        }
        machine.send({ type: "success" });
        emitHistoryRecord(options, session, {
          status: finalTranscript.trim() ? "completed" : "no_audio",
          transcript: finalTranscript,
          finalText,
          endedAt: getNow(),
        });
        activeSession = undefined;
        finalTranscript = "";
        finalPostprocessResult = undefined;
        return true;
      } catch (error) {
        if (activeSession === session) {
          console.error(`[voice] 重試轉寫在階段=${stage} 失敗`, error);
          fail(stageToReason(stage));
        }
        return false;
      }
    },
    undoCancel: async () => {
      const snapshot = machine.getSnapshot();
      const session = activeSession;
      console.log(`[voice] undoCancel：當前狀態=${snapshot.state}`);
      if (snapshot.state !== "canceled" || !session) {
        return;
      }

      machine.send({ type: "undoCancel" });
      let stage: "transcription" | "postprocess" | "insertion" =
        "transcription";
      try {
        await options.transcriptionProvider.stop();
        if (activeSession !== session) {
          return;
        }
        machine.send({ type: "insert" });
        stage = session.mode === "direct" ? "insertion" : "postprocess";
        const finalText = await applyFinalText(
          options,
          session,
          finalTranscript,
          finalPostprocessResult,
          (nextStage) => {
            stage = nextStage;
          },
        );
        if (activeSession !== session) {
          return;
        }
        machine.send({ type: "success" });
        emitHistoryRecord(options, session, {
          status: finalTranscript.trim() ? "completed" : "no_audio",
          transcript: finalTranscript,
          finalText,
          endedAt: getNow(),
        });
      } catch (error) {
        if (activeSession !== session) {
          return;
        }
        fail(stageToReason(stage));
        throw error;
      } finally {
        if (activeSession === session) {
          activeSession = undefined;
          finalTranscript = "";
          finalPostprocessResult = undefined;
        }
      }
    },
    dispose: () => {
      clearRecordingLimitTimer();
      unsubscribeRecorder();
      unsubscribeTranscription();
    },
  };
}

function stageToReason(
  stage: "recorder" | "transcription" | "postprocess" | "insertion",
): VoiceErrorReason {
  switch (stage) {
    case "recorder":
      return "mic";
    case "transcription":
      return "transcription";
    case "postprocess":
      return "postprocess";
    case "insertion":
      return "insertion";
  }
}

async function applyFinalText(
  options: CreateVoiceOperationControllerOptions,
  session: ActiveSession,
  rawText: string,
  result: PostprocessResult | undefined,
  setStage: (stage: "postprocess" | "insertion") => void,
): Promise<string> {
  if (result) {
    setStage("postprocess");
    console.log(
      `[voice] postprocess result mode=${session.mode} action=${result.action} finalTextLength=${result.finalText.length}`,
    );
    if (!result.finalText.trim()) {
      console.log("[voice] 服務端最終文本為空，跳過插入與展示");
      return "";
    }
    if (
      session.mode === "processSelection" &&
      session.previewSelectedText !== undefined
    ) {
      if (!options.onPostprocessResult) {
        return result.finalText;
      }
      options.onPostprocessResult({
        mode: "processSelection",
        rawText,
        selectedText: session.previewSelectedText,
        result,
      });
    } else if (
      session.mode === "processSelection" &&
      result.action === "show_result"
    ) {
      if (!options.onPostprocessResult) {
        return result.finalText;
      }
      options.onPostprocessResult({
        mode: "processSelection",
        rawText,
        selectedText: session.selectedText,
        result,
      });
    } else if (
      session.mode === "processSelection" &&
      result.action === "replace_selection" &&
      session.selectedText
    ) {
      setStage("insertion");
      try {
        await options.textTarget.replaceSelection(
          result.finalText,
          session.selectedText,
        );
      } catch (error) {
        console.warn(
          "[voice] processSelection replaceSelection failed, showing result overlay",
          error,
        );
        if (!options.onPostprocessResult) {
          throw error;
        }
        options.onPostprocessResult({
          mode: "processSelection",
          rawText,
          selectedText: session.selectedText,
          result,
        });
      }
    } else {
      setStage("insertion");
      await applyPostProcessResult(options.textTarget, session, result);
    }
    return result.finalText;
  }

  // 靜音會話兜底：ASR 可能返回空串（old 裡對應"未聽清或無聲音..."）。
  // 此時 insert-text IPC 的 schema 會以 "Insert text is required" 拒絕空串，
  // postprocess 也會拿到空 raw 浪費 LLM 呼叫。統一在入口跳過，讓流程靜默走到 success。
  if (!rawText.trim()) {
    console.log("[voice] 最終文本為空（靜音/未識別），跳過後處理與插入");
    return "";
  }

  setStage("insertion");
  await options.textTarget.insertText(rawText);
  return rawText;
}

function resolveSessionPostprocessMode(
  options: CreateVoiceOperationControllerOptions,
  session: ActiveSession,
): PostprocessMode {
  return session.mode === "translate"
    ? "translate"
    : options.settings.postprocessMode;
}

async function applyPostProcessResult(
  textTarget: VoiceTextTarget,
  session: ActiveSession,
  result: PostprocessResult,
): Promise<void> {
  if (result.action === "replace_selection" && session.selectedText) {
    console.log(
      `[voice] apply postprocess action=replace_selection，替换选区 selectedTextLength=${session.selectedText.length} finalTextLength=${result.finalText.length}`,
    );
    await textTarget.replaceSelection(result.finalText, session.selectedText);
    return;
  }

  console.log(
    `[voice] apply postprocess action=${result.action}，执行插入 finalTextLength=${result.finalText.length}`,
  );
  await textTarget.insertText(result.finalText);
}

function emitHistoryRecord(
  options: CreateVoiceOperationControllerOptions,
  session: ActiveSession,
  result: {
    status: HistoryRecordStatus;
    transcript: string;
    finalText: string;
    endedAt: Date;
    errorMessage?: string;
  },
): void {
  if (!options.onHistoryRecord) {
    return;
  }

  const input: CreateHistoryRecordInput = {
    startedAt: session.startedAt,
    durationMs: Math.max(
      0,
      result.endedAt.getTime() - Date.parse(session.startedAt),
    ),
    mode: session.mode,
    status: result.status,
    transcript: result.transcript,
    finalText: result.finalText,
  };
  if (session.selectedText) {
    input.selectedText = session.selectedText;
  }
  if (result.errorMessage) {
    input.errorMessage = result.errorMessage;
  }
  const pcm = concatenatePcmFrames(session.audioFrames);
  if (pcm.length > 0) {
    input.audio = {
      pcm,
      sampleRate: 16000,
    };
  }

  try {
    options.onHistoryRecord(input);
  } catch (error) {
    console.warn("[voice] 儲存歷史記錄回撥失敗（已忽略）", error);
  }
}

function concatenatePcmFrames(frames: Int16Array[]): Int16Array {
  const totalLength = frames.reduce((sum, frame) => sum + frame.length, 0);
  const output = new Int16Array(totalLength);
  let offset = 0;
  for (const frame of frames) {
    output.set(frame, offset);
    offset += frame.length;
  }
  return output;
}
