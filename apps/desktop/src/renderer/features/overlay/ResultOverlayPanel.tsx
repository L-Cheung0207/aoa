import { useEffect, useRef, useState } from "react";
import type { InterfaceLanguage } from "@voice/shared";

export interface ResultOverlayContent {
  rawText: string;
  selectedText: string;
  finalText: string;
  warnings: string[];
}

export interface ResultOverlayText {
  copied: string;
  copy: string;
  close: string;
  resultAria: string;
  brand: string;
  closeAnswer: string;
  voiceInput: string;
  selectedText: string;
  answer: string;
  copyAnswer: string;
}

interface ResultOverlayPanelProps {
  result: ResultOverlayContent;
  text: ResultOverlayText;
  onDismiss?(): void;
}

interface ResultPromptProps {
  label: string;
  value: string;
  compact?: boolean;
  icon?: "voice";
}

const COPY_FEEDBACK_RESET_MS = 1400;

const RESULT_OVERLAY_TEXT: Record<InterfaceLanguage, ResultOverlayText> = {
  "zh-CN": {
    copied: "已复制",
    copy: "复制",
    close: "关闭",
    resultAria: "AI 回答",
    brand: "Voice Assistant",
    closeAnswer: "关闭回答",
    voiceInput: "语音输入",
    selectedText: "选中文本",
    answer: "回答",
    copyAnswer: "复制回答",
  },
  "zh-TW": {
    copied: "已複製",
    copy: "複製",
    close: "關閉",
    resultAria: "AI 回答",
    brand: "Voice Assistant",
    closeAnswer: "關閉回答",
    voiceInput: "語音輸入",
    selectedText: "選中文本",
    answer: "回答",
    copyAnswer: "複製回答",
  },
  "en-US": {
    copied: "Copied",
    copy: "Copy",
    close: "Close",
    resultAria: "AI Answer",
    brand: "Voice Assistant",
    closeAnswer: "Close answer",
    voiceInput: "Voice Input",
    selectedText: "Selected Text",
    answer: "Answer",
    copyAnswer: "Copy answer",
  },
};

export function getResultOverlayText(
  language: InterfaceLanguage | undefined,
): ResultOverlayText {
  return RESULT_OVERLAY_TEXT[language ?? "zh-CN"] ?? RESULT_OVERLAY_TEXT["zh-CN"];
}

export function getResultCopyTooltipLabel(
  copied: boolean,
  language?: InterfaceLanguage,
): string {
  const text = getResultOverlayText(language);
  return copied ? text.copied : text.copy;
}

export function ResultOverlayPanel({
  result,
  text,
  onDismiss,
}: ResultOverlayPanelProps): React.JSX.Element {
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
