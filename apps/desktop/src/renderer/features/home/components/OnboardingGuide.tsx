import { useEffect, useState } from "react";
import type { AppSettings } from "@voice/shared";
import {
  buildMicrophoneAudioConstraints,
  MicrophoneDevicePicker
} from "../../../shared/ui/MicrophoneDevicePicker";
import { formatShortcutLabel } from "../../../shared/keyboard/shortcutCapture";

type EditableShortcutKey =
  | "toggleRecording"
  | "processSelection"
  | "translateDictation";

function getShortcutDisplay(
  settings: AppSettings | undefined,
  key: EditableShortcutKey
): string {
  const shortcut = settings?.shortcuts[key];
  return shortcut ? formatShortcutLabel(shortcut) : "-";
}
interface OnboardingStep {
  label: string;
  title: string;
  eyebrow: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    label: "許可權設定",
    title: "感謝您的信任",
    eyebrow: "設定"
  },
  {
    label: "麥克風",
    title: "口述以測試您的麥克風",
    eyebrow: "設定"
  },
  {
    label: "快捷鍵",
    title: "按下以測試您的語音輸入快捷鍵",
    eyebrow: "體驗一下"
  },
  {
    label: "開始使用",
    title: "說話，別打字",
    eyebrow: "完成"
  }
];

export function OnboardingGuide({
  settings,
  initialStep,
  onClose,
  onOpenSettings,
  onSettingsChange
}: {
  settings: AppSettings | undefined;
  initialStep?: number;
  onClose(): void;
  onOpenSettings(): void;
  onSettingsChange(
    updater: AppSettings | ((draft: AppSettings) => AppSettings)
  ): void;
}): React.JSX.Element {
  const [stepIndex, setStepIndex] = useState(() =>
    clampOnboardingStep(initialStep ?? 0)
  );
  const [shortcutPressed, setShortcutPressed] = useState(false);
  const shortcut = settings?.shortcuts.toggleRecording || "RightAlt";
  const shortcutLabel = formatShortcutLabel(shortcut);
  const shortcutLabels = {
    toggleRecording: getShortcutDisplay(settings, "toggleRecording"),
    processSelection: getShortcutDisplay(settings, "processSelection"),
    translateDictation: getShortcutDisplay(settings, "translateDictation")
  };
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (!shouldSuspendGlobalShortcutsForOnboardingStep(stepIndex)) {
      return;
    }

    let disposed = false;
    let suspended = false;
    void window.voiceAI
      .setShortcutCaptureActive(true)
      .then(() => {
        suspended = true;
        if (disposed) {
          void window.voiceAI.setShortcutCaptureActive(false);
        }
      })
      .catch((error) => {
        console.warn("[onboarding] Failed to suspend global shortcuts", error);
      });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (matchesShortcutEvent(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        setShortcutPressed(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      disposed = true;
      window.removeEventListener("keydown", handleKeyDown, true);
      if (suspended) {
        void window.voiceAI.setShortcutCaptureActive(false);
      }
    };
  }, [shortcut, stepIndex]);

  const goNext = (): void => {
    if (isLastStep) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1));
  };

  const goBack = (): void => {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <div
      className="onboarding-guide"
      role="dialog"
      aria-modal="true"
      aria-label="首次引導"
    >
      <div className="onboarding-guide__chrome">
        <ol className="onboarding-guide__steps" aria-label="引導進度">
          {ONBOARDING_STEPS.map((item, index) => (
            <li
              key={item.label}
              className={index === stepIndex ? "onboarding-guide__step--active" : ""}
            >
              {item.eyebrow}
            </li>
          ))}
        </ol>
        <div
          className="onboarding-guide__progress"
          style={
            {
              "--onboarding-progress": `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`
            } as React.CSSProperties
          }
        />
      </div>

      <button className="onboarding-guide__back" type="button" onClick={goBack}>
        <span aria-hidden="true">←</span>
        返回
      </button>
      <button
        className="onboarding-guide__close"
        type="button"
        aria-label="關閉首次引導"
        onClick={onClose}
      >
        ×
      </button>

      {stepIndex === 0 && (
        <OnboardingPermissionsStep onNext={goNext} onOpenSettings={onOpenSettings} />
      )}
      {stepIndex === 1 && (
        <OnboardingMicrophoneStep
          inputDeviceId={settings?.recording.inputDeviceId ?? ""}
          onDeviceChange={(deviceId) =>
            onSettingsChange((current) => ({
              ...current,
              recording: {
                ...current.recording,
                inputDeviceId: deviceId
              }
            }))
          }
          onNext={goNext}
        />
      )}
      {stepIndex === 2 && (
        <OnboardingShortcutStep
          shortcut={shortcutLabel}
          shortcutPressed={shortcutPressed}
          onNext={goNext}
          onOpenSettings={onOpenSettings}
        />
      )}
      {stepIndex === 3 && (
        <OnboardingReadyStep shortcuts={shortcutLabels} onNext={goNext} />
      )}
    </div>
  );
}

