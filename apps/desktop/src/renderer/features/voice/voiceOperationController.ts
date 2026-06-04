import type {
  PostProcessInput,
  PostProcessService,
  TranscriptionProvider,
} from "@voice/ai";
import type {
  AppContext,
  DictionaryTermContext,
  PostprocessMode,
  PostprocessResult,
  PostprocessStyle,
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
  postprocessStyle: PostprocessStyle;
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
  postProcessService: PostProcessService;
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
  getRecordingRemainingSeconds(): number | undefined;
  handleToggle(mode: RecordingMode): Promise<void>;
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
  startedAt: string;
  startedAtMs: number;
  audioFrames: Int16Array[];
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
  /**
   * 啟動進行中的標記：在 startSession 的兩個 await（recorder.start / provider.start）
   * 跑完之前保持為 true。
   */
  let starting = false;
  /**
   * 啟動期間使用者再次觸發（第二次 toggle 或主動 cancel）時：
   * - 立刻停麥並重置 UI（requestAbortDuringStart）
   * - provider 側仍等啟動收尾後再 cancel，避免 WS 未 open 就 send finished 幀
   */
  let pendingCancelAfterStart = false;
  /**
   * 啟動階段是否已經開始開啟麥克風。provider.start 期間尚未開麥，取消時不需要碰 recorder。
  */
  let recorderStartRequested = false;
  const getNow = options.now ?? (() => new Date());
  const recordingMaxDurationSeconds = Math.max(
    1,
    options.settings.maxDurationSeconds ?? DEFAULT_RECORDER_MAX_DURATION_SECONDS,
  );
  let recordingLimitTimer: ReturnType<typeof setTimeout> | undefined;

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

    const elapsedMs = Math.max(0, getNow().getTime() - activeSession.startedAtMs);
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
      if (activeSession !== session || machine.getSnapshot().state !== "listening") {
        return;
      }
      console.log("[voice] recording limit reached; stopping session automatically");
      void stopSession().catch((error) => {
        console.error("[voice] automatic recording stop failed", error);
      });
    }, remainingMs + RECORDING_LIMIT_TIMER_FUZZ_MS);
  };

  const requestAbortDuringStart = (): void => {
    console.warn("[voice] 啟動進行中，標記 pendingCancel");
    pendingCancelAfterStart = true;
    clearRecordingLimitTimer();
    if (recorderStartRequested) {
      void options.recorder.cancel().catch((error) => {
        console.warn("[voice] 啟動期間立刻停麥失敗（忽略）", error);
      });
    }
    machine.send({ type: "reset" });
  };

  const fail = (reason: VoiceErrorReason): void => {
    console.warn(`[voice] 失敗原因=${reason}`);
    clearRecordingLimitTimer();
    machine.send({ type: "fail", reason });
  };

  const unsubscribeRecorder = options.recorder.subscribe((event) => {
    if (event.type === "frame") {
      activeSession?.audioFrames.push(new Int16Array(event.frame.pcm));
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
        session.transcriptionUnavailable = true;
        options.onTranscriptionUnavailable?.();
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
        console.log("[voice] 轉寫最終文本：", finalTranscript);
        return;
      }

      if (event.type === "error") {
        console.error("[voice] 轉寫錯誤", event);
        if (activeSession && machine.getSnapshot().state === "listening") {
          activeSession.transcriptionUnavailable = true;
          options.onTranscriptionUnavailable?.();
          return;
        }
        fail("transcription");
        activeSession = undefined;
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
  ): Promise<boolean> => {
    session.transcriptionUnavailable = false;
    try {
      await options.transcriptionProvider.start({
        installationId: options.settings.installationId,
        language: options.settings.language,
        sampleRate: options.settings.sampleRate,
      });
      if (activeSession !== session) {
        return false;
      }
      session.transcriptionReady = true;
      try {
        for (const frame of session.pendingTranscriptionFrames) {
          options.transcriptionProvider.sendAudio(frame);
        }
      } catch (sendError) {
        console.warn(
          "[voice] 发送缓存音频到转写服务失败，录音保持进行中",
          sendError,
        );
        session.transcriptionUnavailable = true;
        options.onTranscriptionUnavailable?.();
        return false;
      } finally {
        session.pendingTranscriptionFrames = [];
      }
      return true;
    } catch (error) {
      console.error("[voice] 轉寫啟動失敗，錄音保持進行中", error);
      if (activeSession === session) {
        session.transcriptionUnavailable = true;
        session.transcriptionReady = false;
        options.onTranscriptionUnavailable?.();
      }
      return false;
    }
  };

  const startSession = async (mode: RecordingMode): Promise<void> => {
    console.log(`[voice] 開始會話 mode=${mode}`);
    let selectedText = "";
    if (mode === "processSelection") {
      selectedText = await options.textTarget.getSelectedText();
      console.log(
        `[voice] processSelection 選中文本長度=${selectedText.length}`,
      );
    }

    const startedAt = getNow();
    activeSession = {
      mode,
      selectedText,
      startedAt: startedAt.toISOString(),
      startedAtMs: startedAt.getTime(),
      audioFrames: [],
      pendingTranscriptionFrames: [],
      transcriptionReady: false,
      transcriptionUnavailable: false,
    };
    finalTranscript = "";
    machine.send({ type: "start", mode });
    starting = true;
    recorderStartRequested = false;

    let stage: "recorder" | "transcription" = "recorder";
    let recorderStarted = false;
    try {
      recorderStartRequested = true;
      await options.recorder.start({
        sampleRate: options.settings.sampleRate,
        inputDeviceId: options.settings.inputDeviceId,
        ...(options.settings.maxDurationSeconds !== undefined
          ? { maxDurationSeconds: options.settings.maxDurationSeconds }
          : {}),
      });
      recorderStarted = true;
      if (activeSession) {
        scheduleRecordingLimitTimer(activeSession);
      }
      if (pendingCancelAfterStart) {
        console.log("[voice] 使用者已在錄音器啟動期間取消，跳過啟動成功收尾");
        return;
      }
      stage = "transcription";
      await startTranscriptionForSession(activeSession);
      console.log("[voice] 會話啟動完成：錄音器已就緒");
    } catch (error) {
      console.error(`[voice] 會話啟動失敗 stage=${stage}`, error);
      clearRecordingLimitTimer();
      activeSession = undefined;
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
      fail(stage === "recorder" ? "mic" : stageToReason(stage));
      // 啟動失敗時已經把狀態機推到 error，pendingCancelAfterStart 無意義，清掉。
      pendingCancelAfterStart = false;
      throw error;
    } finally {
      starting = false;
      recorderStartRequested = false;
      if (pendingCancelAfterStart) {
        pendingCancelAfterStart = false;
        console.log("[voice] 啟動完成後發現 pendingCancel，立即取消會話");
        await cancelSession();
      }
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
      fail(stageToReason(stage));
      throw error;
    } finally {
      if (activeSession === session) {
        activeSession = undefined;
        finalTranscript = "";
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
    getSnapshot: () => machine.getSnapshot(),
    getRecordingRemainingSeconds,
    handleToggle: async (mode) => {
      const snapshot = machine.getSnapshot();
      console.log(
        `[voice] handleToggle：收到 mode=${mode} 當前狀態=${snapshot.state} starting=${starting}`,
      );

      // 啟動進行中：立刻停麥並重置 UI；provider 側等 finally 裡 cancelSession。
      if (starting) {
        requestAbortDuringStart();
        return;
      }

      if (
        snapshot.state === "idle" ||
        snapshot.state === "error" ||
        snapshot.state === "success"
      ) {
        try {
          await startSession(mode);
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
        if (mode !== "direct") {
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
      if (current !== "listening") {
        // 僅在錄音進行中響應確認；其他狀態請走取消或快捷鍵重啟。
        return;
      }
      await stopSession();
    },
    retryTranscription: async () => {
      const snapshot = machine.getSnapshot();
      const session = activeSession;
      if (snapshot.state !== "listening" || !session) {
        return false;
      }
      if (session.transcriptionReady && !session.transcriptionUnavailable) {
        return true;
      }
      return startTranscriptionForSession(session);
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
  setStage: (stage: "postprocess" | "insertion") => void,
): Promise<string> {
  // 靜音會話兜底：ASR 可能返回空串（old 裡對應"未聽清或無聲音..."）。
  // 此時 insert-text IPC 的 schema 會以 "Insert text is required" 拒絕空串，
  // postprocess 也會拿到空 raw 浪費 LLM 呼叫。統一在入口跳過，讓流程靜默走到 success。
  if (!rawText.trim()) {
    console.log("[voice] 最終文本為空（靜音/未識別），跳過後處理與插入");
    return "";
  }

  if (session.mode === "direct") {
    setStage("insertion");
    await options.textTarget.insertText(rawText);
    return rawText;
  }

  setStage("postprocess");
  const result = await options.postProcessService.process(
    await createPostProcessInput(options, session, rawText),
  );

  if (session.mode === "processSelection") {
    options.onPostprocessResult?.({
      mode: "processSelection",
      rawText,
      selectedText: session.selectedText,
      result,
    });
    return result.finalText;
  }

  setStage("insertion");
  await applyPostProcessResult(options.textTarget, session, result);
  return result.finalText;
}

async function createPostProcessInput(
  options: CreateVoiceOperationControllerOptions,
  session: ActiveSession,
  rawText: string,
): Promise<PostProcessInput> {
  return {
    installationId: options.settings.installationId,
    rawText,
    selectedText: session.selectedText,
    appContext: await options.getAppContext(),
    mode:
      session.mode === "translate"
        ? "translate"
        : options.settings.postprocessMode,
    language: toBackendLanguage(options.settings.language),
    style: options.settings.postprocessStyle,
    targetLanguage:
      session.mode === "translate"
        ? resolveTranslateTargetLanguage(
            options.settings.language,
            options.settings.targetLanguage,
          )
        : options.settings.targetLanguage,
    dictionaryTerms: options.settings.dictionaryTerms,
  };
}

async function applyPostProcessResult(
  textTarget: VoiceTextTarget,
  session: ActiveSession,
  result: PostprocessResult,
): Promise<void> {
  if (result.action === "replace_selection" && session.selectedText) {
    await textTarget.replaceSelection(result.finalText, session.selectedText);
    return;
  }

  await textTarget.insertText(result.finalText);
}

/**
 * 把 RecordingLanguage (12 種，含 old 10 種 + zh-CN/en-US) 歸一為 backend-client 接受的
 * BackendLanguage (auto|zh-CN|en-US)。未被 backend 直接支援的語言（如 cantonese/korean）
 * 回退到 "auto"，讓後端自動識別。
 */
function toBackendLanguage(
  lang: RecordingLanguage,
): "auto" | "zh-CN" | "en-US" {
  switch (lang) {
    case "auto":
      return "auto";
    case "mandarin":
    case "zh-CN":
      return "zh-CN";
    case "english":
    case "en-US":
      return "en-US";
    default:
      return "auto";
  }
}

export function resolveTranslateTargetLanguage(
  lang: RecordingLanguage,
  fallback: VoiceOperationSettings["targetLanguage"],
): VoiceOperationSettings["targetLanguage"] {
  switch (lang) {
    case "cantonese":
    case "mandarin":
    case "zh-CN":
      return "en-US";
    case "english":
    case "en-US":
      return "zh-CN";
    default:
      return fallback;
  }
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
