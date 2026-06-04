import { useEffect, useState } from "react";
import type { AppSettings } from "@voice/shared";
import {
  buildMicrophoneAudioConstraints,
  MicrophoneDevicePicker,
  MicrophoneLevelMeter
} from "../../../shared/ui/MicrophoneDevicePicker";
import {
  calculateActiveMeterBars,
  calculateRms,
  MICROPHONE_METER_ATTACK_SMOOTHING,
  MICROPHONE_METER_RELEASE_SMOOTHING,
  MICROPHONE_METER_UPDATE_INTERVAL_MS
} from "../../../shared/ui/MicrophoneDevicePicker/meterStrategy";
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

type OnboardingLanguage = AppSettings["ui"]["language"];

interface OnboardingText {
  ariaLabel: string;
  progressLabel: string;
  back: string;
  closeGuide: string;
  permissionAllowed: string;
  permissionDenied: string;
  steps: readonly OnboardingStep[];
  permissions: {
    kicker: string;
    title: string;
    intro: string;
    trust: readonly string[];
    trustSummary: string;
    header: string;
    count: string;
    note: string;
    rows: readonly { title: string; description: string }[];
    checkSettings: string;
    continue: string;
    privacyPoints: readonly { icon: string; title: string; text: string }[];
  };
  microphone: {
    title: string;
    description: string;
    question: string;
    openPicker: string;
    changeMicrophone: string;
    continueYes: string;
    cannotRead: string;
    cannotDetect: string;
    failedPrefix: string;
  };
  shortcut: {
    title: string;
    descriptionPrefix: string;
    descriptionSuffix: string;
    questionPrefix: string;
    questionSuffix: string;
    changeShortcut: string;
    continueYes: string;
  };
  ready: {
    ariaLabel: string;
    firstLine: string;
    secondLine: string;
    shortcutsLabel: string;
    voiceInput: string;
    translate: string;
    askAnything: string;
    cta: string;
  };
}

const ONBOARDING_STEP_COUNT = 4;

