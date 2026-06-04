import { useEffect, useId, useRef, useState } from "react";
import type { InterfaceLanguage } from "@voice/shared";
import {
  createShortcutCaptureHandlers,
  formatShortcutLabel
} from "./shortcutCapture";

interface ShortcutRecorderProps {
  value: string;
  onChange(value: string): void;
  language?: InterfaceLanguage | undefined;
  disabled?: boolean;
}

type ShortcutRecorderText = {
  pauseShortcutFailedPrefix: string;
  invalidShortcut: string;
  recordingAria: string;
  idleAria: string;
  recordingLabel: string;
};

const SHORTCUT_RECORDER_TEXT: Record<InterfaceLanguage, ShortcutRecorderText> = {
  "zh-CN": {
    pauseShortcutFailedPrefix: "无法暂停全局快捷键：",
    invalidShortcut: "请按下一个快捷键",
    recordingAria: "正在录入快捷键",
    idleAria: "点击录入快捷键",
    recordingLabel: "输入快捷键"
  },
  "zh-TW": {
    pauseShortcutFailedPrefix: "無法暫停全域快捷鍵：",
    invalidShortcut: "請按下一個快捷鍵",
    recordingAria: "正在錄入快捷鍵",
    idleAria: "點擊錄入快捷鍵",
    recordingLabel: "輸入快捷鍵"
  },
  "en-US": {
    pauseShortcutFailedPrefix: "Unable to pause global shortcuts: ",
    invalidShortcut: "Press a shortcut",
    recordingAria: "Recording shortcut",
    idleAria: "Click to record shortcut",
    recordingLabel: "Press shortcut"
  }
};

function getShortcutRecorderText(language: InterfaceLanguage | undefined): ShortcutRecorderText {
  return SHORTCUT_RECORDER_TEXT[language ?? "zh-CN"] ?? SHORTCUT_RECORDER_TEXT["zh-CN"];
}

export function ShortcutRecorder({
  value,
  onChange,
  language,
  disabled = false
}: ShortcutRecorderProps): React.JSX.Element {
  const text = getShortcutRecorderText(language);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState<string | undefined>(undefined);
  const baseId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) {
      return;
    }

    buttonRef.current?.focus();

    const handlers = createShortcutCaptureHandlers({
      onCapture: (accelerator) => {
        onChange(accelerator);
        setRecording(false);
        setHint(undefined);
      },
      onCancel: () => {
        setRecording(false);
        setHint(undefined);
      },
      onInvalid: (message) => {
        setHint(message ? text.invalidShortcut : text.invalidShortcut);
      }
    });

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && fieldRef.current?.contains(target)) {
        return;
      }
      setRecording(false);
      setHint(undefined);
    };

    window.addEventListener("keydown", handlers.handleKeyDown, true);
    window.addEventListener("keyup", handlers.handleKeyUp, true);
    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      void window.voiceAI.setShortcutCaptureActive(false);
      window.removeEventListener("keydown", handlers.handleKeyDown, true);
      window.removeEventListener("keyup", handlers.handleKeyUp, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      handlers.reset();
    };
  }, [onChange, recording, text]);

  const startRecording = async (): Promise<void> => {
    if (disabled) {
      return;
    }
    setHint(undefined);
    try {
      await window.voiceAI.setShortcutCaptureActive(true);
      setRecording(true);
    } catch (error) {
      setHint(
        `${text.pauseShortcutFailedPrefix}${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const stopRecording = (): void => {
    setRecording(false);
    setHint(undefined);
  };

  const errorId = hint ? `${baseId}-shortcut-recorder-error` : undefined;
  const buttonClassName = [
    "settings-shortcut-recorder",
    recording ? "settings-shortcut-recorder--recording" : "",
    hint ? "settings-shortcut-recorder--invalid" : ""
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
        {recording ? text.recordingLabel : formatShortcutLabel(value)}
      </button>
      {hint ? (
        <p id={errorId} className="settings-shortcut-recorder__error" role="alert">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
