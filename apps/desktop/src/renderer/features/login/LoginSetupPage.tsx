import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppSettings,
  RecordingLanguage,
  RecordingMode,
} from "@voice/shared";
import type { AuthSessionSnapshot } from "../../../main/auth/authTypes";
import type { RecordingState } from "../../../preload/voiceApi";
import {
  detectShortcutDisplayPlatform,
  formatShortcutLabel,
} from "../../shared/keyboard/shortcutCapture";
import { ThemedIcon } from "../../shared/ui/ThemedIcon";
import {
  buildMicrophoneAudioConstraints,
  MicrophoneDevicePicker,
  MicrophoneLevelMeter,
} from "../../shared/ui/MicrophoneDevicePicker";
import {
  calculateActiveMeterBars,
  calculateRms,
  MICROPHONE_METER_ATTACK_SMOOTHING,
  MICROPHONE_METER_RELEASE_SMOOTHING,
  MICROPHONE_METER_UPDATE_INTERVAL_MS,
} from "../../shared/ui/MicrophoneDevicePicker/meterStrategy";
import "./login-setup.css";

type LoginSetupStep = "login" | "settings" | "experience" | "ready";
type SetupContentStep =
  | "privacy"
  | "permissions"
  | "microphone"
  | "voiceShortcut"
  | "dictationLanguage"
  | "dictationTry"
  | "translateShortcut"
  | "translationTargetLanguage"
  | "translationTry"
  | "rewriteShortcut"
  | "rewriteTry"
  | "ready";
type TranslationTargetLanguage = AppSettings["translation"]["targetLanguage"];
type LoginMode = "email" | "ldap";
type MessageTone = "info" | "error";
type MicrophoneLevelStatus = "idle" | "listening" | "error" | "unavailable";

