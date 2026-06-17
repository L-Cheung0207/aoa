import { useEffect, useMemo, useState } from "react";
import type { AuthSessionSnapshot } from "../../../main/auth/authTypes";
import "./login-setup.css";

type LoginSetupStep = "login" | "settings" | "experience" | "ready";
type LoginMode = "email" | "ldap";

const SETUP_STEPS: Array<{ id: LoginSetupStep; label: string }> = [
  { id: "login", label: "登录" },
  { id: "settings", label: "设置" },
  { id: "experience", label: "体验" },
  { id: "ready", label: "就绪" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      <svg viewBox="-4 0 100 70" role="img">
        <path
          d="M20 8h44c15 0 27 11.4 27 25.5S79 59 64 59H45l-9 10-2-10H20C5 59 0 47.6 0 33.5S5 8 20 8Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <circle cx="29" cy="33.5" r="7" fill="currentColor" />
        <circle cx="63" cy="33.5" r="7" fill="currentColor" />
      </svg>
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
  const [step, setStep] = useState<LoginSetupStep>("login");
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [cooldown, setCooldown] = useState(0);
  const [session, setSession] = useState<AuthSessionSnapshot | undefined>(
    undefined,
  );

  const activeStepIndex = useMemo(() => getStepIndex(step), [step]);
  const canSendCode =
    EMAIL_PATTERN.test(email.trim()) && cooldown <= 0 && !submitting;
  const canSubmit =
    !submitting &&
    (mode === "email"
      ? EMAIL_PATTERN.test(email.trim()) && code.trim().length > 0
      : account.trim().length > 0 && password.length > 0);

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
          setStep("settings");
        }
        if (snapshot.status === "offline") {
          setMessage(snapshot.message ?? "网络连接不可用，请稍后重试。");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(getErrorMessage(error));
        }
      });

    const unsubscribe = window.voiceAI.onAuthSessionChanged((snapshot) => {
      setSession(snapshot);
      if (snapshot.status === "authenticated") {
        setPassword("");
        setStep("settings");
        setMessage(
          snapshot.user?.displayName ? `欢迎，${snapshot.user.displayName}` : undefined,
        );
      } else if (snapshot.status === "offline") {
        setMessage(snapshot.message ?? "网络连接不可用，请稍后重试。");
      } else if (snapshot.message) {
        setMessage(snapshot.message);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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
      setMessage("请输入有效的邮箱地址。");
      return;
    }
    if (cooldown > 0) {
      return;
    }
    setSubmitting(true);
    setMessage(undefined);
    void window.voiceAI
      .sendEmailCode({ email: trimmedEmail })
      .then((result) => {
        setCooldown(result.cooldownSeconds);
        setMessage("验证码已发送，请检查邮箱。");
      })
      .catch((error: unknown) => {
        setMessage(getErrorMessage(error));
      })
      .finally(() => setSubmitting(false));
  };

  const submitLogin = (): void => {
    if (!canSubmit) {
      setMessage(
        mode === "email" ? "请输入邮箱和验证码。" : "请输入域账号和密码。",
      );
      return;
    }

    setSubmitting(true);
    setMessage(undefined);
    const loginMode = mode;
    const login =
      loginMode === "email"
        ? window.voiceAI.loginWithEmailCode({
            email: email.trim(),
            code: code.trim(),
            rememberMe,
          })
        : window.voiceAI.loginWithLdap({
            account: account.trim(),
            password,
            rememberMe,
          });

    void login
      .then((snapshot) => {
        setSession(snapshot);
        if (snapshot.status === "authenticated") {
          setPassword("");
          setStep("settings");
          setMessage(
            snapshot.user?.displayName
              ? `欢迎，${snapshot.user.displayName}`
              : "登录成功。",
          );
          return;
        }
        setMessage(snapshot.message ?? "登录未完成，请检查账户信息。");
      })
      .catch((error: unknown) => {
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
    setMessage(undefined);
    if (step === "settings") {
      setStep("experience");
      return;
    }
    if (step === "experience") {
      setStep("ready");
      return;
    }
    if (step === "ready") {
      setMessage("等待主进程进入主应用。");
    }
  };

  return (
    <main className="login-setup">
      <header className="login-setup__chrome">
        <span className="login-setup__brand">Voice Assistant</span>
        <WindowControls />
      </header>

      <section className="login-setup__shell" aria-live="polite">
        <AssistantMark />
        <div className="login-setup__heading">
          <p className="login-setup__eyebrow">Voice Assistant 登录向导</p>
          <h1>登录您的账户</h1>
        </div>

        <ol className="login-setup__steps" aria-label="登录设置步骤">
          {SETUP_STEPS.map((item, index) => (
            <li
              className={
                index <= activeStepIndex
                  ? "login-setup__step login-setup__step--active"
                  : "login-setup__step"
              }
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
              <div className="login-setup__mode-tabs" role="tablist">
                <button
                  className={
                    mode === "email"
                      ? "login-setup__mode-tab login-setup__mode-tab--active"
                      : "login-setup__mode-tab"
                  }
                  type="button"
                  role="tab"
                  aria-selected={mode === "email"}
                  onClick={() => {
                    setPassword("");
                    setMode("email");
                    setMessage(undefined);
                  }}
                >
                  邮箱验证码
                </button>
                <button
                  className={
                    mode === "ldap"
                      ? "login-setup__mode-tab login-setup__mode-tab--active"
                      : "login-setup__mode-tab"
                  }
                  type="button"
                  role="tab"
                  aria-selected={mode === "ldap"}
                  onClick={() => {
                    setMode("ldap");
                    setMessage(undefined);
                  }}
                >
                  LDAP/AD
                </button>
              </div>

              {mode === "email" ? (
                <div className="login-setup__form">
                  <label className="login-setup__field">
                    <span>邮箱地址</span>
                    <input
                      value={email}
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
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
                        placeholder="6 位验证码"
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
                  {submitting
                    ? "正在登录..."
                    : mode === "email"
                      ? "登录"
                      : "使用 AD 域登录"}
                </button>
              </div>
            </>
          ) : null}

          {step === "settings" ? (
            <SetupStepPanel
              title="基础设置"
              description="登录已完成。后续版本会在这里集中确认语言、设备和连接偏好。"
              actionLabel="下一步"
              onAction={continueSetup}
            />
          ) : null}

          {step === "experience" ? (
            <SetupStepPanel
              title="体验准备"
              description="主应用会在启动门禁流程中接管。这里仅保留轻量引导，不提前创建主窗口。"
              actionLabel="下一步"
              onAction={continueSetup}
            />
          ) : null}

          {step === "ready" ? (
            <SetupStepPanel
              title="准备就绪"
              description="账户已可用于 Voice Assistant。进入主应用后即可继续配置和使用。"
              actionLabel="进入主应用"
              onAction={continueSetup}
            />
          ) : null}
        </div>

        {message ? (
          <p
            className={
              session?.status === "offline"
                ? "login-setup__message login-setup__message--error"
                : "login-setup__message"
            }
            role="status"
          >
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function SetupStepPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction(): void;
}): React.JSX.Element {
  return (
    <div className="login-setup__placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="login-setup__primary" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