function clampOnboardingStep(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, Math.floor(value)));
}

export function shouldSuspendGlobalShortcutsForOnboardingStep(stepIndex: number): boolean {
  return stepIndex === 2;
}

function matchesShortcutEvent(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  return parts.every((part) => {
    switch (part) {
      case "rightalt":
      case "right alt":
        return event.code === "AltRight" || (event.key === "Alt" && event.location === 2);
      case "leftalt":
      case "left alt":
        return event.code === "AltLeft" || (event.key === "Alt" && event.location === 1);
      case "rightshift":
      case "right shift":
        return event.code === "ShiftRight" || (event.key === "Shift" && event.location === 2);
      case "leftshift":
      case "left shift":
        return event.code === "ShiftLeft" || (event.key === "Shift" && event.location === 1);
      case "space":
        return event.code === "Space" || event.key === " ";
      default:
        return event.key.toLowerCase() === part;
    }
  });
}

type MicrophoneLevelStatus = "idle" | "listening" | "unavailable" | "error";

interface MicrophoneLevelState {
  level: number;
  status: MicrophoneLevelStatus;
  message?: string;
}

function useMicrophoneLevel(inputDeviceId: string): MicrophoneLevelState {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<MicrophoneLevelStatus>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setLevel(0);
      setStatus("unavailable");
      setMessage("當前環境無法讀取麥克風。");
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      setLevel(0);
      setStatus("unavailable");
      setMessage("當前環境無法檢測麥克風音量。");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;
    let animationFrame = 0;

    const startMeter = async (): Promise<void> => {
      try {
        setStatus("idle");
        setMessage(undefined);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: buildMicrophoneAudioConstraints(inputDeviceId)
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContextConstructor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const tick = (): void => {
          analyser.getByteTimeDomainData(samples);
          setLevel(calculateMicrophoneLevel(samples));
          setStatus("listening");
          animationFrame = window.requestAnimationFrame(tick);
        };

        tick();
      } catch (error) {
        if (!cancelled) {
          setLevel(0);
          setStatus("error");
          setMessage(`麥克風檢測失敗：${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    void startMeter();

    return () => {
      cancelled = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [inputDeviceId]);

  return message === undefined ? { level, status } : { level, status, message };
}

export function calculateMicrophoneLevel(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const sample of samples) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 6);
}

export function buildMicrophoneLevelBarStyles(
  level: number,
  count: number
): Array<{ active: boolean; height: number }> {
  const safeCount = Math.max(0, Math.floor(count));
  const normalizedLevel = Math.max(0, Math.min(1, level));
  const activeCount = Math.min(safeCount, Math.max(1, Math.ceil(normalizedLevel * safeCount)));

  return Array.from({ length: safeCount }, (_, index) => {
    const threshold = (index + 1) / Math.max(1, safeCount);
    const active = index < activeCount && normalizedLevel > 0;
    return {
      active,
      height: active ? Math.max(0.28, Math.min(1, normalizedLevel / threshold)) : 0
    };
  });
}

function OnboardingPermissionsStep({
  onNext,
  onOpenSettings
}: {
  onNext(): void;
  onOpenSettings(): void;
}): React.JSX.Element {
  return (
    <section className="onboarding-guide__split onboarding-guide__split--permissions">
      <div className="onboarding-guide__copy">
        <p className="onboarding-guide__kicker">許可權確認</p>
        <h1>隱私清楚，使用才安心</h1>
        <p className="onboarding-guide__intro">
          妙音只在需要時使用這些能力，您也可以稍後在設定裡重新調整。
        </p>
        <div className="onboarding-guide__trust-strip" aria-label="隱私處理摘要">
          <span>本機優先</span>
          <span>可隨時調整</span>
          <span>按需傳送</span>
        </div>
        <div className="onboarding-permissions">
          <div className="onboarding-permissions__header">
            <span>權限檢視</span>
            <strong>5 項能力已整理</strong>
            <small>每一項都只服務於語音輸入和文字處理流程。</small>
          </div>
          <OnboardingPermissionRow
            title="使用麥克風"
            description="錄音轉寫，並檢測麥克風音量。"
            checked
          />
          <OnboardingPermissionRow
            title="寫入當前應用"
            description="把轉寫結果輸入到當前文本框。"
            checked
          />
          <OnboardingPermissionRow
            title="讀取剪貼簿和選中文本"
            description="處理選區、翻譯選區，並在粘貼後恢復剪貼簿。"
            checked
          />
          <OnboardingPermissionRow
            title="監聽全域性快捷鍵"
            description="在其他應用中喚起語音輸入。"
            checked
          />
          <OnboardingPermissionRow
            title="按需傳送到雲端"
            description="僅在轉寫、潤色、翻譯和問答時處理必要內容。"
            checked
          />
        </div>
        <div className="onboarding-guide__actions">
          <button className="onboarding-guide__secondary" type="button" onClick={onOpenSettings}>
            先檢查設定
          </button>
          <button className="onboarding-guide__primary" type="button" onClick={onNext}>
            繼續
          </button>
        </div>
      </div>
      <div className="onboarding-guide__visual" aria-hidden="true">
        <div className="onboarding-privacy-card">
          <PrivacyPoint icon="本機" title="歷史記錄在本機" text="記錄預設保留在您的裝置上。" />
          <PrivacyPoint icon="可控" title="許可權可隨時檢查" text="每項能力都能回到設定裡檢視。" />
          <PrivacyPoint icon="必要" title="雲端只處理必要內容" text="轉寫和後處理時才傳送。" />
        </div>
      </div>
    </section>
  );
}

function OnboardingPermissionRow({
  title,
  description,
  checked
}: {
  title: string;
  description: string;
  checked: boolean;
}): React.JSX.Element {
  return (
    <article className="onboarding-permission-row">
      <span className="onboarding-permission-row__index" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <span className="onboarding-permission-row__check" aria-label={checked ? "已允許" : "未允許"}>
        {checked ? "✓" : "!"}
      </span>
    </article>
  );
}

function PrivacyPoint({
  icon,
  title,
  text
}: {
  icon: string;
  title: string;
  text: string;
}): React.JSX.Element {
  return (
    <div className="onboarding-privacy-card__item">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function OnboardingMicrophoneStep({
  inputDeviceId,
  onDeviceChange,
  onNext
}: {
  inputDeviceId: string;
  onDeviceChange(deviceId: string): void;
  onNext(): void;
}): React.JSX.Element {
  const [pickerOpenSignal, setPickerOpenSignal] = useState(0);
  const micLevel = useMicrophoneLevel(inputDeviceId);
  const bars = buildMicrophoneLevelBarStyles(micLevel.level, 15);

  return (
    <section className="onboarding-guide__split onboarding-guide__split--microphone">
      <div className="onboarding-guide__copy">
        <h1>口述以測試您的麥克風</h1>
        <p>您計算機內建或外接的麥克風會影響轉寫效果。</p>
        <strong className="onboarding-guide__question">
          您在說話時看到藍色條形圖在移動嗎？
        </strong>
        <MicrophoneDevicePicker
          selectedDeviceId={inputDeviceId}
          onDeviceChange={onDeviceChange}
          openSignal={pickerOpenSignal}
          selectId="onboarding-microphone-device"
          hideTrigger
        />
        {micLevel.message && (
          <p className="onboarding-guide__status">{micLevel.message}</p>
        )}
        <div className="onboarding-guide__actions">
          <button
            className="onboarding-guide__secondary"
            type="button"
            aria-label="開啟麥克風選擇"
            onClick={() => setPickerOpenSignal((current) => current + 1)}
          >
            不，換個麥克風
          </button>
          <button className="onboarding-guide__primary" type="button" onClick={onNext}>
            是的，繼續
          </button>
        </div>
      </div>
      <div className="onboarding-guide__visual" aria-hidden="true">
        <div
          className="onboarding-meter"
          data-state={micLevel.status}
          style={{ "--mic-level": micLevel.level } as React.CSSProperties}
        >
          {bars.map((bar, index) => (
            <span key={index} className="onboarding-meter__bar">
              <span
                className="onboarding-meter__bar-fill"
                style={{ transform: `scaleY(${bar.height})` }}
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function OnboardingShortcutStep({
  shortcut,
  shortcutPressed,
  onNext,
  onOpenSettings
}: {
  shortcut: string;
  shortcutPressed: boolean;
  onNext(): void;
  onOpenSettings(): void;
}): React.JSX.Element {
  return (
    <section className="onboarding-guide__split onboarding-guide__split--shortcut">
      <div className="onboarding-guide__copy">
        <h1>按下以測試您的語音輸入快捷鍵</h1>
        <p>
          我們推薦使用 <OnboardingKey>{shortcut}</OnboardingKey>，按下時右側文字和邊框會變藍。
        </p>
        <strong className="onboarding-guide__question">
          按下時，您看到 {shortcut} 變藍了嗎？
        </strong>
        <div className="onboarding-guide__actions">
          <button className="onboarding-guide__secondary" type="button" onClick={onOpenSettings}>
            不，換個鍵盤快捷鍵
          </button>
          <button
            className="onboarding-guide__primary"
            type="button"
            disabled={!shortcutPressed}
            onClick={onNext}
          >
            是的，繼續
          </button>
        </div>
      </div>
      <div className="onboarding-guide__visual" aria-hidden="true">
        <div className={buildOnboardingShortcutDemoClassName(shortcutPressed)}>
          {shortcut}
        </div>
      </div>
    </section>
  );
}

export function buildOnboardingShortcutDemoClassName(shortcutPressed: boolean): string {
  return `onboarding-shortcut-demo${shortcutPressed ? " onboarding-shortcut-demo--pressed" : ""
    }`;
}

function OnboardingReadyStep({
  shortcuts,
  onNext
}: {
  shortcuts: Record<EditableShortcutKey, string>;
  onNext(): void;
}): React.JSX.Element {
  return (
    <section className="onboarding-guide__ready">
      <h1 aria-label="說話，別打字">
        <span>說話，</span>
        <span>別打字</span>
      </h1>
      <div className="onboarding-shortcut-grid" aria-label="快捷鍵概覽">
        <article className="onboarding-shortcut-card">
          <strong>語音輸入</strong>
          <OnboardingKey>{shortcuts.toggleRecording}</OnboardingKey>
        </article>
        <article className="onboarding-shortcut-card">
          <strong>翻譯</strong>
          <OnboardingKey>{shortcuts.translateDictation}</OnboardingKey>
        </article>
        <article className="onboarding-shortcut-card">
          <strong>問任何問題</strong>
          <OnboardingKey>{shortcuts.processSelection}</OnboardingKey>
        </article>
      </div>
      <button className="onboarding-guide__primary" type="button" onClick={onNext}>
        我們出發吧
      </button>
    </section>
  );
}

function OnboardingKey({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <kbd className="onboarding-key">{children}</kbd>;
}
