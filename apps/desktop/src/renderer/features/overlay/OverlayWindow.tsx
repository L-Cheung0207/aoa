import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RecordingMode, WaveformStyle } from "@voice/shared";
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

const STATE_LABELS: Record<RecordingState, string> = {
  idle: "準備就緒（單擊 Right ALT）",
  listening: "錄音中…再次單擊 Right ALT 結束",
  canceled: "已取消",
  processing: "轉寫中…",
  inserting: "正在插入文本…",
  result: "AI 回答",
  success: "已插入",
  error: "出錯了，請重試",
};

const ERROR_REASON_LABELS: Record<VoiceErrorReason, string> = {
  mic: "麥克風無法啟用，請檢查許可權",
  transcription: "轉寫失敗，請重試",
  postprocess: "AI 處理失敗，請重試",
  insertion: "文本插入失敗，請檢查目標應用",
  no_selection: "未檢測到選中文本，無法處理",
  shortcut_conflict: "快捷键注册失败，请更换快捷键",
};

const COPY_FEEDBACK_RESET_MS = 1400;

export function getCopyTooltipLabel(copied: boolean): string {
  return copied ? "已複製" : "複製";
}

export function OverlayWindow(props: OverlayWindowProps): React.JSX.Element {
  const state: RecordingState = props.state ?? "idle";
  const label = computeLabel(state, props.reason, props.error);
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
    return <ShortcutHelpPanel shortcuts={props.shortcutHelp} />;
  }

  if (state === "idle" || state === "success") {
    return <main className="overlay-empty" aria-hidden="true" />;
  }

  if (state === "result" && props.result) {
    return (
      <ResultOverlay
        result={props.result}
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
        {...(props.onDismissNetworkError
          ? { onDismiss: props.onDismissNetworkError }
          : {})}
        {...(props.onRetryNetworkError
          ? { onRetry: props.onRetryNetworkError }
          : {})}
      />
    );
  }

  if (state === "canceled") {
    const canceledLabel = getCanceledLabel(props.mode);
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
            aria-label="撤销取消"
            title="撤销"
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
        <span className="overlay__thinking-text">{"\u601d\u8003\u4e2d"}</span>
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
          aria-label="取消錄音"
          title="取消"
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
        {...(props.waveformSamples !== undefined
          ? { samples: props.waveformSamples }
          : {})}
      />
      {props.onConfirm ? (
        <button
          type="button"
          className="overlay__btn overlay__btn--confirm"
          aria-label="確認結束錄音"
          title="確認"
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
    >
      {pillOverlay}
    </OverlayShell>
  ) : (
    pillOverlay
  );
}

interface NetworkErrorHintProps {
  onDismiss?(): void;
  onRetry?(): void;
}

function ShortcutHelpPanel({
  shortcuts,
}: {
  shortcuts: ShortcutHelpPayload;
}): React.JSX.Element {
  const items: Array<{
    mode: RecordingMode;
    label: string;
    shortcut: string;
  }> = [
    { mode: "direct", label: "语音输入模式", shortcut: shortcuts.direct },
    { mode: "translate", label: "翻译模式", shortcut: shortcuts.translate },
    {
      mode: "processSelection",
      label: "智能改写模式",
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
          <strong>AOA 快捷键</strong>
        </header>
        <p className="shortcut-help-panel__summary">
          轻触一次开始说话。按 <kbd>{shortcuts.direct}</kbd> 来完成。
        </p>
        <ul className="shortcut-help-panel__list" aria-label="模式快捷键">
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
          <strong>网络连接不稳定</strong>
          {onDismiss ? (
            <button
              type="button"
              className="network-error-hint__close"
              aria-label="关闭提示"
              title="关闭"
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
        <p>未能完成转录。请重试。</p>
        {onRetry ? (
          <button
            type="button"
            className="network-error-hint__retry"
            onClick={onRetry}
          >
            重试
          </button>
        ) : null}
      </section>
    </main>
  );
}

interface OverlayShellProps {
  label: string;
  visible: boolean;
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
          {...(onCancel ? { onCancel } : {})}
          {...(onDismissBusyHint ? { onDismiss: onDismissBusyHint } : {})}
        />
      ) : recordingRemainingSeconds !== undefined ? (
        <RecordingLimitWarning
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
  onCancel?(): void;
  onDismiss?(): void;
}

function BusyHint({ onCancel, onDismiss }: BusyHintProps): React.JSX.Element {
  return (
    <section className="overlay-busy-hint" role="status" aria-live="polite">
      <header className="overlay-busy-hint__header">
        <span className="overlay-busy-hint__icon" aria-hidden="true">
          !
        </span>
        <strong>Voice Assistant仍在处理您的上一个转录</strong>
        {onDismiss ? (
          <button
            type="button"
            className="overlay-busy-hint__close"
            aria-label="关闭提示"
            title="关闭"
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
      <p>如果您想取消上一个转录，请按 Esc 或点击下面。</p>
      {onCancel ? (
        <button
          type="button"
          className="overlay-busy-hint__cancel"
          onClick={onCancel}
        >
          取消
        </button>
      ) : null}
    </section>
  );
}

function RecordingLimitWarning({
  remainingSeconds,
  onDismiss,
}: {
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
        <strong>{"\u8f6c\u5f55\u4f1a\u8bdd\u5c06\u5728\u4e0d\u52301\u5206\u949f\u5185\u7ed3\u675f"}</strong>
        {onDismiss ? (
          <button
            type="button"
            className="recording-limit-warning__close"
            aria-label={"\u5173\u95ed\u63d0\u793a"}
            title={"\u5173\u95ed"}
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
      <p>
        {
          "\u5f53\u524d\u6bcf\u4e2a\u4f1a\u8bdd\u652f\u6301\u6700\u591a5\u5206\u949f\u7684\u8f6c\u5199\u3002\u8bf7\u5f00\u59cb\u4e00\u4e2a\u65b0\u4f1a\u8bdd\u4ee5\u7ee7\u7eed"
        }
      </p>
      <span className="recording-limit-warning__timer">
        {formatCountdown(remainingSeconds)}
      </span>
    </section>
  );
}

interface ResultOverlayProps {
  result: ResultOverlayContent;
  onDismiss?(): void;
}

function ResultOverlay({
  result,
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
    <main className="result-overlay" role="dialog" aria-label="AI 回答">
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
          <strong>妙音</strong>
          <button
            type="button"
            className="result-panel__icon-btn"
            aria-label="關閉回答"
            title="關閉"
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
          <ResultPrompt label="語音輸入" value={result.rawText} icon="voice" />
          {result.selectedText ? (
            <ResultPrompt
              label="選中文本"
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
                回答
              </span>
              <span
                className="result-copy-control"
                data-copied={copied ? "true" : "false"}
              >
                <button
                  type="button"
                  className="result-panel__icon-btn"
                  aria-label={copied ? "已複製" : "複製回答"}
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
                  {getCopyTooltipLabel(copied)}
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
): string {
  if (error) {
    return `初始化失敗：${error}`;
  }
  if (state === "error" && reason) {
    return ERROR_REASON_LABELS[reason];
  }
  return STATE_LABELS[state];
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getCanceledLabel(mode: RecordingMode | undefined): string {
  switch (mode) {
    case "processSelection":
      return "\u667a\u80fd\u6539\u5199\u5df2\u53d6\u6d88";
    case "translate":
      return "\u8bed\u97f3\u7ffb\u8bd1\u5df2\u53d6\u6d88";
    case "direct":
    default:
      return "\u8bed\u97f3\u8f6c\u5f55\u5df2\u53d6\u6d88";
  }
}