const ONBOARDING_TEXT: Record<OnboardingLanguage, OnboardingText> = {
  "zh-CN": {
    ariaLabel: "首次引导",
    progressLabel: "引导进度",
    back: "返回",
    closeGuide: "关闭首次引导",
    permissionAllowed: "已允许",
    permissionDenied: "未允许",
    steps: [
      { label: "权限设置", title: "感谢您的信任", eyebrow: "设置" },
      { label: "麦克风", title: "口述以测试您的麦克风", eyebrow: "设置" },
      { label: "快捷键", title: "按下以测试您的语音输入快捷键", eyebrow: "体验一下" },
      { label: "开始使用", title: "说话，别打字", eyebrow: "完成" }
    ],
    permissions: {
      kicker: "权限确认",
      title: "隐私清楚，使用才安心",
      intro: "妙音只在需要时使用这些能力，您也可以稍后在设置里重新调整。",
      trust: ["本机优先", "可随时调整", "按需传送"],
      trustSummary: "隐私处理摘要",
      header: "权限检视",
      count: "5 项能力已整理",
      note: "每一项都只服务于语音输入和文字处理流程。",
      rows: [
        { title: "使用麦克风", description: "录音转写，并检测麦克风音量。" },
        { title: "写入当前应用", description: "把转写结果输入到当前文本框。" },
        { title: "读取剪贴板和选中文本", description: "处理选区、翻译选区，并在粘贴后恢复剪贴板。" },
        { title: "监听全局快捷键", description: "在其他应用中唤起语音输入。" },
        { title: "按需传送到云端", description: "仅在转写、润色、翻译和问答时处理必要内容。" }
      ],
      checkSettings: "先检查设置",
      continue: "继续",
      privacyPoints: [
        { icon: "本机", title: "历史记录在本机", text: "记录默认保留在您的设备上。" },
        { icon: "可控", title: "权限可随时检查", text: "每项能力都能回到设置里检视。" },
        { icon: "必要", title: "云端只处理必要内容", text: "转写和后处理时才传送。" }
      ]
    },
    microphone: {
      title: "口述以测试您的麦克风",
      description: "您计算机内置或外接的麦克风会影响转写效果。",
      question: "您在说话时看到蓝色条形图在移动吗？",
      openPicker: "打开麦克风选择",
      changeMicrophone: "不，换个麦克风",
      continueYes: "是的，继续",
      cannotRead: "当前环境无法读取麦克风。",
      cannotDetect: "当前环境无法检测麦克风音量。",
      failedPrefix: "麦克风检测失败："
    },
    shortcut: {
      title: "按下以测试您的语音输入快捷键",
      descriptionPrefix: "我们推荐使用 ",
      descriptionSuffix: "，按下时右侧文字和边框会变蓝。",
      questionPrefix: "按下时，您看到 ",
      questionSuffix: " 变蓝了吗？",
      changeShortcut: "不，换个键盘快捷键",
      continueYes: "是的，继续"
    },
    ready: {
      ariaLabel: "说话，别打字",
      firstLine: "说话，",
      secondLine: "别打字",
      shortcutsLabel: "快捷键概览",
      voiceInput: "语音输入",
      translate: "翻译",
      askAnything: "问任何问题",
      cta: "我们出发吧"
    }
  },
  "zh-TW": {
    ariaLabel: "首次引導",
    progressLabel: "引導進度",
    back: "返回",
    closeGuide: "關閉首次引導",
    permissionAllowed: "已允許",
    permissionDenied: "未允許",
    steps: [
      { label: "許可權設定", title: "感謝您的信任", eyebrow: "設定" },
      { label: "麥克風", title: "口述以測試您的麥克風", eyebrow: "設定" },
      { label: "快捷鍵", title: "按下以測試您的語音輸入快捷鍵", eyebrow: "體驗一下" },
      { label: "開始使用", title: "說話，別打字", eyebrow: "完成" }
    ],
    permissions: {
      kicker: "許可權確認",
      title: "隱私清楚，使用才安心",
      intro: "妙音只在需要時使用這些能力，您也可以稍後在設定裡重新調整。",
      trust: ["本機優先", "可隨時調整", "按需傳送"],
      trustSummary: "隱私處理摘要",
      header: "權限檢視",
      count: "5 項能力已整理",
      note: "每一項都只服務於語音輸入和文字處理流程。",
      rows: [
        { title: "使用麥克風", description: "錄音轉寫，並檢測麥克風音量。" },
        { title: "寫入當前應用", description: "把轉寫結果輸入到當前文本框。" },
        { title: "讀取剪貼簿和選中文本", description: "處理選區、翻譯選區，並在粘貼後恢復剪貼簿。" },
        { title: "監聽全域性快捷鍵", description: "在其他應用中喚起語音輸入。" },
        { title: "按需傳送到雲端", description: "僅在轉寫、潤色、翻譯和問答時處理必要內容。" }
      ],
      checkSettings: "先檢查設定",
      continue: "繼續",
      privacyPoints: [
        { icon: "本機", title: "歷史記錄在本機", text: "記錄預設保留在您的裝置上。" },
        { icon: "可控", title: "許可權可隨時檢查", text: "每項能力都能回到設定裡檢視。" },
        { icon: "必要", title: "雲端只處理必要內容", text: "轉寫和後處理時才傳送。" }
      ]
    },
    microphone: {
      title: "口述以測試您的麥克風",
      description: "您計算機內建或外接的麥克風會影響轉寫效果。",
      question: "您在說話時看到藍色條形圖在移動嗎？",
      openPicker: "開啟麥克風選擇",
      changeMicrophone: "不，換個麥克風",
      continueYes: "是的，繼續",
      cannotRead: "當前環境無法讀取麥克風。",
      cannotDetect: "當前環境無法檢測麥克風音量。",
      failedPrefix: "麥克風檢測失敗："
    },
    shortcut: {
      title: "按下以測試您的語音輸入快捷鍵",
      descriptionPrefix: "我們推薦使用 ",
      descriptionSuffix: "，按下時右側文字和邊框會變藍。",
      questionPrefix: "按下時，您看到 ",
      questionSuffix: " 變藍了嗎？",
      changeShortcut: "不，換個鍵盤快捷鍵",
      continueYes: "是的，繼續"
    },
    ready: {
      ariaLabel: "說話，別打字",
      firstLine: "說話，",
      secondLine: "別打字",
      shortcutsLabel: "快捷鍵概覽",
      voiceInput: "語音輸入",
      translate: "翻譯",
      askAnything: "問任何問題",
      cta: "我們出發吧"
    }
  },
  "en-US": {
    ariaLabel: "Onboarding guide",
    progressLabel: "Onboarding progress",
    back: "Back",
    closeGuide: "Close onboarding guide",
    permissionAllowed: "Allowed",
    permissionDenied: "Not allowed",
    steps: [
      { label: "Permissions", title: "Thanks for your trust", eyebrow: "Setup" },
      { label: "Microphone", title: "Dictate to test your microphone", eyebrow: "Setup" },
      { label: "Shortcut", title: "Press your voice input shortcut", eyebrow: "Try it" },
      { label: "Ready", title: "Speak, don't type", eyebrow: "Done" }
    ],
    permissions: {
      kicker: "Permission Check",
      title: "Clear Privacy, Confident Use",
      intro: "Voice Assistant uses these abilities only when needed. You can adjust them later in Settings.",
      trust: ["Local first", "Always adjustable", "Sent only when needed"],
      trustSummary: "Privacy summary",
      header: "Permission Review",
      count: "5 capabilities organized",
      note: "Each one only supports the voice input and text processing flow.",
      rows: [
        { title: "Use Microphone", description: "Record and transcribe speech, and detect microphone volume." },
        { title: "Write to Current App", description: "Insert transcription results into the active text field." },
        { title: "Read Clipboard and Selection", description: "Process or translate selected text, then restore the clipboard after paste." },
        { title: "Listen for Global Shortcuts", description: "Start voice input while using other apps." },
        { title: "Send to Cloud When Needed", description: "Only necessary content is processed for transcription, polishing, translation, and Q&A." }
      ],
      checkSettings: "Check Settings",
      continue: "Continue",
      privacyPoints: [
        { icon: "Local", title: "History stays local", text: "Records are kept on your device by default." },
        { icon: "Control", title: "Permissions are reviewable", text: "Every capability can be checked again in Settings." },
        { icon: "Needed", title: "Cloud only gets what it needs", text: "Content is sent only during transcription and post-processing." }
      ]
    },
    microphone: {
      title: "Dictate to Test Your Microphone",
      description: "Your built-in or external microphone affects transcription quality.",
      question: "Do you see the blue bars move while speaking?",
      openPicker: "Open microphone picker",
      changeMicrophone: "No, change microphone",
      continueYes: "Yes, continue",
      cannotRead: "This environment cannot read the microphone.",
      cannotDetect: "This environment cannot detect microphone volume.",
      failedPrefix: "Microphone detection failed: "
    },
    shortcut: {
      title: "Press Your Voice Input Shortcut",
      descriptionPrefix: "We recommend ",
      descriptionSuffix: ". When pressed, the text and border on the right turn blue.",
      questionPrefix: "When you press it, do you see ",
      questionSuffix: " turn blue?",
      changeShortcut: "No, change keyboard shortcut",
      continueYes: "Yes, continue"
    },
    ready: {
      ariaLabel: "Speak, don't type",
      firstLine: "Speak,",
      secondLine: "don't type",
      shortcutsLabel: "Shortcut overview",
      voiceInput: "Voice Input",
      translate: "Translate",
      askAnything: "Ask Anything",
      cta: "Let's go"
    }
  }
};

