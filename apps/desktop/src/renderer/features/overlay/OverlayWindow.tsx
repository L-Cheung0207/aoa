import { useEffect, useRef, useState, type ReactNode } from "react";
import type { InterfaceLanguage, RecordingMode, WaveformStyle } from "@voice/shared";
import type {
  RecordingState,
  ShortcutHelpPayload,
} from "../../../preload/voiceApi";
import { VolumeMeter } from "../../shared/ui/VolumeMeter";
import type { VoiceErrorReason } from "../recorder/recordingStateMachine";

interface OverlayWindowProps {
  state?: RecordingState;
  result?: ResultOverlayContent;
  /** 僅 state=error 時生效 */
  reason?: VoiceErrorReason;
  /** bootstrap 初始化失敗的原始錯誤文案 */
  error?: string;
  mode?: RecordingMode;
  language?: InterfaceLanguage;
  modeHintLabel?: string;
  modeHintVisible?: boolean;
  shortcutHelp?: ShortcutHelpPayload;
  busyHintVisible?: boolean;
  /** 麥克風當前 RMS 電平（線性 0~1，實際常在 0~0.2）。僅 listening 時有效，否則請傳 0。 */
  level?: number;
  waveformSamples?: Int16Array;
  waveformStyle?: WaveformStyle;
  recordingRemainingSeconds?: number;
  /** 左側 × 按鈕：取消當前會話。不傳則按鈕隱藏。 */
  onCancel?(): void;
  onDismissNetworkError?(): void;
  onRetryNetworkError?(): void;
  onOpenMicrophoneHelp?(): void;
  onDismissBusyHint?(): void;
  onDismissRecordingLimitWarning?(): void;
  /** 右側 ✓ 按鈕：確認結束錄音並走後續流程。不傳則按鈕隱藏。 */
  onConfirm?(): void;
  onUndoCancel?(): void;
  onDismissResult?(): void;
}

export interface ResultOverlayContent {
  rawText: string;
  selectedText: string;
  finalText: string;
  warnings: string[];
}

type OverlayText = {
  states: Record<RecordingState, string>;
  errors: Record<VoiceErrorReason, string>;
  initFailedPrefix: string;
  copied: string;
  copy: string;
  undoCancel: string;
  undo: string;
  thinking: string;
  cancelRecording: string;
  cancel: string;
  confirmEndRecording: string;
  confirm: string;
  shortcutHelpTitle: string;
  shortcutHelpSummaryPrefix: string;
  shortcutHelpSummarySuffix: string;
  shortcutHelpList: string;
  shortcutHelpModes: Record<RecordingMode, string>;
  networkTitle: string;
  closeHint: string;
  close: string;
  networkMessage: string;
  micTitle: string;
  micMessage: string;
  help: string;
  retry: string;
  busyTitle: string;
  busyMessage: string;
  limitTitle: string;
  limitMessage: string;
  resultAria: string;
  brand: string;
  closeAnswer: string;
  voiceInput: string;
  selectedText: string;
  answer: string;
  copyAnswer: string;
  volumeMeter: string;
  canceled: Record<RecordingMode, string>;
};

