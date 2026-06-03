import { useEffect, useId, useRef, useState } from "react";
import {
  createShortcutCaptureHandlers,
  formatShortcutLabel
} from "./shortcutCapture";

interface ShortcutRecorderProps {
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
}

export function ShortcutRecorder({
  value,
  onChange,
  disabled = false
}: ShortcutRecorderProps): React.JSX.Element {
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
        setHint(message);
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
  }, [onChange, recording]);

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
        `无法暂停全局快捷键：${error instanceof Error ? error.message : String(error)}`
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
        aria-label={recording ? "正在录入快捷键" : "点击录入快捷键"}
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
        {recording ? "输入快捷键" : formatShortcutLabel(value)}
      </button>
      {hint ? (
        <p id={errorId} className="settings-shortcut-recorder__error" role="alert">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
