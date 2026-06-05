import { useEffect, useMemo, useState } from "react";

type InstallerState = "loading" | "ready" | "installing" | "done" | "error";

function AssistantMark(): React.JSX.Element {
  return (
    <div className="installer-mark" aria-hidden="true">
      <svg viewBox="0 0 96 70" role="img">
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
    <div className="installer-window-controls" aria-label="窗口控制">
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
        aria-label="关闭"
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
  const canInstall = state === "ready" && agreed && installDir.trim().length > 0;

  const diskHint = useMemo(
    () => "需要至少 200MB 可用空间，建议保留 500MB 以上可用空间。",
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
        setError(loadError instanceof Error ? loadError.message : String(loadError));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const browseInstallDir = (): void => {
    void window.voiceAI
      .selectInstallerDirectory(installDir)
      .then((result) => {
        if (!result.canceled) {
          setInstallDir(result.installDir);
        }
      })
      .catch((browseError: unknown) => {
        setError(
          browseError instanceof Error ? browseError.message : String(browseError),
        );
        setState("error");
      });
  };

  const startInstall = (): void => {
    if (!canInstall) {
      return;
    }
    setError(undefined);
    setState("installing");
    void window.voiceAI
      .installFromShell({
        installDir,
        createDesktopShortcut,
        launchAtLogin,
      })
      .then((result) => {
        setInstallDir(result.installDir);
        setState("done");
      })
      .catch((installError: unknown) => {
        setError(
          installError instanceof Error
            ? installError.message
            : String(installError),
        );
        setState("error");
      });
  };

  const launchInstalledApp = (): void => {
    void window.voiceAI.launchInstalledApp(installDir);
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
        <h1 className="installer-title">欢迎使用 Voice Assistant Service</h1>

        {state === "installing" ? (
          <div className="installer-progress-panel">
            <div className="installer-progress" role="progressbar" aria-label="installing">
              <span className="installer-progress__fill" />
            </div>
            <p>正在安装，请稍候...</p>
          </div>
        ) : null}

        {state === "done" ? (
          <div className="installer-done">
            <p>安装完成</p>
            <button
              className="installer-primary installer-primary--compact"
              type="button"
              onClick={launchInstalledApp}
            >
              立即体验
            </button>
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
                    aria-label="安装路径"
                  />
                  <button
                    className="installer-browse"
                    type="button"
                    onClick={browseInstallDir}
                  >
                    选择安装位置
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
                    <span>创建桌面图标</span>
                  </label>
                  <label className="installer-check">
                    <input
                      type="checkbox"
                      checked={launchAtLogin}
                      onChange={(event) =>
                        setLaunchAtLogin(event.currentTarget.checked)
                      }
                    />
                    <span>开机自启动</span>
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
                一键安装
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
            <span>同意《用户使用协议》</span>
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
              立即安装
            </button>
          </div>
        ) : state === "ready" || state === "error" ? (
          <button
            className="installer-link"
            type="button"
            onClick={() => setCustomOpen(true)}
          >
            自定义安装
          </button>
        ) : (
          <span />
        )}
      </footer>
    </main>
  );
}