const OVERLAY_TEXT: Record<InterfaceLanguage, OverlayText> = {
  "zh-CN": {
    states: {
      idle: "准备就绪（单击 Right ALT）",
      listening: "录音中...再次单击 Right ALT 结束",
      canceled: "已取消",
      processing: "转写中...",
      inserting: "正在插入文本...",
      result: "AI 回答",
      success: "已插入",
      error: "出错了，请重试"
    },
    errors: {
      mic: "麦克风无法启用，请检查权限",
      transcription: "转写失败，请重试",
      postprocess: "AI 处理失败，请重试",
      insertion: "文本插入失败，请检查目标应用",
      no_selection: "未检测到选中文本，无法处理",
      shortcut_conflict: "快捷键注册失败，请更换快捷键"
    },
    initFailedPrefix: "初始化失败：",
    copied: "已复制",
    copy: "复制",
    undoCancel: "撤销取消",
    undo: "撤销",
    thinking: "思考中",
    cancelRecording: "取消录音",
    cancel: "取消",
    confirmEndRecording: "确认结束录音",
    confirm: "确认",
    shortcutHelpTitle: "AOA 快捷键",
    shortcutHelpSummaryPrefix: "轻触一次开始说话。按 ",
    shortcutHelpSummarySuffix: " 来完成。",
    shortcutHelpList: "模式快捷键",
    shortcutHelpModes: {
      direct: "语音输入模式",
      translate: "翻译模式",
      processSelection: "智能改写模式"
    },
    networkTitle: "网络连接不稳定",
    closeHint: "关闭提示",
    close: "关闭",
    networkMessage: "未能完成转录。请重试。",
    micTitle: "麦克风不可用",
    micMessage:
      "Voice Assistant 无法访问您的麦克风。可能是其他应用正在使用它，或者访问被系统或安全设置阻止。",
    help: "获取帮助",
    retry: "重试",
    busyTitle: "Voice Assistant 仍在处理您的上一个转录",
    busyMessage: "如果您想取消上一个转录，请按 Esc 或点击下面。",
    limitTitle: "转录会话将在不到 1 分钟内结束",
    limitMessage: "当前每个会话支持最多 5 分钟的转写。请开始一个新会话以继续。",
    resultAria: "AI 回答",
    brand: "妙音",
    closeAnswer: "关闭回答",
    voiceInput: "语音输入",
    selectedText: "选中文本",
    answer: "回答",
    copyAnswer: "复制回答",
    volumeMeter: "麦克风音量",
    canceled: {
      direct: "语音转录已取消",
      translate: "语音翻译已取消",
      processSelection: "智能改写已取消"
    }
  },
  "zh-TW": {
    states: {
      idle: "準備就緒（單擊 Right ALT）",
      listening: "錄音中...再次單擊 Right ALT 結束",
      canceled: "已取消",
      processing: "轉寫中...",
      inserting: "正在插入文本...",
      result: "AI 回答",
      success: "已插入",
      error: "出錯了，請重試"
    },
    errors: {
      mic: "麥克風無法啟用，請檢查許可權",
      transcription: "轉寫失敗，請重試",
      postprocess: "AI 處理失敗，請重試",
      insertion: "文本插入失敗，請檢查目標應用",
      no_selection: "未檢測到選中文本，無法處理",
      shortcut_conflict: "快捷鍵註冊失敗，請更換快捷鍵"
    },
    initFailedPrefix: "初始化失敗：",
    copied: "已複製",
    copy: "複製",
    undoCancel: "撤銷取消",
    undo: "撤銷",
    thinking: "思考中",
    cancelRecording: "取消錄音",
    cancel: "取消",
    confirmEndRecording: "確認結束錄音",
    confirm: "確認",
    shortcutHelpTitle: "AOA 快捷鍵",
    shortcutHelpSummaryPrefix: "輕觸一次開始說話。按 ",
    shortcutHelpSummarySuffix: " 來完成。",
    shortcutHelpList: "模式快捷鍵",
    shortcutHelpModes: {
      direct: "語音輸入模式",
      translate: "翻譯模式",
      processSelection: "智慧改寫模式"
    },
    networkTitle: "網路連線不穩定",
    closeHint: "關閉提示",
    close: "關閉",
    networkMessage: "未能完成轉錄。請重試。",
    micTitle: "麥克風不可用",
    micMessage:
      "Voice Assistant 無法存取您的麥克風。可能是其他應用正在使用它，或者存取被系統或安全性設定阻止。",
    help: "取得協助",
    retry: "重試",
    busyTitle: "Voice Assistant 仍在處理您的上一個轉錄",
    busyMessage: "如果您想取消上一個轉錄，請按 Esc 或點擊下面。",
    limitTitle: "轉錄會話將在不到 1 分鐘內結束",
    limitMessage: "目前每個會話支援最多 5 分鐘的轉寫。請開始一個新會話以繼續。",
    resultAria: "AI 回答",
    brand: "妙音",
    closeAnswer: "關閉回答",
    voiceInput: "語音輸入",
    selectedText: "選中文本",
    answer: "回答",
    copyAnswer: "複製回答",
    volumeMeter: "麥克風音量",
    canceled: {
      direct: "語音轉錄已取消",
      translate: "語音翻譯已取消",
      processSelection: "智慧改寫已取消"
    }
  },
  "en-US": {
    states: {
      idle: "Ready (tap Right Alt)",
      listening: "Recording... tap Right Alt again to finish",
      canceled: "Canceled",
      processing: "Transcribing...",
      inserting: "Inserting text...",
      result: "AI Answer",
      success: "Inserted",
      error: "Something went wrong. Please try again"
    },
    errors: {
      mic: "Microphone unavailable. Check permissions",
      transcription: "Transcription failed. Please try again",
      postprocess: "AI processing failed. Please try again",
      insertion: "Text insertion failed. Check the target app",
      no_selection: "No selected text detected",
      shortcut_conflict: "Shortcut registration failed. Choose another shortcut"
    },
    initFailedPrefix: "Initialization failed: ",
    copied: "Copied",
    copy: "Copy",
    undoCancel: "Undo cancel",
    undo: "Undo",
    thinking: "Thinking",
    cancelRecording: "Cancel recording",
    cancel: "Cancel",
    confirmEndRecording: "Finish recording",
    confirm: "Confirm",
    shortcutHelpTitle: "AOA Shortcuts",
    shortcutHelpSummaryPrefix: "Tap once to start speaking. Press ",
    shortcutHelpSummarySuffix: " to finish.",
    shortcutHelpList: "Mode shortcuts",
    shortcutHelpModes: {
      direct: "Voice Input",
      translate: "Translate",
      processSelection: "Smart Rewrite"
    },
    networkTitle: "Network connection is unstable",
    closeHint: "Close hint",
    close: "Close",
    networkMessage: "Transcription could not be completed. Please try again.",
    micTitle: "Microphone unavailable",
    micMessage:
      "Voice Assistant cannot access your microphone. Another app may be using it, or access may be blocked by system or security settings.",
    help: "Get help",
    retry: "Retry",
    busyTitle: "Voice Assistant is still processing your previous transcription",
    busyMessage: "To cancel the previous transcription, press Esc or click below.",
    limitTitle: "This transcription session will end in less than 1 minute",
    limitMessage: "Each session supports up to 5 minutes of transcription. Start a new session to continue.",
    resultAria: "AI Answer",
    brand: "Voice Assistant",
    closeAnswer: "Close answer",
    voiceInput: "Voice Input",
    selectedText: "Selected Text",
    answer: "Answer",
    copyAnswer: "Copy answer",
    volumeMeter: "Microphone volume",
    canceled: {
      direct: "Voice transcription canceled",
      translate: "Voice translation canceled",
      processSelection: "Smart rewrite canceled"
    }
  }
};

