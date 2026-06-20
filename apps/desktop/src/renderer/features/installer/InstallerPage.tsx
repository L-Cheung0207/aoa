import { useEffect, useMemo, useState } from "react";

type InstallerState = "loading" | "ready" | "installing" | "done" | "error";

const INSTALL_PROGRESS_START = 8;
const INSTALL_PROGRESS_STEPS = [
  { percent: 12, label: "正在準備安裝環境..." },
  { percent: 24, label: "正在校驗安裝位置..." },
  { percent: 42, label: "正在解壓應用檔案..." },
  { percent: 68, label: "正在寫入程式元件..." },
  { percent: 86, label: "正在建立捷徑..." },
  { percent: 94, label: "正在完成最後設定..." },
] as const;
const FIRST_INSTALL_PROGRESS_LABEL = INSTALL_PROGRESS_STEPS[0].label;

function getInstallerErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
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
  if (normalized === "Backend returned invalid payload") {
    return "安裝服務暫時不可用，請稍後再試。";
  }
  return "操作失敗，請稍後再試。";
}

function AssistantMark(): React.JSX.Element {
  return (
    <div className="installer-mark" aria-hidden="true">
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

function WindowControls(): React.JSX.Element {
  return (
    <div className="installer-window-controls" aria-label="視窗控制">
      <button
        className="installer-window-button"
        type="button"
        aria-label="最小化"
        onClick={() => window.voiceAI.controlHomeWindow("minimize")}
      >
        <span className="installer-window-button__minimize" />
      </button>
      <button
        className="installer-window-button installer-window-button--close"
        type="button"
        aria-label="關閉"
        onClick={() => window.voiceAI.controlHomeWindow("close")}
      >
        <span className="installer-window-button__close" />
      </button>
    </div>
  );
}

export function InstallerPage(): React.JSX.Element {
  const [state, setState] = useState<InstallerState>("loading");
  const [installDir, setInstallDir] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true);
  const [launchAtLogin, setLaunchAtLogin] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [launching, setLaunching] = useState(false);
  const [progressPercent, setProgressPercent] = useState(INSTALL_PROGRESS_START);
  const [progressLabel, setProgressLabel] = useState<string>(
    FIRST_INSTALL_PROGRESS_LABEL,
  );
  const canInstall = state === "ready" && agreed && installDir.trim().length > 0;

  const diskHint = useMemo(
    () => "需要至少 200MB 可用空間，建議保留 500MB 以上可用空間。",
    [],
  );

  useEffect(() => {
    let cancelled = false;
    window.voiceAI
      .getInstallerDefaults()
      .then((defaults) => {
        if (cancelled) {
          return;
        }
        setInstallDir(defaults.installDir);
        setCreateDesktopShortcut(defaults.createDesktopShortcut);
        setLaunchAtLogin(defaults.launchAtLogin);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(getInstallerErrorMessage(loadError));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "installing") {
      return undefined;
    }

    let currentPercent = INSTALL_PROGRESS_START;
    let stepIndex = 0;
    setProgressPercent(currentPercent);
    setProgressLabel(FIRST_INSTALL_PROGRESS_LABEL);

    const timer = window.setInterval(() => {
      const currentStep = INSTALL_PROGRESS_STEPS[stepIndex]!;

      if (currentPercent < currentStep.percent) {
        currentPercent = Math.min(currentPercent + 4, currentStep.percent);
        setProgressPercent(currentPercent);
        return;
      }

      if (stepIndex < INSTALL_PROGRESS_STEPS.length - 1) {
        stepIndex += 1;
        setProgressLabel(INSTALL_PROGRESS_STEPS[stepIndex]!.label);
      }
    }, 520);

    return () => window.clearInterval(timer);
  }, [state]);

  const browseInstallDir = (): void => {
    void window.voiceAI
      .selectInstallerDirectory(installDir)
      .then((result) => {
        if (!result.canceled) {
          setInstallDir(result.installDir);
        }
      })
      .catch((browseError: unknown) => {
        setError(getInstallerErrorMessage(browseError));
        setState("error");
      });
  };

  const startInstall = (): void => {
    if (!canInstall) {
      return;
    }
    setError(undefined);
    setLaunching(false);
    setProgressPercent(INSTALL_PROGRESS_START);
    setProgressLabel(FIRST_INSTALL_PROGRESS_LABEL);
    setState("installing");
    void window.voiceAI
      .installFromShell({
        installDir,
        createDesktopShortcut,
        launchAtLogin,
      })
      .then((result) => {
        setInstallDir(result.installDir);
        setProgressPercent(100);
        setProgressLabel("安裝完成");
        setState("done");
      })
      .catch((installError: unknown) => {
        setError(getInstallerErrorMessage(installError));
        setState("error");
      });
  };

  const launchInstalledApp = (): void => {
    setError(undefined);
    setLaunching(true);
    void window.voiceAI
      .launchInstalledApp(installDir)
      .catch((launchError: unknown) => {
        setError(getInstallerErrorMessage(launchError));
      })
      .finally(() => {
        setLaunching(false);
      });
  };

  return (
    <main className="installer-page">
      <div className="installer-bg" aria-hidden="true" />
      <header className="installer-chrome">
        <span className="installer-brand">Voice Assistant</span>
        <WindowControls />
      </header>

      <section className="installer-stage" aria-live="polite">
        <AssistantMark />
        <h1 className="installer-title">歡迎使用 Voice Assistant Service</h1>

        {state === "installing" ? (
          <div className="installer-progress-panel">
            <div className="installer-progress-header">
              <span>{progressLabel}</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div
              className="installer-progress"
              role="progressbar"
              aria-label="安裝進度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <span
                className="installer-progress__fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {state === "done" ? (
          <div className="installer-done">
            <p>安裝完成</p>
            <button
              className="installer-primary installer-primary--compact"
              type="button"
              disabled={launching}
              onClick={launchInstalledApp}
            >
              {launching ? "正在啟動..." : "立即體驗"}
            </button>
            {error ? <p className="installer-error">{error}</p> : null}
          </div>
        ) : null}

        {state !== "installing" && state !== "done" ? (
          <>
            {customOpen ? (
              <div className="installer-custom-panel">
                <div className="installer-path-row">
                  <input
                    className="installer-path"
                    value={installDir}
                    onChange={(event) => setInstallDir(event.currentTarget.value)}
                    spellCheck={false}
                    aria-label="安裝路徑"
                  />
                  <button
                    className="installer-browse"
                    type="button"
                    onClick={browseInstallDir}
                  >
                    選擇安裝位置
                  </button>
                </div>
                <p className="installer-hint">{diskHint}</p>
                <div className="installer-options">
                  <label className="installer-check">
                    <input
                      type="checkbox"
                      checked={createDesktopShortcut}
                      onChange={(event) =>
                        setCreateDesktopShortcut(event.currentTarget.checked)
                      }
                    />
                    <span>建立桌面圖示</span>
                  </label>
                  <label className="installer-check">
                    <input
                      type="checkbox"
                      checked={launchAtLogin}
                      onChange={(event) =>
                        setLaunchAtLogin(event.currentTarget.checked)
                      }
                    />
                    <span>開機自動啟動</span>
                  </label>
                </div>
              </div>
            ) : (
              <button
                className="installer-primary"
                type="button"
                disabled={!canInstall}
                onClick={startInstall}
              >
                一鍵安裝
              </button>
            )}

            {error ? <p className="installer-error">{error}</p> : null}
          </>
        ) : null}
      </section>

      <footer className="installer-footer">
        {state !== "installing" && state !== "done" ? (
          <label className="installer-check installer-agreement">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.currentTarget.checked)}
            />
            <span>同意《用戶使用協議》</span>
          </label>
        ) : (
          <span />
        )}

        {customOpen && state !== "installing" && state !== "done" ? (
          <div className="installer-footer-actions">
            <button
              className="installer-secondary"
              type="button"
              onClick={() => setCustomOpen(false)}
            >
              返回
            </button>
            <button
              className="installer-primary installer-primary--small"
              type="button"
              disabled={!canInstall}
              onClick={startInstall}
            >
              立即安裝
            </button>
          </div>
        ) : state === "ready" || state === "error" ? (
          <button
            className="installer-link"
            type="button"
            onClick={() => setCustomOpen(true)}
          >
            自訂安裝
          </button>
        ) : (
          <span />
        )}
      </footer>
    </main>
  );
}