function getOnboardingText(language: OnboardingLanguage | undefined): OnboardingText {
  return ONBOARDING_TEXT[language ?? "zh-CN"] ?? ONBOARDING_TEXT["zh-CN"];
}

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
  const text = getOnboardingText(settings?.ui.language);
  const steps = text.steps;
  const isLastStep = stepIndex === steps.length - 1;

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
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
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
      aria-label={text.ariaLabel}
    >
      <div className="onboarding-guide__chrome">
        <ol className="onboarding-guide__steps" aria-label={text.progressLabel}>
          {steps.map((item, index) => (
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
              "--onboarding-progress": `${((stepIndex + 1) / steps.length) * 100}%`
            } as React.CSSProperties
          }
        />
      </div>

      <button className="onboarding-guide__back" type="button" onClick={goBack}>
        <span aria-hidden="true">←</span>
        {text.back}
      </button>
      <button
        className="onboarding-guide__close"
        type="button"
        aria-label={text.closeGuide}
        onClick={onClose}
      >
        ×
      </button>

      {stepIndex === 0 && (
        <OnboardingPermissionsStep text={text} onNext={goNext} onOpenSettings={onOpenSettings} />
      )}
      {stepIndex === 1 && (
        <OnboardingMicrophoneStep
          inputDeviceId={settings?.recording.inputDeviceId ?? ""}
          language={settings?.ui.language}
          text={text}
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
          text={text}
          shortcut={shortcutLabel}
          shortcutPressed={shortcutPressed}
          onNext={goNext}
          onOpenSettings={onOpenSettings}
        />
      )}
      {stepIndex === 3 && (
        <OnboardingReadyStep text={text} shortcuts={shortcutLabels} onNext={goNext} />
      )}
    </div>
  );
}

