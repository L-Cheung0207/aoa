import { useRef, useState } from "react";

type UninstallState = "ready" | "running" | "closing" | "done" | "error";

export function UninstallPage(): React.JSX.Element {
  const [state, setState] = useState<UninstallState>("ready");
  const [error, setError] = useState<string | undefined>(undefined);
  const runningRef = useRef(false);

  const startUninstall = (): void => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setError(undefined);
    setState("running");

    void window.voiceAI
      .performUninstall()
      .then((result) => {
        runningRef.current = false;
        if (result.launchedCleanup) {
          setState("closing");
          window.setTimeout(() => {
            void window.voiceAI.finishUninstall();
          }, 900);
          return;
        }
        void window.voiceAI.finishUninstall();
      })
      .catch((uninstallError: unknown) => {
        runningRef.current = false;
        setError(
          uninstallError instanceof Error
            ? uninstallError.message
            : String(uninstallError),
        );
        setState("error");
      });
  };

  const closeWindow = (): void => {
    void window.voiceAI.cancelUninstall();
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
            <h1 className="uninstall-title">{"准备卸载"}</h1>
            {error ? <p className="uninstall-error">{error}</p> : null}
            <div className="uninstall-actions">
              <button
                className="uninstall-button uninstall-button--secondary"
                type="button"
                onClick={startUninstall}
              >
                {"开始卸载"}
              </button>
              <button
                className="uninstall-button uninstall-button--primary"
                type="button"
                onClick={closeWindow}
              >
                {"点错了"}
              </button>
            </div>
          </>
        ) : null}

        {state === "running" ? (
          <div className="uninstall-progress-panel">
            <div
              className="uninstall-progress uninstall-progress--indeterminate"
              role="progressbar"
              aria-label="uninstalling"
            >
              <div className="uninstall-progress__fill uninstall-progress__fill--indeterminate" />
            </div>
            <p className="uninstall-progress__label">{"正在卸载，请稍候..."}</p>
          </div>
        ) : null}

        {state === "closing" ? (
          <div className="uninstall-progress-panel">
            <div
              className="uninstall-progress uninstall-progress--indeterminate"
              role="progressbar"
              aria-label="finishing uninstall"
            >
              <div className="uninstall-progress__fill uninstall-progress__fill--indeterminate" />
            </div>
            <p className="uninstall-progress__label">
              {"Finishing cleanup in background..."}
            </p>
          </div>
        ) : null}

        {state === "done" ? (
          <div className="uninstall-done">
            <h1 className="uninstall-done__title">{"期待再见"}</h1>
            <p className="uninstall-progress__label uninstall-done__hint">
              {"点击“卸载完成”后，将关闭窗口并继续完成最后清理。"}
            </p>
            <button
              className="uninstall-button uninstall-button--secondary"
              type="button"
              onClick={finishUninstall}
            >
              {"卸载完成"}
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
        onClick={() => void window.voiceAI.cancelUninstall()}
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
