import { useEffect, useMemo, useState } from "react";
import type { AppSettings } from "@voice/shared";
import type { AuthSessionSnapshot } from "../../../main/auth/authTypes";
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
type SetupContentStep = "privacy" | "permissions" | "microphone" | "ready";
type LoginMode = "email" | "ldap";
type MessageTone = "info" | "error";
type MicrophoneLevelStatus = "idle" | "listening" | "error" | "unavailable";

const SETUP_STEPS: Array<{ id: LoginSetupStep; label: string }> = [
  { id: "login", label: "登录" },
  { id: "settings", label: "设置" },
  { id: "experience", label: "隐私" },
  { id: "ready", label: "就绪" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEVELOPMENT_LOGIN_EMAIL = "dev@example.test";
const DEVELOPMENT_LOGIN_CODE = "000000";
const LOGIN_SETUP_MICROPHONE_METER_BARS = 12;

function resolveOuterStep(contentStep: SetupContentStep): LoginSetupStep {
  if (contentStep === "privacy" || contentStep === "permissions") {
    return "settings";
  }
  if (contentStep === "microphone") {
    return "experience";
  }
  return "ready";
}

function WindowControls(): React.JSX.Element {
  return (
    <div className="login-setup__window-controls" aria-label="窗口控制">
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
        aria-label="关闭"
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

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const authHttpErrorPrefix = "AuthHttpError:";
  const authHttpErrorIndex = message.lastIndexOf(authHttpErrorPrefix);
  if (authHttpErrorIndex >= 0) {
    return message.slice(authHttpErrorIndex + authHttpErrorPrefix.length).trim();
  }
  return message;
}

export function LoginSetupPage(): React.JSX.Element {
  const [contentStep, setContentStep] = useState<SetupContentStep>("privacy");
  const [loginStepVisible, setLoginStepVisible] = useState(true);
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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

  const step = loginStepVisible ? "login" : resolveOuterStep(contentStep);
  const activeStepIndex = useMemo(() => getStepIndex(step), [step]);
  const selectedInputDeviceId = settings?.recording.inputDeviceId ?? "";
  const canSendCode =
    EMAIL_PATTERN.test(email.trim()) && cooldown <= 0 && !sendingCode && !submitting;
  const canSubmit =
    !submitting &&
    !sendingCode &&
    !completingSetup &&
    (isDevelopmentMode ||
      (mode === "email"
        ? EMAIL_PATTERN.test(email.trim()) && code.trim().length > 0
        : account.trim().length > 0 && password.length > 0));
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
          setMessage(snapshot.message ?? "网络连接不可用，请稍后重试。");
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
        setMessage(snapshot.message ?? "网络连接不可用，请稍后重试。");
      } else if (snapshot.message) {
        setMessageTone("info");
        setMessage(snapshot.message);
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

  const sendCode = (): void => {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setMessageTone("error");
      setMessage("请输入有效的邮箱地址。");
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
        setMessage("验证码已发送，请检查邮箱。");
      })
      .catch((error: unknown) => {
        setMessageTone("error");
        setMessage(getErrorMessage(error));
      })
      .finally(() => setSendingCode(false));
  };

  const submitLogin = (): void => {
    if (!canSubmit) {
      setMessageTone("error");
      setMessage(
        mode === "email" ? "请输入邮箱和验证码。" : "请输入域账号和密码。",
      );
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
            rememberMe,
          })
        : window.voiceAI.loginWithLdap({
            account:
              isDevelopmentMode && account.trim().length === 0
                ? "dev-user"
                : account.trim(),
            password: isDevelopmentMode && password.length === 0 ? "dev" : password,
            rememberMe,
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
        setMessage(snapshot.message ?? "登录未完成，请检查账户信息。");
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
    if (contentStep === "privacy") {
      setContentStep("permissions");
      return;
    }
    if (contentStep === "permissions") {
      setContentStep("microphone");
      return;
    }
    if (contentStep === "microphone") {
      setContentStep("ready");
      return;
    }
    if (contentStep === "ready") {
      setMessageTone("info");
      setMessage("正在进入主应用。");
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
    if (contentStep === "permissions") {
      setContentStep("privacy");
      return;
    }
    if (contentStep === "microphone") {
      setContentStep("permissions");
      return;
    }
    if (contentStep === "ready") {
      setContentStep("microphone");
    }
  };

  const updateMicrophoneDevice = (deviceId: string): void => {
    setSettings((current) =>
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

  return (
    <main
      className={
        loginStepVisible
          ? "login-setup login-setup--login"
          : "login-setup login-setup--wizard"
      }
    >
      <header className="login-setup__chrome">
        <span className="login-setup__brand">Voice Assistant 安装向导</span>
        <WindowControls />
      </header>

      <section className="login-setup__shell" aria-live="polite">
        {loginStepVisible ? null : <AssistantMark />}
        <div className="login-setup__heading">
          <p className="login-setup__eyebrow">Voice Assistant 登录向导</p>
          <h1>登录您的账户</h1>
        </div>

        <ol className="login-setup__steps" aria-label="登录设置步骤">
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
                <h2>登录您的账号</h2>
                <div className="login-setup__mode-tabs">
                  <button
                    className="login-setup__mode-tab"
                    type="button"
                    onClick={() => {
                      setMode(mode === "email" ? "ldap" : "email");
                      setPassword("");
                      setMessage(undefined);
                    }}
                  >
                    {mode === "email" ? "使用AD域登录" : "使用邮箱验证码登录"}
                  </button>
                </div>
              </header>
              <p className="login-setup__login-intro">
                使用邮箱 + 验证码快速登录，云端同步配置与历史。
              </p>

              {mode === "email" ? (
                <div className="login-setup__form">
                  <label className="login-setup__field">
                    <span>电子邮箱</span>
                    <input
                      value={email}
                      type="email"
                      autoComplete="email"
                      placeholder="your@company.com"
                      onChange={(event) => setEmail(event.currentTarget.value)}
                    />
                  </label>
                  <label className="login-setup__field">
                    <span>验证码</span>
                    <div className="login-setup__code-row">
                      <input
                        value={code}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="验证码"
                        onChange={(event) => setCode(event.currentTarget.value)}
                      />
                      <button
                        className="login-setup__secondary"
                        type="button"
                        disabled={!canSendCode}
                        onClick={sendCode}
                      >
                        {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
                      </button>
                    </div>
                    <small>请在160秒内输入验证码。</small>
                  </label>
                </div>
              ) : (
                <div className="login-setup__form">
                  <label className="login-setup__field">
                    <span>AD 域账号</span>
                    <input
                      value={account}
                      autoComplete="username"
                      placeholder="domain\\account"
                      onChange={(event) => setAccount(event.currentTarget.value)}
                    />
                  </label>
                  <label className="login-setup__field">
                    <span>密码</span>
                    <input
                      value={password}
                      type="password"
                      autoComplete="current-password"
                      placeholder="输入密码"
                      onChange={(event) => setPassword(event.currentTarget.value)}
                    />
                  </label>
                </div>
              )}

              {statusMessage}

              <div className="login-setup__form-footer">
                <label className="login-setup__check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.currentTarget.checked)
                    }
                  />
                  <span>记住登录状态</span>
                </label>
                <button
                  className="login-setup__primary"
                  type="button"
                  disabled={!canSubmit}
                  onClick={submitLogin}
                >
                  {submitting ? (
                    "正在登录..."
                  ) : (
                    <>
                      <span>登录</span>
                      <span className="login-setup__primary-arrow" aria-hidden="true">
                        →
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}

          {!loginStepVisible ? (
            <SetupWizardPage
              step={contentStep}
              inputDeviceId={selectedInputDeviceId}
              language={settings?.ui.language}
              pickerOpenSignal={microphonePickerOpenSignal}
              completingSetup={completingSetup}
              onBack={goBackSetup}
              onNext={continueSetup}
              onSkipMicrophone={() => setContentStep("ready")}
              onOpenMicrophonePicker={() =>
                setMicrophonePickerOpenSignal((current) => current + 1)
              }
              onMicrophoneDeviceChange={updateMicrophoneDevice}
            />
          ) : null}

          {loginStepVisible ? null : statusMessage}
        </div>
      </section>
    </main>
  );
}

function SetupWizardPage({
  step,
  inputDeviceId,
  language,
  pickerOpenSignal,
  completingSetup,
  onBack,
  onNext,
  onSkipMicrophone,
  onOpenMicrophonePicker,
  onMicrophoneDeviceChange,
}: {
  step: SetupContentStep;
  inputDeviceId: string;
  language: AppSettings["ui"]["language"] | undefined;
  pickerOpenSignal: number;
  completingSetup: boolean;
  onBack(): void;
  onNext(): void;
  onSkipMicrophone(): void;
  onOpenMicrophonePicker(): void;
  onMicrophoneDeviceChange(deviceId: string): void;
}): React.JSX.Element {
  const primaryLabel =
    step === "privacy"
      ? "开始"
      : step === "permissions"
        ? "同意"
        : step === "ready"
          ? completingSetup
            ? "正在进入..."
            : "进入主应用"
          : "下一步";

  return (
    <>
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
        {step === "ready" ? <ReadyStep /> : null}
      </div>
      <footer className="login-setup__wizard-footer">
        <button
          className="login-setup__back-link"
          type="button"
          disabled={completingSetup}
          onClick={onBack}
        >
          <span aria-hidden="true">↩</span>
          上一步
        </button>
        <div className="login-setup__footer-actions">
          {step === "microphone" ? (
            <button
              className="login-setup__ghost"
              type="button"
              onClick={onSkipMicrophone}
            >
              跳过设置
              <span aria-hidden="true">···›</span>
            </button>
          ) : null}
          <button
            className="login-setup__primary login-setup__primary--wide"
            type="button"
            disabled={completingSetup}
            onClick={onNext}
          >
            {primaryLabel}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </footer>
    </>
  );
}

function PrivacyStep(): React.JSX.Element {
  return (
    <section className="login-setup__copy-page">
      <h2>感谢您的信任，我们尊重您的隐私</h2>
      <div className="login-setup__copy-list">
        <InfoBlock
          title="零云数据保留"
          description="您的语音输入是私密的，且没有数据保留。"
        />
        <InfoBlock
          title="从不训练您的数据"
          description="您的任何输入数据都不会被我们或第三方存储或用于模型训练。"
        />
        <InfoBlock
          title="设备内历史记录存储"
          description="所有历史记录都保留在您的设备上。"
        />
      </div>
    </section>
  );
}

function PermissionsStep(): React.JSX.Element {
  return (
    <section className="login-setup__copy-page">
      <h2>使用 Voice Assistant 的全部功能，需要您同意我们使用以下权限。</h2>
      <div className="login-setup__permission-consent">
        <span aria-hidden="true">☑</span>
        <strong>自动写入权限</strong>
      </div>
      <div className="login-setup__copy-list">
        <InfoBlock
          title="自动写入权限"
          description="允许 AOA 把结果放进当前选中输入框。"
        />
        <InfoBlock
          title="剪贴板/选中文本访问"
          description="用于粘贴、改写、翻译选中的内容。"
        />
        <InfoBlock
          title="全局快捷键"
          description="允许在其他应用中唤起 AOA。"
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
          <h2>测试您的麦克风</h2>
          <p>选择麦克风并开始说话。</p>
        </div>
        <button
          className="login-setup__device-link"
          type="button"
          onClick={onOpenPicker}
        >
          <span aria-hidden="true">♩</span>
          换一个麦克风
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
          label="麦克风输入音量"
        />
        <strong>当您说话时是否看到蓝色条型图在移动</strong>
        {micLevel.message ? <p>{micLevel.message}</p> : null}
      </div>
    </section>
  );
}

function ReadyStep(): React.JSX.Element {
  return (
    <section className="login-setup__ready-page">
      <div className="login-setup__ready-icon" aria-hidden="true">
        ✓
      </div>
      <h2>准备就绪</h2>
      <p>账户、权限说明和麦克风设置已经完成。进入主应用后即可继续配置和使用。</p>
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
      setMessage("当前环境无法读取麦克风。");
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) {
      setActiveBars(0);
      setStatus("unavailable");
      setMessage("当前环境无法检测音量。");
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
          setMessage(
            `麦克风检测失败：${error instanceof Error ? error.message : String(error)}`,
          );
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