function clampOnboardingStep(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, Math.floor(value)));
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

const ONBOARDING_MICROPHONE_METER_BARS = 8;

interface MicrophoneLevelState {
  activeBars: number;
  status: MicrophoneLevelStatus;
  message?: string;
}

function useMicrophoneLevel(
  inputDeviceId: string,
  text: OnboardingText["microphone"]
): MicrophoneLevelState {
  const [activeBars, setActiveBars] = useState(0);
  const [status, setStatus] = useState<MicrophoneLevelStatus>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setActiveBars(0);
      setStatus("unavailable");
      setMessage(text.cannotRead);
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      setActiveBars(0);
      setStatus("unavailable");
      setMessage(text.cannotDetect);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;
    let animationFrame = 0;
    let currentActiveBars = 0;
    let lastMeterUpdateMs = 0;
    let smoothedRms = 0;

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
          const rawRms = calculateRms(samples);
          const smoothing =
            rawRms > smoothedRms
              ? MICROPHONE_METER_ATTACK_SMOOTHING
              : MICROPHONE_METER_RELEASE_SMOOTHING;
          smoothedRms += (rawRms - smoothedRms) * smoothing;

          const now = window.performance.now();
          if (now - lastMeterUpdateMs >= MICROPHONE_METER_UPDATE_INTERVAL_MS) {
            lastMeterUpdateMs = now;
            const nextActiveBars = calculateActiveMeterBars(
              smoothedRms,
              currentActiveBars,
              ONBOARDING_MICROPHONE_METER_BARS
            );
            if (nextActiveBars !== currentActiveBars) {
              currentActiveBars = nextActiveBars;
              setActiveBars(nextActiveBars);
            }
          }
          setStatus("listening");
          animationFrame = window.requestAnimationFrame(tick);
        };

        tick();
      } catch (error) {
        if (!cancelled) {
          setActiveBars(0);
          setStatus("error");
          setMessage(`${text.failedPrefix}${error instanceof Error ? error.message : String(error)}`);
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
  }, [inputDeviceId, text]);

  return message === undefined ? { activeBars, status } : { activeBars, status, message };
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
    const active = index < activeCount && normalizedLevel > 0;
    return {
      active,
      height: active ? 1 : 0
    };
  });
}

