import { useEffect, useId, useRef, useState } from "react";
import type { InterfaceLanguage } from "@voice/shared";
import {
  type CreateShortcutCaptureHandlersOptions,
  createShortcutCaptureHandlers,
  formatShortcutLabel,
} from "./shortcutCapture";
import { ThemedIcon } from "../../shared/ui/ThemedIcon";

interface ShortcutRecorderProps {
  value: string;
  onChange(value: string): void;
  defaultValue?: string;
  existingShortcuts?: string[];
  language?: InterfaceLanguage | undefined;
  disabled?: boolean;
}

type ShortcutRecorderText = {
  pauseShortcutFailedPrefix: string;
  invalidShortcut: string;
  recordingAria: string;
  idleAria: string;
  recordingLabel: string;
  resetAria: string;
};

const SHORTCUT_RECORDER_TEXT: Record<InterfaceLanguage, ShortcutRecorderText> =
  {
    "zh-CN": {
      pauseShortcutFailedPrefix: "无法暂停全局快捷键：",
      invalidShortcut: "请按下一个快捷键",
      recordingAria: "正在录入快捷键",
      idleAria: "点击录入快捷键",
      recordingLabel: "输入快捷键",
      resetAria: "重置为默认快捷键",
    },
    "zh-TW": {
      pauseShortcutFailedPrefix: "無法暫停全域快捷鍵：",
      invalidShortcut: "請按下一個快捷鍵",
      recordingAria: "正在錄入快捷鍵",
      idleAria: "點擊錄入快捷鍵",
      recordingLabel: "輸入快捷鍵",
      resetAria: "重置為預設快捷鍵",
    },
    "en-US": {
      pauseShortcutFailedPrefix: "Unable to pause global shortcuts: ",
      invalidShortcut: "Press a shortcut",
      recordingAria: "Recording shortcut",
      idleAria: "Click to record shortcut",
      recordingLabel: "Press shortcut",
      resetAria: "Reset to default shortcut",
    },
  };

function getShortcutRecorderText(
  language: InterfaceLanguage | undefined,
): ShortcutRecorderText {
  return (
    SHORTCUT_RECORDER_TEXT[language ?? "zh-CN"] ??
    SHORTCUT_RECORDER_TEXT["zh-CN"]
  );
}

export function ShortcutRecorder({
  value,
  onChange,
  defaultValue,
  existingShortcuts,
  language,
  disabled = false,
}: ShortcutRecorderProps): React.JSX.Element {
  const text = getShortcutRecorderText(language);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState<string | undefined>(undefined);
  const [invalidValue, setInvalidValue] = useState<string | undefined>(
    undefined,
  );
  const baseId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const latestCaptureConfigRef = useRef({
    existingShortcuts,
    onChange,
    text,
    value,
  });

  useEffect(() => {
    latestCaptureConfigRef.current = {
      existingShortcuts,
      onChange,
      text,
      value,
    };
  }, [existingShortcuts, onChange, text, value]);

  useEffect(() => {
    if (!recording) {
      return;
    }

    buttonRef.current?.focus();
    const captureConfig = latestCaptureConfigRef.current;

    const captureOptions: CreateShortcutCaptureHandlersOptions = {
      currentShortcut: captureConfig.value,
      onCapture: (accelerator) => {
        latestCaptureConfigRef.current.onChange(accelerator);
        setRecording(false);
        setHint(undefined);
        setInvalidValue(undefined);
      },
      onCancel: () => {
        setRecording(false);
        setHint(undefined);
        setInvalidValue(undefined);
      },
      onInvalid: (message, accelerator) => {
        setHint(message || latestCaptureConfigRef.current.text.invalidShortcut);
        setInvalidValue(accelerator);
      },
    };
    if (captureConfig.existingShortcuts) {
      captureOptions.existingShortcuts = captureConfig.existingShortcuts;
    }
    const handlers = createShortcutCaptureHandlers(captureOptions);

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && fieldRef.current?.contains(target)) {
        return;
      }
      setRecording(false);
      setHint(undefined);
      setInvalidValue(undefined);
    };

    window.addEventListener("keydown", handlers.handleKeyDown, true);
    window.addEventListener("keyup", handlers.handleKeyUp, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    const unsubscribeShortcutCaptureAccelerator =
      window.voiceAI.onShortcutCaptureAccelerator(({ accelerator }) => {
        handlers.capture(accelerator);
      });

    return () => {
      void window.voiceAI.setShortcutCaptureActive(false);
      window.removeEventListener("keydown", handlers.handleKeyDown, true);
      window.removeEventListener("keyup", handlers.handleKeyUp, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      unsubscribeShortcutCaptureAccelerator();
      handlers.reset();
    };
  }, [recording]);

  const startRecording = async (): Promise<void> => {
    if (disabled) {
      return;
    }
    setHint(undefined);
    setInvalidValue(undefined);
    try {
      await window.voiceAI.setShortcutCaptureActive(true);
      setRecording(true);
    } catch (error) {
      setHint(
        `${text.pauseShortcutFailedPrefix}${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const stopRecording = (): void => {
    setRecording(false);
    setHint(undefined);
    setInvalidValue(undefined);
  };

  const canReset = Boolean(defaultValue && value !== defaultValue);
  const errorId = hint ? `${baseId}-shortcut-recorder-error` : undefined;
  const buttonClassName = [
    "settings-shortcut-recorder",
    recording ? "settings-shortcut-recorder--recording" : "",
    hint ? "settings-shortcut-recorder--invalid" : "",
    invalidValue ? "settings-shortcut-recorder--invalid-value" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={fieldRef} className="settings-shortcut-recorder-field">
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        disabled={disabled}
        aria-label={recording ? text.recordingAria : text.idleAria}
        aria-invalid={hint ? true : undefined}
        aria-describedby={errorId}
        onClick={() => {
          if (recording) {
            stopRecording();
            return;
          }
          void startRecording();
        }}
      >
        {invalidValue
          ? formatShortcutLabel(invalidValue)
          : recording
            ? text.recordingLabel
            : formatShortcutLabel(value)}
      </button>
      {defaultValue ? (
        <button
          type="button"
          className="settings-shortcut-recorder__reset"
          disabled={disabled || !canReset}
          aria-label={text.resetAria}
          onClick={(event) => {
            event.stopPropagation();
            if (!canReset) {
              return;
            }
            setRecording(false);
            setHint(undefined);
            setInvalidValue(undefined);
            onChange(defaultValue);
          }}
        >
          <ThemedIcon name="refresh" mode="mask" />
        </button>
      ) : null}
      {hint ? (
        <p
          id={errorId}
          className="settings-shortcut-recorder__error"
          role="alert"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
