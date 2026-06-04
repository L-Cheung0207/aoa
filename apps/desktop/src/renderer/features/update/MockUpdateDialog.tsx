import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { InterfaceLanguage } from "@voice/shared";

interface UpdateReadyDialogProps {
  language?: InterfaceLanguage | undefined;
  version?: string | undefined;
  onClose(): void;
  onRestart(): void;
}

type MockUpdateState = "checking" | "available" | "latest" | "installing" | "completed";

interface MockUpdateDialogProps {
  currentVersion?: string | undefined;
  onClose(): void;
}

type UpdateReadyText = {
  title: string;
  close: string;
  message: string;
  restart: string;
  versionPrefix: string;
};

const MOCK_VERSION = "1.2.1";
const CHECKING_DELAY_MS = 900;
const INSTALL_TICK_MS = 120;

const RELEASE_NOTES = [
  "优化检查更新流程和安装包校验",
  "提升语音助手启动稳定性",
  "修复部分窗口状态切换问题"
];

const UPDATE_READY_TEXT: Record<InterfaceLanguage, UpdateReadyText> = {
  "zh-CN": {
    title: "有可用更新",
    close: "关闭更新提示",
    message: "重启应用程序以安装更新。",
    restart: "重启",
    versionPrefix: "有可用更新 "
  },
  "zh-TW": {
    title: "有可用更新",
    close: "關閉更新提示",
    message: "重啟應用程式以安裝更新。",
    restart: "重啟",
    versionPrefix: "有可用更新 "
  },
  "en-US": {
    title: "Update Available",
    close: "Close update prompt",
    message: "Restart the app to install the update.",
    restart: "Restart",
    versionPrefix: "Update available "
  }
};

function getUpdateReadyText(language: InterfaceLanguage | undefined): UpdateReadyText {
  return UPDATE_READY_TEXT[language ?? "zh-CN"] ?? UPDATE_READY_TEXT["zh-CN"];
}

export function UpdateReadyDialog({
  language,
  version,
  onClose,
  onRestart
}: UpdateReadyDialogProps): React.JSX.Element {
  const text = getUpdateReadyText(language);
  const label = version ? `${text.versionPrefix}${formatVersionLabel(version)}` : text.title;

  return (
    <div className="update-ready" role="dialog" aria-modal="false" aria-label={label}>
      <div className="update-ready__header">
        <span className="update-ready__icon" aria-hidden="true">
          <MegaphoneIcon />
        </span>
        <h2>{text.title}</h2>
        <button
          type="button"
          className="update-ready__close"
          aria-label={text.close}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <p className="update-ready__message">{text.message}</p>
      <button type="button" className="update-ready__restart" onClick={onRestart}>
        {text.restart}
      </button>
    </div>
  );
}

export function MockUpdateDialog({
  currentVersion,
  onClose
}: MockUpdateDialogProps): React.JSX.Element {
  const [state, setState] = useState<MockUpdateState>("checking");
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = (): void => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState("available");
    }, CHECKING_DELAY_MS);
    timersRef.current.push(timer);
    return clearTimers;
  }, []);

  useEffect(() => {
    if (state !== "installing") {
      return;
    }

    if (progress >= 100) {
      const timer = window.setTimeout(() => {
        setState("completed");
      }, 280);
      timersRef.current.push(timer);
      return;
    }

    const timer = window.setTimeout(() => {
      setProgress((current) => Math.min(100, current + 4));
    }, INSTALL_TICK_MS);
    timersRef.current.push(timer);
  }, [progress, state]);

  const versionLabel = useMemo(
    () => formatVersionLabel(currentVersion ?? "1.2.0"),
    [currentVersion]
  );

  const startInstall = (): void => {
    clearTimers();
    setProgress(0);
    setState("installing");
  };

  const close = (): void => {
    clearTimers();
    onClose();
  };

  return (
    <div className="mock-update" role="dialog" aria-modal="true" aria-label="检查更新">
      <div className="mock-update__window">
        <button
          type="button"
          className="mock-update__close"
          aria-label="关闭"
          onClick={close}
        >
          <CloseIcon />
        </button>

        {state === "checking" ? (
          <CenteredState
            icon={<SpinnerIcon />}
            title="正在检查更新"
            description={`当前版本 ${versionLabel}，正在连接更新服务...`}
          />
        ) : null}

        {state === "latest" ? (
          <CenteredState
            icon={<CheckIcon />}
            title="已是最新版本"
            description={`当前版本 ${versionLabel} 已经是最新版本。`}
            action={<button type="button" className="mock-update__primary" onClick={close}>完成</button>}
          />
        ) : null}

        {state === "available" ? (
          <section className="mock-update__available">
            <div className="mock-update__badge">
              <MegaphoneIcon />
            </div>
            <div className="mock-update__available-copy">
              <p className="mock-update__eyebrow">发现新版本</p>
              <h1>Voice Assistant v{MOCK_VERSION}</h1>
              <p>当前版本 {versionLabel}，已模拟获取到可用安装包。</p>
            </div>
            <div className="mock-update__notes">
              <h2>更新内容</h2>
              <ul>
                {RELEASE_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
            <div className="mock-update__actions">
              <button type="button" className="mock-update__primary" onClick={startInstall}>
                立即更新
              </button>
              <button type="button" className="mock-update__secondary" onClick={close}>
                稍后
              </button>
            </div>
          </section>
        ) : null}

        {state === "installing" ? (
          <CenteredState
            icon={<DownloadIcon />}
            title="正在安装更新"
            description={`正在模拟下载并安装 v${MOCK_VERSION}，请稍候...`}
            action={
              <div className="mock-update__progress-panel">
                <div
                  className="mock-update__progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="mock-update__progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p>{progress}%</p>
              </div>
            }
          />
        ) : null}

        {state === "completed" ? (
          <CenteredState
            icon={<CheckIcon />}
            title="更新准备完成"
            description={`v${MOCK_VERSION} 已准备就绪，模拟流程到这里结束。`}
            action={<button type="button" className="mock-update__primary" onClick={close}>完成</button>}
          />
        ) : null}
      </div>
    </div>
  );
}

function CenteredState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <section className="mock-update__centered">
      <div className="mock-update__large-icon" aria-hidden="true">
        {icon}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
      {action ? <div className="mock-update__centered-action">{action}</div> : null}
    </section>
  );
}

function formatVersionLabel(version: string): string {
  const normalized = version.trim();
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function MegaphoneIcon(): React.JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a2 2 0 0 0 2 2h2l4 4v-5l8 3V7l-8 3V5L7 9H5a2 2 0 0 0-2 2Z" />
      <path d="M19 9.5a4.5 4.5 0 0 1 0 5" />
    </svg>
  );
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function SpinnerIcon(): React.JSX.Element {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="20" stroke="currentColor" strokeOpacity="0.18" strokeWidth="5" />
      <path d="M46 26a20 20 0 0 0-20-20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon(): React.JSX.Element {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 8v25" />
      <path d="m16 24 10 10 10-10" />
      <path d="M12 41h28" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="26" cy="26" r="20" />
      <path d="m17 27 6 6 13-15" />
    </svg>
  );
}