function OnboardingPermissionsStep({
  text,
  onNext,
  onOpenSettings
}: {
  text: OnboardingText;
  onNext(): void;
  onOpenSettings(): void;
}): React.JSX.Element {
  const permissions = text.permissions;

  return (
    <section className="onboarding-guide__split onboarding-guide__split--permissions">
      <div className="onboarding-guide__copy">
        <p className="onboarding-guide__kicker">{permissions.kicker}</p>
        <h1>{permissions.title}</h1>
        <p className="onboarding-guide__intro">
          {permissions.intro}
        </p>
        <div className="onboarding-guide__trust-strip" aria-label={permissions.trustSummary}>
          {permissions.trust.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="onboarding-permissions">
          <div className="onboarding-permissions__header">
            <span>{permissions.header}</span>
            <strong>{permissions.count}</strong>
            <small>{permissions.note}</small>
          </div>
          {permissions.rows.map((row) => (
            <OnboardingPermissionRow
              key={row.title}
              title={row.title}
              description={row.description}
              allowedLabel={text.permissionAllowed}
              deniedLabel={text.permissionDenied}
              checked
            />
          ))}
        </div>
        <div className="onboarding-guide__actions">
          <button className="onboarding-guide__secondary" type="button" onClick={onOpenSettings}>
            {permissions.checkSettings}
          </button>
          <button className="onboarding-guide__primary" type="button" onClick={onNext}>
            {permissions.continue}
          </button>
        </div>
      </div>
      <div className="onboarding-guide__visual" aria-hidden="true">
        <div className="onboarding-privacy-card">
          {permissions.privacyPoints.map((point) => (
            <PrivacyPoint
              key={point.title}
              icon={point.icon}
              title={point.title}
              text={point.text}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function OnboardingPermissionRow({
  title,
  description,
  allowedLabel,
  deniedLabel,
  checked
}: {
  title: string;
  description: string;
  allowedLabel: string;
  deniedLabel: string;
  checked: boolean;
}): React.JSX.Element {
  return (
    <article className="onboarding-permission-row">
      <span className="onboarding-permission-row__index" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <span className="onboarding-permission-row__check" aria-label={checked ? allowedLabel : deniedLabel}>
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
  language,
  text,
  onDeviceChange,
  onNext
}: {
  inputDeviceId: string;
  language: AppSettings["ui"]["language"] | undefined;
  text: OnboardingText;
  onDeviceChange(deviceId: string): void;
  onNext(): void;
}): React.JSX.Element {
  const [pickerOpenSignal, setPickerOpenSignal] = useState(0);
  const micLevel = useMicrophoneLevel(inputDeviceId, text.microphone);

  return (
    <section className="onboarding-guide__split onboarding-guide__split--microphone">
      <div className="onboarding-guide__copy">
        <h1>{text.microphone.title}</h1>
        <p>{text.microphone.description}</p>
        <strong className="onboarding-guide__question">
          {text.microphone.question}
        </strong>
        <MicrophoneDevicePicker
          language={language}
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
            aria-label={text.microphone.openPicker}
            onClick={() => setPickerOpenSignal((current) => current + 1)}
          >
            {text.microphone.changeMicrophone}
          </button>
          <button className="onboarding-guide__primary" type="button" onClick={onNext}>
            {text.microphone.continueYes}
          </button>
        </div>
      </div>
      <div className="onboarding-guide__visual" aria-hidden="true">
        <MicrophoneLevelMeter
          activeBars={micLevel.activeBars}
          active={micLevel.status === "listening"}
          barCount={ONBOARDING_MICROPHONE_METER_BARS}
          label={text.microphone.question}
        />
      </div>
    </section>
  );
}

function OnboardingShortcutStep({
  text,
  shortcut,
  shortcutPressed,
  onNext,
  onOpenSettings
}: {
  text: OnboardingText;
  shortcut: string;
  shortcutPressed: boolean;
  onNext(): void;
  onOpenSettings(): void;
}): React.JSX.Element {
  return (
    <section className="onboarding-guide__split onboarding-guide__split--shortcut">
      <div className="onboarding-guide__copy">
        <h1>{text.shortcut.title}</h1>
        <p>
          {text.shortcut.descriptionPrefix}
          <OnboardingKey>{shortcut}</OnboardingKey>
          {text.shortcut.descriptionSuffix}
        </p>
        <strong className="onboarding-guide__question">
          {text.shortcut.questionPrefix}
          {shortcut}
          {text.shortcut.questionSuffix}
        </strong>
        <div className="onboarding-guide__actions">
          <button className="onboarding-guide__secondary" type="button" onClick={onOpenSettings}>
            {text.shortcut.changeShortcut}
          </button>
          <button
            className="onboarding-guide__primary"
            type="button"
            disabled={!shortcutPressed}
            onClick={onNext}
          >
            {text.shortcut.continueYes}
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
  text,
  shortcuts,
  onNext
}: {
  text: OnboardingText;
  shortcuts: Record<EditableShortcutKey, string>;
  onNext(): void;
}): React.JSX.Element {
  return (
    <section className="onboarding-guide__ready">
      <h1 aria-label={text.ready.ariaLabel}>
        <span>{text.ready.firstLine}</span>
        <span>{text.ready.secondLine}</span>
      </h1>
      <div className="onboarding-shortcut-grid" aria-label={text.ready.shortcutsLabel}>
        <article className="onboarding-shortcut-card">
          <strong>{text.ready.voiceInput}</strong>
          <OnboardingKey>{shortcuts.toggleRecording}</OnboardingKey>
        </article>
        <article className="onboarding-shortcut-card">
          <strong>{text.ready.translate}</strong>
          <OnboardingKey>{shortcuts.translateDictation}</OnboardingKey>
        </article>
        <article className="onboarding-shortcut-card">
          <strong>{text.ready.askAnything}</strong>
          <OnboardingKey>{shortcuts.processSelection}</OnboardingKey>
        </article>
      </div>
      <button className="onboarding-guide__primary" type="button" onClick={onNext}>
        {text.ready.cta}
      </button>
    </section>
  );
}

function OnboardingKey({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <kbd className="onboarding-key">{children}</kbd>;
}
