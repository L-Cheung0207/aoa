import { useEffect, useMemo, useRef, useState } from "react";

type UninstallState = "ready" | "running" | "done" | "error";

const PROGRESS_TICK_MS = 90;

export function UninstallPage(): React.JSX.Element {
  const [state, setState] = useState<UninstallState>("ready");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const uninstallStartedRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    if (state !== "running") {
      return;
    }
    const handle = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 3));
    }, PROGRESS_TICK_MS);
    return () => window.clearInterval(handle);
  }, [state]);

  useEffect(() => {
    if (state !== "running" || progress < 100) {
      return;
    }
    if (uninstallStartedRef.current) {
      return;
    }
    uninstallStartedRef.current = true;
    void window.voiceAI
      .performUninstall()
      .then(() => {
        runningRef.current = false;
        setState("done");
      })
      .catch((uninstallError: unknown) => {
        runningRef.current = false;
        uninstallStartedRef.current = false;
        setError(
          uninstallError instanceof Error
            ? uninstallError.message
            : String(uninstallError),
        );
        setState("error");
      });
  }, [progress, state]);

  const statusText = useMemo(() => {
    if (state !== "running") {
      return "";
    }
    return `正在卸载 ${Math.round(progress)}%`;
  }, [progress, state]);

  const startUninstall = (): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    uninstallStartedRef.current = false;
    setError(undefined);
    setProgress(0);
    setState("running");
  };

  const cancelUninstall = (): void => {
    runningRef.current = false;
    uninstallStartedRef.current = false;
    setProgress(0);
    setState("ready");
  };

  const closeWindow = (): void => {
    window.voiceAI.controlHomeWindow("close");
  };

  const finishUninstall = (): void => {
    void window.voiceAI.finishUninstall();
  };

  return (
    <main className="uninstall-page">
      <WindowControls />
      <div className="uninstall-stage" aria-live="polite">
        {state === "ready" || state === "error" ? (
          <>
            <AssistantMark />
            <h1 className="uninstall-title">准备卸载</h1>
            {error ? <p className="uninstall-error">{error}</p> : null}
            <div className="uninstall-actions">
              <button
                className="uninstall-button uninstall-button--secondary"
                type="button"
                onClick={startUninstall}
              >
                开始卸载
              </button>
              <button
                className="uninstall-button uninstall-button--primary"
                type="button"
                onClick={closeWindow}
              >
                点错了
              </button>
            </div>
          </>
        ) : null}

        {state === "running" ? (
          <div className="uninstall-progress-panel">
            <div
              className="uninstall-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="uninstall-progress__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="uninstall-progress__label">{statusText}</p>
            <button
              className="uninstall-button uninstall-button--secondary uninstall-button--cancel"
              type="button"
              onClick={cancelUninstall}
            >
              取消
            </button>
          </div>
        ) : null}

        {state === "done" ? (
          <div className="uninstall-done">
            <h1 className="uninstall-done__title">期待再见</h1>
            <button
              className="uninstall-button uninstall-button--secondary"
              type="button"
              onClick={finishUninstall}
            >
              卸载完成
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function WindowControls(): React.JSX.Element {
  return (
    <div className="uninstall-window-controls" aria-label="窗口控制">
      <button
        className="uninstall-window-controls__button"
        type="button"
        aria-label="最小化"
        onClick={() => window.voiceAI.controlHomeWindow("minimize")}
      >
        <span className="uninstall-window-controls__icon uninstall-window-controls__icon--minimize" />
      </button>
      <button
        className="uninstall-window-controls__button"
        type="button"
        aria-label="最大化"
        onClick={() => window.voiceAI.controlHomeWindow("toggleMaximize")}
      >
        <span className="uninstall-window-controls__icon uninstall-window-controls__icon--maximize" />
      </button>
      <button
        className="uninstall-window-controls__button uninstall-window-controls__button--close"
        type="button"
        aria-label="关闭"
        onClick={() => window.voiceAI.controlHomeWindow("close")}
      >
        <span className="uninstall-window-controls__icon uninstall-window-controls__icon--close" />
      </button>
    </div>
  );
}

function AssistantMark(): React.JSX.Element {
  return (
    <div className="uninstall-mark" aria-hidden="true">
      <svg viewBox="0 0 72 52" role="img">
        <path
          d="M14 6h34c10.5 0 19 8.5 19 19s-8.5 19-19 19H34l-7 8-1.5-8H14C3.5 44 0 35.5 0 25S3.5 6 14 6Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <circle cx="21" cy="25" r="6" fill="currentColor" />
        <circle cx="49" cy="25" r="6" fill="currentColor" />
      </svg>
    </div>
  );
}