function getOverlayText(language: InterfaceLanguage | undefined): OverlayText {
  return OVERLAY_TEXT[language ?? "zh-CN"] ?? OVERLAY_TEXT["zh-CN"];
}

const COPY_FEEDBACK_RESET_MS = 1400;

export function getCopyTooltipLabel(
  copied: boolean,
  language?: InterfaceLanguage
): string {
  const text = getOverlayText(language);
  return copied ? text.copied : text.copy;
}

export function OverlayWindow(props: OverlayWindowProps): React.JSX.Element {
  const state: RecordingState = props.state ?? "idle";
  const text = getOverlayText(props.language);
  const label = computeLabel(state, props.reason, props.error, text);
  const level = state === "listening" ? (props.level ?? 0) : 0;
  const overlayHintLabel = props.modeHintLabel?.trim();
  const isThinking = state === "processing" || state === "inserting";
  const showBusyHint = isThinking && props.busyHintVisible === true;
  const recordingRemainingSeconds =
    state === "listening" ? props.recordingRemainingSeconds : undefined;
  const reserveOverlayHint = state === "listening" || isThinking;
  const showOverlayHint =
    Boolean(overlayHintLabel) &&
    state === "listening" &&
    props.modeHintVisible !== false &&
    !showBusyHint;

  if (props.shortcutHelp) {
    return <ShortcutHelpPanel shortcuts={props.shortcutHelp} text={text} />;
  }

  if (state === "idle" || state === "success") {
    return <main className="overlay-empty" aria-hidden="true" />;
  }

  if (state === "result" && props.result) {
    return (
      <ResultOverlay
        result={props.result}
        text={text}
        {...(props.onDismissResult ? { onDismiss: props.onDismissResult } : {})}
      />
    );
  }

  if (
    props.reason === "transcription" &&
    (state === "error" || props.onRetryNetworkError)
  ) {
    return (
      <NetworkErrorHint
        text={text}
        {...(props.onDismissNetworkError
          ? { onDismiss: props.onDismissNetworkError }
          : {})}
        {...(props.onRetryNetworkError
          ? { onRetry: props.onRetryNetworkError }
          : {})}
      />
    );
  }

  if (state === "error" && props.reason === "mic") {
    return (
      <MicrophoneErrorHint
        text={text}
        {...(props.onCancel ? { onDismiss: props.onCancel } : {})}
        {...(props.onOpenMicrophoneHelp
          ? { onHelp: props.onOpenMicrophoneHelp }
          : {})}
      />
    );
  }

  if (state === "canceled") {
    const canceledLabel = getCanceledLabel(props.mode, text);
    return (
      <main
        className="overlay overlay--canceled"
        data-mode={props.mode}
        title={canceledLabel}
        aria-label={canceledLabel}
      >
        <span className="overlay__canceled-text">{canceledLabel}</span>
        {props.onUndoCancel ? (
          <button
            type="button"
            className="overlay__btn overlay__btn--undo"
            aria-label={text.undoCancel}
            title={text.undo}
            onClick={props.onUndoCancel}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M9.5 8H5.5v-4M5.8 8.2A7 7 0 1 1 5 14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        ) : null}
      </main>
    );
  }

  // 第二次 Right ALT 後的「Thinking loading」態：processing/inserting 階段渲染
  // Pure dark pill with spinner and localized thinking text; hides meter and side buttons.
  // 按鈕可用性：
  // - ×：會話進行中或 error 時可點（error 時走 reset）；idle/success 時停用。
  // - ✓：僅 listening 時可點；其他狀態停用但保留佔位以維持左右對稱的膠囊外觀。
  const cancelEnabled =
    state === "listening" ||
    state === "processing" ||
    state === "inserting" ||
    state === "error";
  const confirmEnabled = state === "listening";

  if (isThinking) {
    const thinkingOverlay = (
      <main
        className={`overlay overlay--${state} overlay--thinking`}
        data-mode={props.mode}
        title={label}
        aria-label={label}
      >
        <span className="overlay__spinner" aria-hidden="true" />
        <span className="overlay__thinking-text">{text.thinking}</span>
      </main>
    );

    return reserveOverlayHint ? (
      <OverlayShell
        label={overlayHintLabel ?? ""}
        visible={showOverlayHint}
        busyHintVisible={showBusyHint}
        {...(props.mode !== undefined ? { mode: props.mode } : {})}
        {...(props.onCancel ? { onCancel: props.onCancel } : {})}
        {...(props.onDismissBusyHint
          ? { onDismissBusyHint: props.onDismissBusyHint }
          : {})}
        text={text}
      >
        {thinkingOverlay}
      </OverlayShell>
    ) : (
      thinkingOverlay
    );
  }

  const pillOverlay = (
    <main
      className={`overlay overlay--${state}`}
      data-mode={props.mode}
      title={label}
      aria-label={label}
    >
      {props.onCancel ? (
        <button
          type="button"
          className="overlay__btn overlay__btn--cancel"
            aria-label={text.cancelRecording}
            title={text.cancel}
          onClick={props.onCancel}
          disabled={!cancelEnabled}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      ) : null}
      <VolumeMeter
        level={level}
        active={state === "listening"}
        styleName={props.waveformStyle ?? "waveform-sunset"}
        ariaLabel={text.volumeMeter}
        {...(props.waveformSamples !== undefined
          ? { samples: props.waveformSamples }
          : {})}
      />
      {props.onConfirm ? (
        <button
          type="button"
          className="overlay__btn overlay__btn--confirm"
          aria-label={text.confirmEndRecording}
          title={text.confirm}
          onClick={props.onConfirm}
          disabled={!confirmEnabled}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      ) : null}
    </main>
  );

  return reserveOverlayHint ? (
    <OverlayShell
      label={overlayHintLabel ?? ""}
      visible={showOverlayHint}
      {...(recordingRemainingSeconds !== undefined
        ? { recordingRemainingSeconds }
        : {})}
      {...(props.onDismissRecordingLimitWarning
        ? {
            onDismissRecordingLimitWarning:
              props.onDismissRecordingLimitWarning,
          }
        : {})}
      {...(props.mode !== undefined ? { mode: props.mode } : {})}
      text={text}
    >
      {pillOverlay}
    </OverlayShell>
  ) : (
    pillOverlay
  );
}