const SETUP_STEPS: Array<{ id: LoginSetupStep; label: string }> = [
  { id: "login", label: "登入" },
  { id: "settings", label: "設定" },
  { id: "experience", label: "體驗" },
  { id: "ready", label: "就緒" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEVELOPMENT_LOGIN_EMAIL = "dev@example.test";
const DEVELOPMENT_LOGIN_CODE = "000000";
const LOGIN_SETUP_MICROPHONE_METER_BARS = 12;
const LOGIN_SETUP_SHORTCUT_CLEAR_DELAY_MS = 160;
const SETUP_CONTENT_FLOW: SetupContentStep[] = [
  "privacy",
  "permissions",
  "microphone",
  "voiceShortcut",
  "dictationLanguage",
  "dictationTry",
  "translateShortcut",
  "translationTargetLanguage",
  "translationTry",
  "rewriteShortcut",
  "rewriteTry",
  "ready",
];
const LOGIN_SETUP_RECORDING_LANGUAGE_OPTIONS: Array<{
  value: RecordingLanguage;
  label: string;
}> = [
  { value: "auto", label: "自動" },
  { value: "cantonese", label: "粵語" },
  { value: "mandarin", label: "普通話" },
  { value: "english", label: "英語" },
  { value: "portuguese", label: "葡語" },
  { value: "japanese", label: "日語" },
  { value: "korean", label: "韓語" },
  { value: "thai", label: "泰語" },
  { value: "hindi", label: "印地語" },
  { value: "indonesia", label: "印尼語" },
];
const LOGIN_SETUP_TRANSLATION_TARGET_OPTIONS: Array<{
  value: TranslationTargetLanguage;
  label: string;
}> = [
  { value: "en-US", label: "English（英語）" },
  { value: "zh-CN", label: "中文（簡體）" },
];
function getLoginSetupVoiceInputShortcut(): string {
  return detectShortcutDisplayPlatform() === "mac" ? "MetaRight" : "RightAlt";
}

function getLoginSetupTranslateShortcut(): string {
  return detectShortcutDisplayPlatform() === "mac"
    ? "MetaRight+RightShift"
    : "RightAlt+RightShift";
}
const REWRITE_SELECTED_TEXT =
  "這是一段測試智能改寫文本。這是一段測試智能改寫文本。這是一段測試智能改寫文本。這是一段測試智能改寫文本。這是一段測試智能改寫文本。這是一段測試智能改寫文本。這是一段測試智能改寫文本。這是一段測試智能改寫文本。";

function resolveOuterStep(contentStep: SetupContentStep): LoginSetupStep {
  if (contentStep === "privacy" || contentStep === "permissions") {
    return "settings";
  }
  if (contentStep !== "ready") {
    return "experience";
  }
  return "ready";
}

function WindowControls(): React.JSX.Element {
  return (
    <div className="login-setup__window-controls" aria-label="視窗控制">
      <button
        className="login-setup__window-button"
        type="button"
        aria-label="最小化"
        onClick={() => window.voiceAI.controlHomeWindow("minimize")}
      >
        <span className="login-setup__window-button-minimize" />
      </button>
      <button
        className="login-setup__window-button login-setup__window-button--close"
        type="button"
        aria-label="關閉"
        onClick={() => window.voiceAI.controlHomeWindow("close")}
      >
        <span className="login-setup__window-button-close" />
      </button>
    </div>
  );
}

function AssistantMark(): React.JSX.Element {
  return (
    <div className="login-setup__mark" aria-hidden="true">
      <ThemedIcon name="brand" mode="image" />
    </div>
  );
}

function getStepIndex(step: LoginSetupStep): number {
  return SETUP_STEPS.findIndex((item) => item.id === step);
}

function getSetupPrimaryLabel(
  step: SetupContentStep,
  _completingSetup: boolean,
): string {
  if (step === "privacy") {
    return "下一步";
  }
  if (step === "permissions") {
    return "同意";
  }
  if (
    step === "microphone" ||
    step === "voiceShortcut" ||
    step === "translateShortcut" ||
    step === "rewriteShortcut"
  ) {
    return "是的，繼續";
  }
  return "下一步";
}

function formatSetupShortcutLabel(shortcut: string): string {
  const platform = detectShortcutDisplayPlatform();
  return formatShortcutLabel(shortcut, platform)
    .replaceAll("Right Alt", platform === "mac" ? "Right Cmd" : "Right Alt")
    .replaceAll("Right Shift", platform === "mac" ? "Right Shift" : "Shift")
    .replaceAll(" + ", "+");
}

function getLoginSetupRewriteShortcut(): string {
  return detectShortcutDisplayPlatform() === "mac"
    ? "MetaRight+/"
    : "RightAlt+Space";
}

function normalizeSetupAccelerator(
  accelerator: string,
  platform = detectShortcutDisplayPlatform(),
): string {
  return accelerator
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => {
      if (
        part === "right alt" ||
        part === "altgr" ||
        (platform === "mac" &&
          (part === "metaright" ||
            part === "rightmeta" ||
            part === "right meta" ||
            part === "rightcmd" ||
            part === "right cmd" ||
            part === "rightcommand" ||
            part === "right command"))
      ) {
        return "rightalt";
      }
      if (part === "right shift" || part === "shift") {
        return "rightshift";
      }
      return part;
    })
    .join("+");
}

function matchesSetupAccelerator(accelerator: string, shortcut: string): boolean {
  return (
    normalizeSetupAccelerator(accelerator) === normalizeSetupAccelerator(shortcut)
  );
}

function isSetupSingleModifierShortcut(shortcut: string): boolean {
  const normalized = normalizeSetupAccelerator(shortcut);
  return normalized === "rightalt" || normalized === "metaright";
}

function matchesShortcutEvent(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const platform = detectShortcutDisplayPlatform();

  if (parts.length === 0) {
    return false;
  }

  return parts.every((part) => {
    switch (part) {
      case "rightalt":
      case "right alt":
      case "altgr":
        return (
          event.code === "AltRight" ||
          (event.key === "Alt" && event.location === 2) ||
          (event.key !== "Alt" && event.altKey) ||
          (platform === "mac" &&
            (event.code === "MetaRight" ||
              (event.key === "Meta" && event.location === 2))) ||
          event.getModifierState("AltGraph")
        );
      case "alt":
        return event.key === "Alt" || event.altKey;
      case "leftalt":
      case "left alt":
        return (
          event.code === "AltLeft" ||
          (event.key === "Alt" && event.location === 1)
        );
      case "rightshift":
      case "right shift":
        return (
          event.code === "ShiftRight" ||
          (event.key === "Shift" && event.location === 2) ||
          (event.key !== "Shift" && event.shiftKey)
        );
      case "leftshift":
      case "left shift":
        return (
          event.code === "ShiftLeft" ||
          (event.key === "Shift" && event.location === 1)
        );
      case "rightwin":
      case "right win":
      case "rightmeta":
      case "right meta":
      case "metaright":
      case "meta right":
      case "rightcmd":
      case "right cmd":
      case "rightcommand":
      case "right command":
      case "rightsuper":
      case "right super":
        return (
          event.code === "MetaRight" ||
          (event.key === "Meta" && event.location === 2)
        );
      case "win":
      case "meta":
      case "super":
      case "cmd":
      case "command":
        return event.key === "Meta" || event.metaKey;
      case "space":
        return event.code === "Space" || event.key === " ";
      case "shift":
        return event.key === "Shift" || event.shiftKey;
      default:
        return event.key.toLowerCase() === part;
    }
  });
}

function isSetupPhysicalRightAltEvent(event: KeyboardEvent): boolean {
  const platform = detectShortcutDisplayPlatform();
  if (platform === "mac") {
    return event.code === "MetaRight" || (event.key === "Meta" && event.location === 2);
  }
  return (
    event.code === "AltRight" ||
    (event.key === "Alt" && event.location === 2) ||
    event.getModifierState("AltGraph")
  );
}

function isSetupRightAltHeld(event: KeyboardEvent): boolean {
  const platform = detectShortcutDisplayPlatform();
  if (platform === "mac") {
    return event.metaKey;
  }
  return event.altKey || event.getModifierState("AltGraph");
}

function isSetupShortcutEvent(
  event: KeyboardEvent,
  shortcut: string,
  rightAltDown: boolean,
): boolean {
  if (shortcut === "RightAlt" || shortcut === "MetaRight") {
    return isSetupPhysicalRightAltEvent(event);
  }
  if (shortcut === "RightAlt+RightShift" || shortcut === "MetaRight+RightShift") {
    return (
      rightAltDown &&
      (event.code === "ShiftRight" || (event.key === "Shift" && event.location === 2))
    );
  }
  if (shortcut === "RightAlt+Space") {
    return rightAltDown && (event.code === "Space" || event.key === " ");
  }
  if (shortcut === "RightAlt+/" || shortcut === "MetaRight+/") {
    return (
      rightAltDown &&
      (event.code === "Slash" || event.key === "/" || event.key === "?")
    );
  }
  return matchesShortcutEvent(event, shortcut);
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const authHttpErrorPrefix = "AuthHttpError:";
  const authHttpErrorIndex = message.lastIndexOf(authHttpErrorPrefix);
  if (authHttpErrorIndex >= 0) {
    return localizeErrorMessage(
      message.slice(authHttpErrorIndex + authHttpErrorPrefix.length).trim(),
    );
  }
  return localizeErrorMessage(message);
}

function localizeErrorMessage(message: string): string {
  const normalized = message.trim();
  if (/[一-龥]/.test(normalized)) {
    return normalized;
  }
  if (
    normalized === "Network request failed" ||
    normalized === "Network unavailable" ||
    normalized === "fetch failed"
  ) {
    return "網路連線失敗，請檢查網路後再試。";
  }
  if (
    normalized === "Authentication request failed" ||
    normalized === "Backend returned invalid payload"
  ) {
    return "登入服務暫時不可用，請稍後再試。";
  }
  if (
    normalized === "Session expired" ||
    normalized === "Refresh token expired"
  ) {
    return "登入狀態已過期，請重新登入。";
  }
  if (normalized === "Not authenticated") {
    return "尚未登入，請先登入。";
  }
  return "操作失敗，請稍後再試。";
}

export function LoginSetupPage(): React.JSX.Element {
  const [contentStep, setContentStep] = useState<SetupContentStep>("privacy");
  const [loginStepVisible, setLoginStepVisible] = useState(true);
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLicense, setAcceptedLicense] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingSetup, setCompletingSetup] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [cooldown, setCooldown] = useState(0);
  const [session, setSession] = useState<AuthSessionSnapshot | undefined>(
    undefined,
  );
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [microphonePickerOpenSignal, setMicrophonePickerOpenSignal] =
    useState(0);
  const [voiceShortcutPressed, setVoiceShortcutPressed] = useState(false);
  const [setupTranslateShortcutPressed, setTranslateShortcutPressed] =
    useState(false);
  const [setupRewriteShortcutPressed, setRewriteShortcutPressed] = useState(false);
  const [rewriteSelectedText, setRewriteSelectedText] =
    useState(REWRITE_SELECTED_TEXT);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingMode, setRecordingMode] = useState<RecordingMode | undefined>(
    undefined,
  );
  const setupTryRecordingModeRef = useRef<RecordingMode | undefined>(undefined);
  const ignoreNextTryShortcutReleaseRef = useRef(false);

  const step = loginStepVisible ? "login" : resolveOuterStep(contentStep);
  const activeStepIndex = useMemo(() => getStepIndex(step), [step]);
  const selectedInputDeviceId = settings?.recording.inputDeviceId ?? "";
  const selectedRecordingLanguage = settings?.recording.language ?? "cantonese";
  const setupVoiceInputShortcut = getLoginSetupVoiceInputShortcut();
  const setupTranslateShortcut = getLoginSetupTranslateShortcut();
  const setupRewriteShortcut = getLoginSetupRewriteShortcut();
  const selectedTranslationTargetLanguage =
    settings?.translation.targetLanguage ?? "en-US";
  const canSendCode =
    EMAIL_PATTERN.test(email.trim()) &&
    cooldown <= 0 &&
    !sendingCode &&
    !submitting;
  const hasLoginCredentials =
    isDevelopmentMode ||
    (mode === "email"
      ? EMAIL_PATTERN.test(email.trim()) && code.trim().length > 0
      : account.trim().length > 0 && password.length > 0);
  const canSubmit =
    !submitting &&
    !sendingCode &&
    !completingSetup &&
    acceptedLicense &&
    hasLoginCredentials;
  const statusMessage = message ? (
    <p
      className={
        messageTone === "error"
          ? "login-setup__message login-setup__message--error"
          : "login-setup__message"
      }
      role="status"
    >
      {message}
    </p>
  ) : null;
  const isReadyStep = !loginStepVisible && contentStep === "ready";
  const setupShortcutSandboxActive =
    !loginStepVisible &&
    (contentStep === "voiceShortcut" ||
      contentStep === "dictationTry" ||
      contentStep === "translateShortcut" ||
      contentStep === "translationTry" ||
      contentStep === "rewriteShortcut" ||
      contentStep === "rewriteTry");

  useEffect(() => {
    let cancelled = false;
    void window.voiceAI
      .getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setIsDevelopmentMode(!info.isPackaged);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsDevelopmentMode(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void window.voiceAI
      .getAuthSession()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setSession(snapshot);
        if (snapshot.status === "authenticated") {
          setPassword("");
          setLoginStepVisible(false);
          setContentStep("privacy");
          setMessage(undefined);
        }
        if (snapshot.status === "offline") {
          setMessageTone("error");
          setMessage(
            snapshot.message
              ? getErrorMessage(snapshot.message)
              : "網路連線不可用，請稍後再試。",
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessageTone("error");
          setMessage(getErrorMessage(error));
        }
      });

    const unsubscribe = window.voiceAI.onAuthSessionChanged((snapshot) => {
      setSession(snapshot);
      if (snapshot.status === "authenticated") {
        setPassword("");
        setLoginStepVisible(false);
        setContentStep("privacy");
        setMessageTone("info");
        setMessage(undefined);
      } else if (snapshot.status === "offline") {
        setMessageTone("error");
        setMessage(
          snapshot.message
            ? getErrorMessage(snapshot.message)
            : "網路連線不可用，請稍後再試。",
        );
      } else if (snapshot.message) {
        setMessageTone("info");
        setMessage(getErrorMessage(snapshot.message));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.status !== "authenticated") {
      return undefined;
    }

    let cancelled = false;
    void window.voiceAI
      .getSettings()
      .then((nextSettings) => {
        if (!cancelled) {
          setSettings(nextSettings);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessageTone("error");
          setMessage(getErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.status]);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }
    const handle = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(handle);
  }, [cooldown]);

  useEffect(() => {
    return window.voiceAI.onRecordingStateChanged((update) => {
      setRecordingState(update.state);
      setRecordingMode(update.mode);
      if (
        update.state === "idle" ||
        update.state === "success" ||
        update.state === "error" ||
        update.state === "canceled"
      ) {
        setupTryRecordingModeRef.current = undefined;
      }
    });
  }, []);

  useEffect(() => {
    if (contentStep !== "microphone") {
      setMicrophonePickerOpenSignal(0);
    }
    if (contentStep === "voiceShortcut") {
      setVoiceShortcutPressed(false);
    }
    if (contentStep === "translateShortcut") {
      setTranslateShortcutPressed(false);
    }
    if (contentStep === "rewriteShortcut") {
      setRewriteShortcutPressed(false);
    }
  }, [contentStep]);

  useEffect(() => {
    if (!setupShortcutSandboxActive) {
      return undefined;
    }

    let disposed = false;
    let activated = false;
    void window.voiceAI
      .setLoginSetupShortcutCaptureActive(true)
      .then(() => {
        activated = true;
        if (disposed) {
          void window.voiceAI.setLoginSetupShortcutCaptureActive(false);
        }
      })
      .catch((error: unknown) => {
        console.warn(
          "[login-setup] Failed to suspend global shortcuts for setup",
          error,
        );
      });

    return () => {
      disposed = true;
      if (activated) {
        void window.voiceAI.setLoginSetupShortcutCaptureActive(false);
      }
    };
  }, [setupShortcutSandboxActive]);

  useEffect(() => {
    if (
      loginStepVisible ||
      (contentStep !== "voiceShortcut" &&
        contentStep !== "translateShortcut" &&
        contentStep !== "rewriteShortcut")
    ) {
      return undefined;
    }

    const shortcut =
      contentStep === "translateShortcut"
        ? setupTranslateShortcut
        : contentStep === "rewriteShortcut"
          ? setupRewriteShortcut
          : setupVoiceInputShortcut;
    const markPressed = (): void => {
      if (contentStep === "voiceShortcut") {
        setVoiceShortcutPressed(true);
      } else if (contentStep === "translateShortcut") {
        setTranslateShortcutPressed(true);
      } else {
        setRewriteShortcutPressed(true);
      }
    };
    const clearPressed = (): void => {
      if (contentStep === "voiceShortcut") {
        setVoiceShortcutPressed(false);
      } else if (contentStep === "translateShortcut") {
        setTranslateShortcutPressed(false);
      } else {
        setRewriteShortcutPressed(false);
      }
    };
    let rightAltDown = false;
    let clearPressedTimer: number | undefined;

    const scheduleClearPressed = (): void => {
      if (clearPressedTimer !== undefined) {
        window.clearTimeout(clearPressedTimer);
      }
      clearPressedTimer = window.setTimeout(() => {
        clearPressedTimer = undefined;
        clearPressed();
      }, LOGIN_SETUP_SHORTCUT_CLEAR_DELAY_MS);
    };
    const cancelScheduledClearPressed = (): void => {
      if (clearPressedTimer !== undefined) {
        window.clearTimeout(clearPressedTimer);
        clearPressedTimer = undefined;
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }
      if (isSetupPhysicalRightAltEvent(event)) {
        rightAltDown = true;
      } else if (!isSetupRightAltHeld(event)) {
        rightAltDown = false;
      }
      if (isSetupShortcutEvent(event, shortcut, rightAltDown)) {
        event.preventDefault();
        event.stopPropagation();
        cancelScheduledClearPressed();
        markPressed();
      }
    };
    const handleKeyUp = (event: KeyboardEvent): void => {
      if (isSetupPhysicalRightAltEvent(event)) {
        rightAltDown = false;
      }
      scheduleClearPressed();
    };
    const handleBlur = (): void => {
      rightAltDown = false;
      cancelScheduledClearPressed();
      clearPressed();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    const unsubscribeSetupShortcutCaptureAccelerator =
      window.voiceAI.onLoginSetupShortcutCaptureAccelerator(({ accelerator, state }) => {
        if (matchesSetupAccelerator(accelerator, shortcut)) {
          if (state === "up") {
            scheduleClearPressed();
          } else {
            cancelScheduledClearPressed();
            markPressed();
          }
        }
      });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
      unsubscribeSetupShortcutCaptureAccelerator();
      cancelScheduledClearPressed();
    };
  }, [
    contentStep,
    loginStepVisible,
    setupRewriteShortcut,
    setupTranslateShortcut,
    setupVoiceInputShortcut,
  ]);

  useEffect(() => {
    if (
      loginStepVisible ||
      (contentStep !== "dictationTry" &&
        contentStep !== "translationTry" &&
        contentStep !== "rewriteTry")
    ) {
      return undefined;
    }

    const shortcut =
      contentStep === "translationTry"
        ? setupTranslateShortcut
        : contentStep === "rewriteTry"
          ? setupRewriteShortcut
          : setupVoiceInputShortcut;
    const activeTryMode: RecordingMode =
      contentStep === "translationTry"
        ? "translate"
        : contentStep === "rewriteTry"
          ? "processSelection"
          : "direct";
    const canStopActiveTryRecording =
      (recordingMode === activeTryMode ||
        setupTryRecordingModeRef.current === activeTryMode) &&
      recordingState === "listening";
    const shouldBlockTryShortcutWhileBusy =
      recordingState === "processing" || recordingState === "inserting";
    const markPressed = (): void => {
      if (contentStep === "dictationTry") {
        setVoiceShortcutPressed(true);
      } else if (contentStep === "translationTry") {
        setTranslateShortcutPressed(true);
      } else {
        setRewriteShortcutPressed(true);
      }
    };
    const clearPressed = (): void => {
      setVoiceShortcutPressed(false);
      setTranslateShortcutPressed(false);
      setRewriteShortcutPressed(false);
    };
    let rightAltDown = false;
    let clearPressedTimer: number | undefined;
    let lastTriggerAtMs = 0;

    const scheduleClearPressed = (): void => {
      if (clearPressedTimer !== undefined) {
        window.clearTimeout(clearPressedTimer);
      }
      clearPressedTimer = window.setTimeout(() => {
        clearPressedTimer = undefined;
        clearPressed();
      }, LOGIN_SETUP_SHORTCUT_CLEAR_DELAY_MS);
    };

    const triggerCurrentStep = (): void => {
      const now = window.performance.now();
      if (now - lastTriggerAtMs < 500) {
        return;
      }
      lastTriggerAtMs = now;
      if (contentStep === "dictationTry") {
        setupTryRecordingModeRef.current = "direct";
        window.voiceAI.triggerRecording({
          mode: "direct",
          loginSetupTrial: true,
        });
      } else if (contentStep === "translationTry") {
        setupTryRecordingModeRef.current = "translate";
        window.voiceAI.triggerRecording({
          mode: "translate",
          loginSetupTrial: true,
        });
      } else if (contentStep === "rewriteTry") {
        setupTryRecordingModeRef.current = "processSelection";
        window.voiceAI.triggerRecording({
          mode: "processSelection",
          previewSelectedText: rewriteSelectedText,
          loginSetupTrial: true,
        });
      }
    };

    const stopActiveTryRecording = (): void => {
      window.voiceAI.triggerRecording({
        mode: activeTryMode,
        loginSetupTrial: true,
      });
    };
    const ignoreNextSingleModifierRelease = (): void => {
      if (isSetupSingleModifierShortcut(shortcut)) {
        ignoreNextTryShortcutReleaseRef.current = true;
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }
      if (isSetupPhysicalRightAltEvent(event)) {
        rightAltDown = true;
      } else if (!isSetupRightAltHeld(event)) {
        rightAltDown = false;
      }
      if (
        shouldBlockTryShortcutWhileBusy &&
        (isSetupShortcutEvent(event, setupVoiceInputShortcut, rightAltDown) ||
          isSetupShortcutEvent(event, shortcut, rightAltDown))
      ) {
        event.preventDefault();
        event.stopPropagation();
        ignoreNextSingleModifierRelease();
        return;
      }
      if (
        canStopActiveTryRecording &&
        isSetupShortcutEvent(event, setupVoiceInputShortcut, rightAltDown)
      ) {
        event.preventDefault();
        event.stopPropagation();
        ignoreNextSingleModifierRelease();
        stopActiveTryRecording();
        return;
      }
      if (isSetupShortcutEvent(event, shortcut, rightAltDown)) {
        event.preventDefault();
        event.stopPropagation();
        markPressed();
        ignoreNextSingleModifierRelease();
        triggerCurrentStep();
      }
    };
    const handleKeyUp = (event: KeyboardEvent): void => {
      if (isSetupPhysicalRightAltEvent(event)) {
        rightAltDown = false;
      }
      clearPressed();
    };
    const handleBlur = (): void => {
      rightAltDown = false;
      ignoreNextTryShortcutReleaseRef.current = false;
      clearPressed();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    const unsubscribeSetupShortcutCaptureAccelerator =
      window.voiceAI.onLoginSetupShortcutCaptureAccelerator(({ accelerator, state }) => {
        const isKeyUp = state === "up";
        if (
          shouldBlockTryShortcutWhileBusy &&
          (matchesSetupAccelerator(accelerator, setupVoiceInputShortcut) ||
            matchesSetupAccelerator(accelerator, shortcut))
        ) {
          if (
            isSetupSingleModifierShortcut(shortcut) &&
            matchesSetupAccelerator(accelerator, shortcut)
          ) {
            ignoreNextTryShortcutReleaseRef.current = false;
            scheduleClearPressed();
          }
          return;
        }
        if (isKeyUp) {
          if (matchesSetupAccelerator(accelerator, shortcut)) {
            ignoreNextTryShortcutReleaseRef.current = false;
            clearPressed();
          }
          return;
        }
        if (
          isSetupSingleModifierShortcut(shortcut) &&
          matchesSetupAccelerator(accelerator, shortcut) &&
          ignoreNextTryShortcutReleaseRef.current
        ) {
          ignoreNextTryShortcutReleaseRef.current = false;
          scheduleClearPressed();
          return;
        }
        if (
          canStopActiveTryRecording &&
          matchesSetupAccelerator(accelerator, setupVoiceInputShortcut)
        ) {
          stopActiveTryRecording();
          return;
        }
        if (matchesSetupAccelerator(accelerator, shortcut)) {
          markPressed();
          triggerCurrentStep();
          if (isSetupSingleModifierShortcut(shortcut)) {
            scheduleClearPressed();
          }
        }
      });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
      unsubscribeSetupShortcutCaptureAccelerator();
      if (clearPressedTimer !== undefined) {
        window.clearTimeout(clearPressedTimer);
      }
      ignoreNextTryShortcutReleaseRef.current = false;
    };
  }, [
    contentStep,
    loginStepVisible,
    recordingMode,
    recordingState,
    rewriteSelectedText,
    setupRewriteShortcut,
    setupTranslateShortcut,
    setupVoiceInputShortcut,
  ]);

  const sendCode = (): void => {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setMessageTone("error");
      setMessage("請輸入有效的電子郵件地址。");
      return;
    }
    if (cooldown > 0) {
      return;
    }
    setSendingCode(true);
    setMessageTone("info");
    setMessage(undefined);
    void window.voiceAI
      .sendEmailCode({ email: trimmedEmail })
      .then((result) => {
        setCooldown(result.cooldownSeconds);
        setMessageTone("info");
        setMessage("驗證碼已發送，請檢查電子郵件。");
      })
      .catch((error: unknown) => {
        setMessageTone("error");
        setMessage(getErrorMessage(error));
      })
      .finally(() => setSendingCode(false));
  };

  const submitLogin = (): void => {
    if (!acceptedLicense) {
      setMessageTone("error");
      setMessage("請先同意用戶使用許可。");
      return;
    }
    if (!hasLoginCredentials) {
      setMessageTone("error");
      setMessage(
        mode === "email"
          ? "請輸入電子郵件和驗證碼。"
          : "請輸入網域帳號和密碼。",
      );
      return;
    }
    if (submitting || sendingCode || completingSetup) {
      return;
    }

    setSubmitting(true);
    setMessageTone("info");
    setMessage(undefined);
    const loginMode = mode;
    const login =
      loginMode === "email"
        ? window.voiceAI.loginWithEmailCode({
            email:
              isDevelopmentMode && email.trim().length === 0
                ? DEVELOPMENT_LOGIN_EMAIL
                : email.trim(),
            code:
              isDevelopmentMode && code.trim().length === 0
                ? DEVELOPMENT_LOGIN_CODE
                : code.trim(),
            acceptedLicense,
          })
        : window.voiceAI.loginWithLdap({
            account:
              isDevelopmentMode && account.trim().length === 0
                ? "dev-user"
                : account.trim(),
            password:
              isDevelopmentMode && password.length === 0 ? "dev" : password,
            acceptedLicense,
          });

    void login
      .then((snapshot) => {
        setSession(snapshot);
        if (snapshot.status === "authenticated") {
          setPassword("");
          setLoginStepVisible(false);
          setContentStep("privacy");
          setMessageTone("info");
          setMessage(undefined);
          return;
        }
        setMessageTone("error");
        setMessage(
          snapshot.message
            ? getErrorMessage(snapshot.message)
            : "登入未完成，請檢查帳戶資訊。",
        );
      })
      .catch((error: unknown) => {
        setMessageTone("error");
        setMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (loginMode === "ldap") {
          setPassword("");
        }
        setSubmitting(false);
      });
  };

  const continueSetup = (): void => {
    setMessageTone("info");
    setMessage(undefined);
    if (contentStep !== "ready") {
      const currentIndex = SETUP_CONTENT_FLOW.indexOf(contentStep);
      setContentStep(
        SETUP_CONTENT_FLOW[
          Math.min(currentIndex + 1, SETUP_CONTENT_FLOW.length - 1)
        ] ?? "ready",
      );
      return;
    }
    if (contentStep === "ready") {
      setMessageTone("info");
      setMessage("正在進入主應用。");
      setCompletingSetup(true);
      void window.voiceAI
        .completeLoginSetup()
        .catch((error: unknown) => {
          setMessageTone("error");
          setMessage(getErrorMessage(error));
        })
        .finally(() => setCompletingSetup(false));
    }
  };

  const goBackSetup = (): void => {
    setMessageTone("info");
    setMessage(undefined);

    if (contentStep === "privacy") {
      setLoginStepVisible(true);
      return;
    }
    const currentIndex = SETUP_CONTENT_FLOW.indexOf(contentStep);
    setContentStep(
      SETUP_CONTENT_FLOW[Math.max(currentIndex - 1, 0)] ?? "privacy",
    );
  };

  const updateMicrophoneDevice = (deviceId: string): void => {
    setSettings((current: AppSettings | undefined) =>
      current
        ? {
            ...current,
            recording: {
              ...current.recording,
              inputDeviceId: deviceId,
            },
          }
        : current,
    );
    void window.voiceAI
      .updateSettings({
        recording: {
          inputDeviceId: deviceId,
        },
      })
      .then(setSettings)
      .catch((error: unknown) => {
        setMessageTone("error");
        setMessage(getErrorMessage(error));
      });
  };

  const updateRecordingLanguage = (language: RecordingLanguage): void => {
    setSettings((current: AppSettings | undefined) =>
      current
        ? {
            ...current,
            recording: {
              ...current.recording,
              language,
            },
          }
        : current,
    );
    void window.voiceAI
      .updateSettings({
        recording: {
          language,
        },
      })
      .then(setSettings)
      .catch((error: unknown) => {
        setMessageTone("error");
        setMessage(getErrorMessage(error));
      });
  };

  const updateTranslationTargetLanguage = (
    targetLanguage: TranslationTargetLanguage,
  ): void => {
    setSettings((current: AppSettings | undefined) =>
      current
        ? {
            ...current,
            translation: {
              ...current.translation,
              targetLanguage,
            },
          }
        : current,
    );
    void window.voiceAI
      .updateSettings({
        translation: {
          targetLanguage,
        },
      })
      .then(setSettings)
      .catch((error: unknown) => {
        setMessageTone("error");
        setMessage(getErrorMessage(error));
      });
  };

  return (
    <main
      className={[
        "login-setup",
        loginStepVisible ? "login-setup--login" : "login-setup--wizard",
        isReadyStep ? "login-setup--ready" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="login-setup__chrome">
        <span className="login-setup__brand">Voice Assistant 安裝向導</span>
        <WindowControls />
      </header>

      <section className="login-setup__shell" aria-live="polite">
        {loginStepVisible || isReadyStep ? <AssistantMark /> : null}
        <div className="login-setup__heading">
          <p className="login-setup__eyebrow">Voice Assistant 登入向導</p>
          <h1>登入您的帳戶</h1>
        </div>

        <ol className="login-setup__steps" aria-label="登入設定步驟">
          {SETUP_STEPS.map((item, index) => (
            <li
              className={[
                "login-setup__step",
                index < activeStepIndex ? "login-setup__step--complete" : "",
                index === activeStepIndex ? "login-setup__step--current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={item.id}
            >
              <span>{index + 1}</span>
              {item.label}
            </li>
          ))}
        </ol>

        <div className="login-setup__panel">
          {step === "login" ? (
            <>
              <header className="login-setup__login-header">
                <h2>登入您的帳號</h2>
                <div
                  className="login-setup__mode-tabs"
                  role="tablist"
                  aria-label="登入方式"
                >
                  <button
                    className={[
                      "login-setup__mode-tab",
                      mode === "email" ? "login-setup__mode-tab--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    role="tab"
                    aria-selected={mode === "email"}
                    onClick={() => {
                      setMode("email");
                      setPassword("");
                      setMessage(undefined);
                    }}
                  >
                    電子郵件驗證碼
                  </button>
                  <button
                    className={[
                      "login-setup__mode-tab",
                      mode === "ldap" ? "login-setup__mode-tab--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    role="tab"
                    aria-selected={mode === "ldap"}
                    onClick={() => {
                      setMode("ldap");
                      setPassword("");
                      setMessage(undefined);
                    }}
                  >
                    AD 網域登入
                  </button>
                </div>
              </header>
              {mode === "email" ? (
                <div className="login-setup__form">
                  <label className="login-setup__field">
                    <span>電子郵件</span>
                    <input
                      value={email}
                      type="email"
                      autoComplete="email"
                      placeholder="your@company.com"
                      onChange={(event) => setEmail(event.currentTarget.value)}
                    />
                  </label>
                  <label className="login-setup__field">
                    <span>驗證碼</span>
                    <div className="login-setup__code-row">
                      <input
                        value={code}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="驗證碼"
                        onChange={(event) => setCode(event.currentTarget.value)}
                      />
                      <button
                        className="login-setup__secondary"
                        type="button"
                        disabled={!canSendCode}
                        onClick={sendCode}
                      >
                        {cooldown > 0 ? `${cooldown}s` : "發送驗證碼"}
                      </button>
                    </div>
                    {cooldown > 0 ? (
                      <small>請在 {cooldown} 秒內輸入驗證碼。</small>
                    ) : null}
                  </label>
                  <label className="login-setup__check login-setup__license">
                    <input
                      type="checkbox"
                      checked={acceptedLicense}
                      onChange={(event) =>
                        setAcceptedLicense(event.currentTarget.checked)
                      }
                    />
                    <span>同意用戶使用許可</span>
                  </label>
                </div>
              ) : (
                <div className="login-setup__form">
                  <label className="login-setup__field">
                    <span>AD 網域帳號</span>
                    <input
                      value={account}
                      autoComplete="username"
                      placeholder="domain\\account"
                      onChange={(event) =>
                        setAccount(event.currentTarget.value)
                      }
                    />
                  </label>
                  <label className="login-setup__field">
                    <span>密碼</span>
                    <input
                      value={password}
                      type="password"
                      autoComplete="current-password"
                      placeholder="輸入密碼"
                      onChange={(event) =>
                        setPassword(event.currentTarget.value)
                      }
                    />
                  </label>
                  <label className="login-setup__check login-setup__license">
                    <input
                      type="checkbox"
                      checked={acceptedLicense}
                      onChange={(event) =>
                        setAcceptedLicense(event.currentTarget.checked)
                      }
                    />
                    <span>同意用戶使用許可</span>
                  </label>
                </div>
              )}

              {statusMessage}
            </>
          ) : null}

          {!loginStepVisible ? (
            <SetupWizardPage
              step={contentStep}
              inputDeviceId={selectedInputDeviceId}
              recordingLanguage={selectedRecordingLanguage}
              language={settings?.ui.language ?? "zh-TW"}
              setupVoiceInputShortcut={setupVoiceInputShortcut}
              setupTranslateShortcut={setupTranslateShortcut}
              setupRewriteShortcut={setupRewriteShortcut}
              rewriteSelectedText={rewriteSelectedText}
              translationTargetLanguage={selectedTranslationTargetLanguage}
              voiceShortcutPressed={voiceShortcutPressed}
              setupTranslateShortcutPressed={setupTranslateShortcutPressed}
              setupRewriteShortcutPressed={setupRewriteShortcutPressed}
              pickerOpenSignal={microphonePickerOpenSignal}
              completingSetup={completingSetup}
              onReadyStart={continueSetup}
              onOpenMicrophonePicker={() =>
                setMicrophonePickerOpenSignal((current) => current + 1)
              }
              onMicrophoneDeviceChange={updateMicrophoneDevice}
              onRecordingLanguageChange={updateRecordingLanguage}
              onTranslationTargetLanguageChange={
                updateTranslationTargetLanguage
              }
              onRewriteSelectedTextChange={setRewriteSelectedText}
            />
          ) : null}

          {loginStepVisible ? null : statusMessage}
        </div>

        {loginStepVisible ? (
          <footer className="login-setup__action-row login-setup__action-row--login">
            <span className="login-setup__action-spacer" aria-hidden="true" />
            <div className="login-setup__footer-actions">
              <button
                className="login-setup__primary login-setup__primary--wide"
                type="button"
                disabled={!canSubmit}
                onClick={submitLogin}
              >
                {submitting ? (
                  "正在登入..."
                ) : (
                  <>
                    <span>登入</span>
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        ) : isReadyStep ? null : (
          <footer className="login-setup__action-row login-setup__action-row--wizard">
            <button
              className="login-setup__back-link"
              type="button"
              disabled={completingSetup}
              onClick={goBackSetup}
            >
              <span aria-hidden="true">↩</span>
              上一步
            </button>
            <div className="login-setup__footer-actions">
              <button
                className="login-setup__primary login-setup__primary--wide"
                type="button"
                disabled={completingSetup}
                onClick={continueSetup}
              >
                {getSetupPrimaryLabel(contentStep, completingSetup)}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        )}
      </section>
    </main>
  );
}

function SetupWizardPage({
  step,
  inputDeviceId,
  recordingLanguage,
  language,
  setupVoiceInputShortcut,
  setupTranslateShortcut,
  setupRewriteShortcut,
  rewriteSelectedText,
  translationTargetLanguage,
  voiceShortcutPressed,
  setupTranslateShortcutPressed,
  setupRewriteShortcutPressed,
  pickerOpenSignal,
  completingSetup,
  onReadyStart,
  onOpenMicrophonePicker,
  onMicrophoneDeviceChange,
  onRecordingLanguageChange,
  onTranslationTargetLanguageChange,
  onRewriteSelectedTextChange,
}: {
  step: SetupContentStep;
  inputDeviceId: string;
  recordingLanguage: RecordingLanguage;
  language: AppSettings["ui"]["language"];
  setupVoiceInputShortcut: string;
  setupTranslateShortcut: string;
  setupRewriteShortcut: string;
  rewriteSelectedText: string;
  translationTargetLanguage: TranslationTargetLanguage;
  voiceShortcutPressed: boolean;
  setupTranslateShortcutPressed: boolean;
  setupRewriteShortcutPressed: boolean;
  pickerOpenSignal: number;
  completingSetup: boolean;
  onReadyStart(): void;
  onOpenMicrophonePicker(): void;
  onMicrophoneDeviceChange(deviceId: string): void;
  onRecordingLanguageChange(language: RecordingLanguage): void;
  onTranslationTargetLanguageChange(language: TranslationTargetLanguage): void;
  onRewriteSelectedTextChange(value: string): void;
}): React.JSX.Element {
  return (
    <div className="login-setup__wizard-content">
      {step === "privacy" ? <PrivacyStep /> : null}
      {step === "permissions" ? <PermissionsStep /> : null}
      {step === "microphone" ? (
        <MicrophoneSetupStep
          inputDeviceId={inputDeviceId}
          language={language}
          pickerOpenSignal={pickerOpenSignal}
          onOpenPicker={onOpenMicrophonePicker}
          onDeviceChange={onMicrophoneDeviceChange}
        />
      ) : null}
      {step === "voiceShortcut" ? (
        <ShortcutExperienceStep
          title="測試語音輸入快捷鍵"
          shortcut={setupVoiceInputShortcut}
          pressed={voiceShortcutPressed}
        />
      ) : null}
      {step === "dictationLanguage" ? (
        <DictationLanguageStep
          language={recordingLanguage}
          onLanguageChange={onRecordingLanguageChange}
        />
      ) : null}
      {step === "dictationTry" ? (
        <DictationTryStep setupVoiceInputShortcut={setupVoiceInputShortcut} />
      ) : null}
      {step === "translateShortcut" ? (
        <ShortcutExperienceStep
          title="體驗翻譯快捷鍵"
          shortcut={setupTranslateShortcut}
          pressed={setupTranslateShortcutPressed}
        />
      ) : null}
      {step === "translationTargetLanguage" ? (
        <TranslationTargetLanguageStep
          language={translationTargetLanguage}
          onLanguageChange={onTranslationTargetLanguageChange}
        />
      ) : null}
      {step === "translationTry" ? (
        <TranslationTryStep
          setupTranslateShortcut={setupTranslateShortcut}
          setupVoiceInputShortcut={setupVoiceInputShortcut}
        />
      ) : null}
      {step === "rewriteShortcut" ? (
        <ShortcutExperienceStep
          title="體驗改寫快捷鍵"
          shortcut={setupRewriteShortcut}
          pressed={setupRewriteShortcutPressed}
        />
      ) : null}
      {step === "rewriteTry" ? (
        <RewriteTryStep
          setupRewriteShortcut={setupRewriteShortcut}
          setupVoiceInputShortcut={setupVoiceInputShortcut}
          selectedText={rewriteSelectedText}
          onSelectedTextChange={onRewriteSelectedTextChange}
        />
      ) : null}
      {step === "ready" ? (
        <ReadyStep completingSetup={completingSetup} onStart={onReadyStart} />
      ) : null}
    </div>
  );
}

function PrivacyStep(): React.JSX.Element {
  return (
    <section className="login-setup__copy-page login-setup__copy-page--privacy">
      <h2>感謝您的信任，我們尊重您的隱私</h2>
      <div className="login-setup__copy-list">
        <InfoBlock
          title="零雲端資料保留"
          description="您的語音輸入是私密的，且不會保留資料。"
        />
        <InfoBlock
          title="絕不訓練您的資料"
          description="您的任何輸入資料都不會被我們或第三方儲存或用於模型訓練。"
        />
        <InfoBlock
          title="裝置內歷史記錄儲存"
          description="所有歷史記錄都保留在您的裝置上。"
        />
      </div>
    </section>
  );
}

function PermissionsStep(): React.JSX.Element {
  return (
    <section className="login-setup__copy-page login-setup__copy-page--permissions">
      <h2>使用 Voice Assistant 的全部功能，需要您同意我們使用以下權限。</h2>
      <div className="login-setup__copy-list">
        <InfoBlock
          title="自動寫入權限"
          description="允許 AOA 把結果放進目前選取的輸入框。"
        />
        <InfoBlock
          title="剪貼簿／選取文字存取"
          description="用於貼上、改寫、翻譯選取的內容。"
        />
        <InfoBlock
          title="全域快捷鍵"
          description="允許在其他應用程式中喚起 AOA。"
        />
      </div>
    </section>
  );
}

function MicrophoneSetupStep({
  inputDeviceId,
  language,
  pickerOpenSignal,
  onOpenPicker,
  onDeviceChange,
}: {
  inputDeviceId: string;
  language: AppSettings["ui"]["language"] | undefined;
  pickerOpenSignal: number;
  onOpenPicker(): void;
  onDeviceChange(deviceId: string): void;
}): React.JSX.Element {
  const micLevel = useLoginSetupMicrophoneLevel(inputDeviceId);

  return (
    <section className="login-setup__microphone-page">
      <header className="login-setup__microphone-header">
        <div>
          <h2>測試您的麥克風</h2>
          <p>選擇麥克風並開始說話。</p>
        </div>
        <button
          className="login-setup__device-link"
          type="button"
          onClick={onOpenPicker}
        >
          <ThemedIcon name="microphone" mode="image" />
          換一個麥克風
        </button>
      </header>
      <MicrophoneDevicePicker
        language={language}
        selectedDeviceId={inputDeviceId}
        onDeviceChange={onDeviceChange}
        openSignal={pickerOpenSignal}
        selectId="login-setup-microphone-device"
        hideTrigger
      />
      <div className="login-setup__microphone-meter" aria-live="polite">
        <MicrophoneLevelMeter
          activeBars={micLevel.activeBars}
          active={micLevel.status === "listening"}
          barCount={LOGIN_SETUP_MICROPHONE_METER_BARS}
          label="麥克風輸入音量"
        />
        <strong>當您說話時是否看到藍色條形圖在移動</strong>
        {micLevel.message ? <p>{micLevel.message}</p> : null}
      </div>
    </section>
  );
}

function ShortcutExperienceStep({
  title,
  shortcut,
  pressed,
}: {
  title: string;
  shortcut: string;
  pressed: boolean;
}): React.JSX.Element {
  const shortcutLabel = formatSetupShortcutLabel(shortcut);

  return (
    <section className="login-setup__experience-page login-setup__shortcut-page">
      <header className="login-setup__experience-header">
        <h2>{title}</h2>
        <p>
          按下右側
          <ShortcutKey>{shortcutLabel}</ShortcutKey>鍵
        </p>
      </header>
      <div className="login-setup__experience-center">
        <ShortcutKeyboardDemo shortcut={shortcut} pressed={pressed} />
        <strong>按下時，您見到按鈕變成藍色了麼？</strong>
      </div>
    </section>
  );
}

function DictationLanguageStep({
  language,
  onLanguageChange,
}: {
  language: RecordingLanguage;
  onLanguageChange(language: RecordingLanguage): void;
}): React.JSX.Element {
  return (
    <section className="login-setup__experience-page login-setup__language-page">
      <header className="login-setup__experience-header">
        <h2>設定語音輸入時的語言</h2>
        <p>將信息口述到文本框中</p>
      </header>
      <div className="login-setup__language-center">
        <label className="login-setup__language-select">
          <span className="login-setup__sr-only">選擇您的輸入語言</span>
          <select
            value={language}
            onChange={(event) =>
              onLanguageChange(event.currentTarget.value as RecordingLanguage)
            }
          >
            {LOGIN_SETUP_RECORDING_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <strong>選擇您的輸入語言</strong>
      </div>
    </section>
  );
}

function TranslationTargetLanguageStep({
  language,
  onLanguageChange,
}: {
  language: TranslationTargetLanguage;
  onLanguageChange(language: TranslationTargetLanguage): void;
}): React.JSX.Element {
  return (
    <section className="login-setup__experience-page login-setup__language-page">
      <header className="login-setup__experience-header">
        <h2>設定翻譯目標語言</h2>
        <p>即時將您口述的語言翻譯成目標語言</p>
      </header>
      <div className="login-setup__language-center">
        <label className="login-setup__language-select login-setup__language-select--translation">
          <span className="login-setup__sr-only">選擇您的翻譯目標語言</span>
          <select
            value={language}
            onChange={(event) =>
              onLanguageChange(
                event.currentTarget.value as TranslationTargetLanguage,
              )
            }
          >
            {LOGIN_SETUP_TRANSLATION_TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <strong>選擇您的翻譯目標語言</strong>
      </div>
    </section>
  );
}

function DictationTryStep({
  setupVoiceInputShortcut,
}: {
  setupVoiceInputShortcut: string;
}): React.JSX.Element {
  const shortcutLabel = formatSetupShortcutLabel(setupVoiceInputShortcut);
  const textareaRef = useSetupTryTextareaFocus();
  return (
    <section className="login-setup__experience-page login-setup__dictation-page">
      <header className="login-setup__experience-header">
        <h2>試試語音輸入功能</h2>
        <p>將信息口述到文本框中</p>
      </header>
      <div className="login-setup__dictation-layout">
        <div className="login-setup__dictation-guide">
          <ol>
            <li>
              輕按
              <ShortcutKey>{shortcutLabel}</ShortcutKey>
              鍵並鬆開
            </li>
            <li>朗讀下方的文本內容</li>
            <li>
              結束後輕按
              <ShortcutKey>{shortcutLabel}</ShortcutKey>
              鍵並鬆開
            </li>
          </ol>
          <blockquote>這是一段測試文本。</blockquote>
        </div>
        <label className="login-setup__dictation-document">
          <DocumentHeader title="文本文檔" />
          <textarea
            ref={textareaRef}
            placeholder={`按下${shortcutLabel}鍵一次，開始說話...`}
          />
        </label>
      </div>
    </section>
  );
}

function TranslationTryStep({
  setupTranslateShortcut,
  setupVoiceInputShortcut,
}: {
  setupTranslateShortcut: string;
  setupVoiceInputShortcut: string;
}): React.JSX.Element {
  const shortcutLabel = formatSetupShortcutLabel(setupTranslateShortcut);
  const stopShortcutLabel = formatSetupShortcutLabel(setupVoiceInputShortcut);
  const textareaRef = useSetupTryTextareaFocus();
  return (
    <section className="login-setup__experience-page login-setup__dictation-page">
      <header className="login-setup__experience-header">
        <h2>試試翻譯功能</h2>
        <p>即時將您口述的語言翻譯成目標語言</p>
      </header>
      <div className="login-setup__dictation-layout">
        <div className="login-setup__dictation-guide">
          <ol>
            <li>
              輕按
              <ShortcutKey>{shortcutLabel}</ShortcutKey>
              鍵並鬆開
            </li>
            <li>朗讀下方的文本內容</li>
            <li>
              結束後輕按
              <ShortcutKey>{stopShortcutLabel}</ShortcutKey>
              鍵並鬆開
            </li>
          </ol>
          <blockquote>這是一段測試翻譯文本。</blockquote>
        </div>
        <label className="login-setup__dictation-document">
          <DocumentHeader title="文本文檔" />
          <textarea
            ref={textareaRef}
            placeholder={`按下${shortcutLabel}鍵一次，開始說話...`}
          />
        </label>
      </div>
    </section>
  );
}

function RewriteTryStep({
  setupRewriteShortcut,
  setupVoiceInputShortcut,
  selectedText,
  onSelectedTextChange,
}: {
  setupRewriteShortcut: string;
  setupVoiceInputShortcut: string;
  selectedText: string;
  onSelectedTextChange(value: string): void;
}): React.JSX.Element {
  const shortcutLabel = formatSetupShortcutLabel(setupRewriteShortcut);
  const stopShortcutLabel = formatSetupShortcutLabel(setupVoiceInputShortcut);
  return (
    <section className="login-setup__experience-page login-setup__dictation-page login-setup__rewrite-page">
      <header className="login-setup__experience-header">
        <h2>試試智能改寫功能</h2>
        <p>口述以改寫選定的文本</p>
      </header>
      <div className="login-setup__dictation-layout">
        <div className="login-setup__dictation-guide">
          <ol>
            <li>選中右側文字</li>
            <li>
              輕按
              <ShortcutKey>{shortcutLabel}</ShortcutKey>
              鍵並鬆開
            </li>
            <li>朗讀下方的文本內容</li>
            <li>
              結束後輕按
              <ShortcutKey>{stopShortcutLabel}</ShortcutKey>
              鍵並鬆開
            </li>
          </ol>
          <blockquote>改寫為正式彙報格式</blockquote>
        </div>
        <div className="login-setup__dictation-document">
          <DocumentHeader title="選中下方文字" />
          <textarea
            className="login-setup__selected-document-textarea"
            value={selectedText}
            onChange={(event) =>
              onSelectedTextChange(event.currentTarget.value)
            }
          />
        </div>
      </div>
    </section>
  );
}

function useSetupTryTextareaFocus(): React.RefObject<HTMLTextAreaElement | null> {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return textareaRef;
}

function DocumentHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <span>
      <span className="login-setup__dictation-document-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M4 1.5h5.1L12.5 5v9.5h-8.5z" />
          <path d="M9 1.5V5h3.5" />
          <path d="M6 7.25h4.5M6 9.5h4.5M6 11.75h3" />
        </svg>
      </span>
      {title}
    </span>
  );
}

function ShortcutKey({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <kbd className="login-setup__shortcut-key">{children}</kbd>;
}

function ShortcutKeyboardDemo({
  shortcut,
  pressed,
}: {
  shortcut: string;
  pressed: boolean;
}): React.JSX.Element {
  const shortcutParts = shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase());
  const displayPlatform = detectShortcutDisplayPlatform();
  const usesRightAlt =
    shortcutParts.includes("rightalt") ||
    shortcutParts.includes("right alt") ||
    shortcutParts.includes("altgr");
  const rightAltDisplaysAsSystemKey = displayPlatform === "mac" && usesRightAlt;
  const altActive =
    pressed &&
    !rightAltDisplaysAsSystemKey &&
    (usesRightAlt || shortcutParts.includes("alt"));
  const winActive =
    pressed &&
    (rightAltDisplaysAsSystemKey ||
      shortcutParts.includes("rightwin") ||
      shortcutParts.includes("right win") ||
      shortcutParts.includes("rightmeta") ||
      shortcutParts.includes("right meta") ||
      shortcutParts.includes("metaright") ||
      shortcutParts.includes("meta right") ||
      shortcutParts.includes("rightsuper") ||
      shortcutParts.includes("right super") ||
      shortcutParts.includes("win") ||
      shortcutParts.includes("meta") ||
      shortcutParts.includes("super") ||
      shortcutParts.includes("command"));
  const showSystemKey =
    rightAltDisplaysAsSystemKey ||
    shortcutParts.includes("rightwin") ||
    shortcutParts.includes("right win") ||
    shortcutParts.includes("rightmeta") ||
    shortcutParts.includes("right meta") ||
    shortcutParts.includes("metaright") ||
    shortcutParts.includes("meta right") ||
    shortcutParts.includes("rightsuper") ||
    shortcutParts.includes("right super") ||
    shortcutParts.includes("win") ||
    shortcutParts.includes("meta") ||
    shortcutParts.includes("super") ||
    shortcutParts.includes("command");
  const winKeyLabel = displayPlatform === "mac" ? "cmd" : "win";
  const shiftActive =
    pressed &&
    (shortcutParts.includes("rightshift") ||
      shortcutParts.includes("right shift") ||
      shortcutParts.includes("shift"));
  const spaceActive = pressed && shortcutParts.includes("space");
  const slashActive = pressed && shortcutParts.includes("/");
  const showShiftKey =
    shortcutParts.includes("rightshift") ||
    shortcutParts.includes("right shift") ||
    shortcutParts.includes("shift");
  const showSlashKey = showShiftKey || shortcutParts.includes("/");

  return (
    <div className="login-setup__keyboard-demo" aria-hidden="true">
      <div className="login-setup__keyboard-row login-setup__keyboard-row--top">
        <KeyboardKey muted>M</KeyboardKey>
        <KeyboardKey>,</KeyboardKey>
        <KeyboardKey>.</KeyboardKey>
        {showSlashKey ? <KeyboardKey active={slashActive}>/</KeyboardKey> : null}
        {showShiftKey ? (
          <KeyboardKey wide active={shiftActive}>
            shift
          </KeyboardKey>
        ) : null}
      </div>
      <div className="login-setup__keyboard-row login-setup__keyboard-row--bottom">
        <KeyboardKey wide active={spaceActive} muted={!spaceActive} />
        <KeyboardKey active={altActive || winActive}>
          {showSystemKey ? winKeyLabel : "alt"}
        </KeyboardKey>
        <KeyboardKey muted>ctrl</KeyboardKey>
        <KeyboardKey compact>◀</KeyboardKey>
        <KeyboardKey compact>▲</KeyboardKey>
        <KeyboardKey compact muted>
          ▶
        </KeyboardKey>
      </div>
    </div>
  );
}

function KeyboardKey({
  children,
  active = false,
  muted = false,
  wide = false,
  compact = false,
}: {
  children?: React.ReactNode;
  active?: boolean;
  muted?: boolean;
  wide?: boolean;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <span
      className={[
        "login-setup__keyboard-key",
        active ? "login-setup__keyboard-key--active" : "",
        muted ? "login-setup__keyboard-key--muted" : "",
        wide ? "login-setup__keyboard-key--wide" : "",
        compact ? "login-setup__keyboard-key--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

function ReadyStep({
  completingSetup,
  onStart,
}: {
  completingSetup: boolean;
  onStart(): void;
}): React.JSX.Element {
  return (
    <section className="login-setup__ready-page">
      <h2>讓每一次表達，都清晰高效</h2>
      <p>Voice Assistant 已準備就緒，開始語音優先的工作流。</p>
      <button
        className="login-setup__primary login-setup__ready-primary"
        type="button"
        disabled={completingSetup}
        onClick={onStart}
      >
        {completingSetup ? "正在進入..." : "開始使用"}
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

function InfoBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <article className="login-setup__info-block">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function useLoginSetupMicrophoneLevel(inputDeviceId: string): {
  activeBars: number;
  status: MicrophoneLevelStatus;
  message?: string;
} {
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
      setMessage("目前環境無法讀取麥克風。");
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) {
      setActiveBars(0);
      setStatus("unavailable");
      setMessage("目前環境無法偵測音量。");
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
          audio: buildMicrophoneAudioConstraints(inputDeviceId),
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
              LOGIN_SETUP_MICROPHONE_METER_BARS,
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
          setMessage(`麥克風偵測失敗：${getErrorMessage(error)}`);
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

  return message === undefined
    ? { activeBars, status }
    : { activeBars, status, message };
}