interface NetworkErrorHintProps {
  text: OverlayText;
  onDismiss?(): void;
  onRetry?(): void;
}

interface MicrophoneErrorHintProps {
  text: OverlayText;
  onDismiss?(): void;
  onHelp?(): void;
}

function ShortcutHelpPanel({
  shortcuts,
  text,
}: {
  shortcuts: ShortcutHelpPayload;
  text: OverlayText;
}): React.JSX.Element {
  const items: Array<{
    mode: RecordingMode;
    label: string;
    shortcut: string;
  }> = [
    { mode: "direct", label: text.shortcutHelpModes.direct, shortcut: shortcuts.direct },
    { mode: "translate", label: text.shortcutHelpModes.translate, shortcut: shortcuts.translate },
    {
      mode: "processSelection",
      label: text.shortcutHelpModes.processSelection,
      shortcut: shortcuts.processSelection,
    },
  ];

  return (
    <main className="shortcut-help-shell">
      <section className="shortcut-help-panel" role="status" aria-live="polite">
        <header className="shortcut-help-panel__header">
          <span className="shortcut-help-panel__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect
                x="4.4"
                y="5.4"
                width="15.2"
                height="11.2"
                rx="5.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="9.2" cy="11" r="1.25" fill="currentColor" />
              <circle cx="14.8" cy="11" r="1.25" fill="currentColor" />
              <path
                d="M12 16.6v2.1M9.8 18.7h4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <strong>{text.shortcutHelpTitle}</strong>
        </header>
        <p className="shortcut-help-panel__summary">
          {text.shortcutHelpSummaryPrefix}
          <kbd>{shortcuts.direct}</kbd>
          {text.shortcutHelpSummarySuffix}
        </p>
        <ul className="shortcut-help-panel__list" aria-label={text.shortcutHelpList}>
          {items.map((item) => (
            <li key={item.mode} data-mode={item.mode}>
              <span className="shortcut-help-panel__dot" aria-hidden="true" />
              <span className="shortcut-help-panel__label">{item.label}</span>
              <kbd>{item.shortcut}</kbd>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function NetworkErrorHint({
  text,
  onDismiss,
  onRetry,
}: NetworkErrorHintProps): React.JSX.Element {
  return (
    <main className="network-error-shell">
      <section
        className="network-error-hint"
        role="alertdialog"
        aria-modal="false"
      >
        <header className="network-error-hint__header">
          <span className="network-error-hint__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 4.25a3.25 3.25 0 0 0-3.25 3.25v4.25a3.25 3.25 0 0 0 6.5 0V7.5A3.25 3.25 0 0 0 12 4.25Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M6.25 10.75v.65a5.75 5.75 0 0 0 11.5 0v-.65M12 17.25v2.25M8 20.25h8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M18.5 4.5v4.25M18.5 11.35v.15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <strong>{text.networkTitle}</strong>
          {onDismiss ? (
            <button
              type="button"
              className="network-error-hint__close"
              aria-label={text.closeHint}
              title={text.close}
              onClick={onDismiss}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          ) : null}
        </header>
        <p>{text.networkMessage}</p>
        {onRetry ? (
          <button
            type="button"
            className="network-error-hint__retry"
            onClick={onRetry}
          >
            {text.retry}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function MicrophoneErrorHint({
  text,
  onDismiss,
  onHelp,
}: MicrophoneErrorHintProps): React.JSX.Element {
  return (
    <main className="mic-error-shell">
      <section
        className="mic-error-hint"
        role="alertdialog"
        aria-modal="false"
        aria-label={text.micTitle}
      >
        <header className="mic-error-hint__header">
          <span className="mic-error-hint__icon" aria-hidden="true">
            !
          </span>
          <strong>{text.micTitle}</strong>
          {onDismiss ? (
            <button
              type="button"
              className="mic-error-hint__close"
              aria-label={text.closeHint}
              title={text.close}
              onClick={onDismiss}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          ) : null}
        </header>
        <p>{text.micMessage}</p>
        <footer className="mic-error-hint__footer">
          <button
            type="button"
            className="mic-error-hint__help"
            onClick={onHelp}
          >
            {text.help}
          </button>
        </footer>
      </section>
    </main>
  );
}

interface OverlayShellProps {
  label: string;
  visible: boolean;
  text: OverlayText;
  mode?: RecordingMode;
  busyHintVisible?: boolean;
  recordingRemainingSeconds?: number;
  onCancel?(): void;
  onDismissBusyHint?(): void;
  onDismissRecordingLimitWarning?(): void;
  children: ReactNode;
}

function OverlayShell({
  label,
  visible,
  text,
  mode,
  busyHintVisible = false,
  recordingRemainingSeconds,
  onCancel,
  onDismissBusyHint,
  onDismissRecordingLimitWarning,
  children,
}: OverlayShellProps): React.JSX.Element {
  return (
    <div className="overlay-shell">
      {busyHintVisible ? (
        <BusyHint
          text={text}
          {...(onCancel ? { onCancel } : {})}
          {...(onDismissBusyHint ? { onDismiss: onDismissBusyHint } : {})}
        />
      ) : recordingRemainingSeconds !== undefined ? (
        <RecordingLimitWarning
          text={text}
          remainingSeconds={recordingRemainingSeconds}
          {...(onDismissRecordingLimitWarning
            ? { onDismiss: onDismissRecordingLimitWarning }
            : {})}
        />
      ) : (
        <div
          className="overlay-hint"
          data-mode={mode}
          data-visible={visible ? "true" : "false"}
          aria-hidden={visible ? undefined : true}
          aria-label={visible ? label : undefined}
        >
          <span className="overlay-hint__dot" aria-hidden="true" />
          <span>{label}</span>
        </div>
      )}
      {children}
    </div>
  );
}

interface BusyHintProps {
  text: OverlayText;
  onCancel?(): void;
  onDismiss?(): void;
}

function BusyHint({ text, onCancel, onDismiss }: BusyHintProps): React.JSX.Element {
  return (
    <section className="overlay-busy-hint" role="status" aria-live="polite">
      <header className="overlay-busy-hint__header">
        <span className="overlay-busy-hint__icon" aria-hidden="true">
          !
        </span>
        <strong>{text.busyTitle}</strong>
        {onDismiss ? (
          <button
            type="button"
            className="overlay-busy-hint__close"
            aria-label={text.closeHint}
            title={text.close}
            onClick={onDismiss}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        ) : null}
      </header>
      <p>{text.busyMessage}</p>
      {onCancel ? (
        <button
          type="button"
          className="overlay-busy-hint__cancel"
          onClick={onCancel}
        >
          {text.cancel}
        </button>
      ) : null}
    </section>
  );
}

function RecordingLimitWarning({
  text,
  remainingSeconds,
  onDismiss,
}: {
  text: OverlayText;
  remainingSeconds: number;
  onDismiss?(): void;
}): React.JSX.Element {
  return (
    <section
      className="recording-limit-warning"
      role="status"
      aria-live="polite"
    >
      <header className="recording-limit-warning__header">
        <span className="recording-limit-warning__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M6.4 10.5v3.1M10 8v8M13.6 6.5v11M17.2 9.3v5.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M3.75 12a8.25 8.25 0 0 1 1.5-4.75M20.25 12a8.25 8.25 0 0 0-1.5-4.75"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.72"
            />
          </svg>
        </span>
        <strong>{text.limitTitle}</strong>
        {onDismiss ? (
          <button
            type="button"
            className="recording-limit-warning__close"
            aria-label={text.closeHint}
            title={text.close}
            onClick={onDismiss}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        ) : null}
      </header>
      <p>{text.limitMessage}</p>
      <span className="recording-limit-warning__timer">
        {formatCountdown(remainingSeconds)}
      </span>
    </section>
  );
}

interface ResultOverlayProps {
  result: ResultOverlayContent;
  text: OverlayText;
  onDismiss?(): void;
}

function ResultOverlay({
  result,
  text,
  onDismiss,
}: ResultOverlayProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const copyAnswer = (): void => {
    void window.voiceAI
      .copyText(result.finalText)
      .then(() => {
        setCopied(true);
        if (copyResetTimerRef.current) {
          clearTimeout(copyResetTimerRef.current);
        }
        copyResetTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, COPY_FEEDBACK_RESET_MS);
      })
      .catch((error: unknown) => {
        console.warn("[overlay] failed to copy result text", error);
      });
  };

  return (
    <main className="result-overlay" role="dialog" aria-label={text.resultAria}>
      <section className="result-panel">
        <header className="result-panel__header">
          <span className="result-panel__brand" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M5.5 5.5c5.8.3 10.4 4.9 10.7 10.7h-3.9A6.8 6.8 0 0 0 5.5 9.4V5.5Z"
                fill="currentColor"
              />
              <path
                d="M17.2 6.1a9.8 9.8 0 0 1 1.7 1.7l-2.8 2.8a5.8 5.8 0 0 0-1.7-1.7l2.8-2.8Z"
                fill="currentColor"
                opacity="0.72"
              />
            </svg>
          </span>
          <strong>{text.brand}</strong>
          <button
            type="button"
            className="result-panel__icon-btn"
            aria-label={text.closeAnswer}
            title={text.close}
            onClick={onDismiss}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="result-panel__body">
          <ResultPrompt label={text.voiceInput} value={result.rawText} icon="voice" />
          {result.selectedText ? (
            <ResultPrompt
              label={text.selectedText}
              value={result.selectedText}
              compact
            />
          ) : null}

          <article className="result-answer">
            <div className="result-answer__header">
              <span className="result-answer__title">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 3.5 13.8 9l5.7 1.2-5.7 1.9L12 17.5l-1.8-5.4-5.7-1.9L10.2 9 12 3.5Z"
                    fill="currentColor"
                  />
                </svg>
                {text.answer}
              </span>
              <span
                className="result-copy-control"
                data-copied={copied ? "true" : "false"}
              >
                <button
                  type="button"
                  className="result-panel__icon-btn"
                  aria-label={copied ? text.copied : text.copyAnswer}
                  onClick={copyAnswer}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <rect
                      x="8"
                      y="8"
                      width="10"
                      height="10"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <span
                  className="result-copy-tooltip"
                  role="status"
                  aria-live="polite"
                >
                  {copied ? text.copied : text.copy}
                </span>
              </span>
            </div>
            <div className="result-answer__content">{result.finalText}</div>
          </article>

          {result.warnings.length > 0 ? (
            <p className="result-panel__warning">
              {result.warnings.join("\n")}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

interface ResultPromptProps {
  label: string;
  value: string;
  compact?: boolean;
  icon?: "voice";
}

function ResultPrompt({
  label,
  value,
  compact,
  icon,
}: ResultPromptProps): React.JSX.Element {
  return (
    <section
      className={
        compact ? "result-prompt result-prompt--compact" : "result-prompt"
      }
    >
      {icon === "voice" ? (
        <span
          className="result-prompt__voice-icon"
          aria-label={label}
          title={label}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 3.75a3.25 3.25 0 0 0-3.25 3.25v4.5a3.25 3.25 0 0 0 6.5 0V7A3.25 3.25 0 0 0 12 3.75Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            />
            <path
              d="M6.25 10.75v.85a5.75 5.75 0 0 0 11.5 0v-.85M12 17.35v2.9M8.75 20.25h6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : (
        <span className="result-prompt__label">{label}</span>
      )}
      <p>{value}</p>
    </section>
  );
}

function computeLabel(
  state: RecordingState,
  reason: VoiceErrorReason | undefined,
  error: string | undefined,
  text: OverlayText,
): string {
  if (error) {
    return `${text.initFailedPrefix}${error}`;
  }
  if (state === "error" && reason) {
    return text.errors[reason];
  }
  return text.states[state];
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getCanceledLabel(
  mode: RecordingMode | undefined,
  text: OverlayText,
): string {
  return text.canceled[mode ?? "direct"];
}
