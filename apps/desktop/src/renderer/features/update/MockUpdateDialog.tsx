import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { InterfaceLanguage } from "@voice/shared";
import type { UpdateCheckResult, UpdateReadyPayload } from "../../../preload/voiceApi";

interface UpdateReadyDialogProps {
  language?: InterfaceLanguage | undefined;
  version?: string | undefined;
  onClose(): void;
  onRestart(): void;
}

type DialogState = "checking" | "available" | "latest" | "ready" | "error";

interface MockUpdateDialogProps {
  currentVersion?: string | undefined;
  language?: InterfaceLanguage | undefined;
  readyPayload?: UpdateReadyPayload | undefined;
  onClose(): void;
  onRestartError?(message: string): void;
}

type UpdateReadyText = {
  title: string;
  close: string;
  message: string;
  restart: string;
  versionPrefix: string;
};

const SKIPPED_OPTIONAL_UPDATE_KEY = "voice.skippedOptionalUpdate";

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
  language,
  readyPayload,
  onClose,
  onRestartError
}: MockUpdateDialogProps): React.JSX.Element {
  const [state, setState] = useState<DialogState>(() =>
    readyPayload ? "ready" : "checking"
  );
  const [payload, setPayload] = useState<UpdateReadyPayload | undefined>(readyPayload);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const versionLabel = useMemo(
    () => formatVersionLabel(currentVersion ?? "0.0.0"),
    [currentVersion]
  );
  const isForced = payload?.updateType === "FORCED";
  const canClose = !isForced || state === "latest" || state === "error";

  const applyResult = useCallback((result: UpdateCheckResult): void => {
    if (result.status === "up-to-date") {
      setState("latest");
      setPayload(undefined);
      return;
    }
    if (result.status === "available") {
      const nextPayload = toPayload(result);
      if (nextPayload.updateType === "OPTIONAL" && isSkippedOptionalUpdate(nextPayload)) {
        setState("latest");
        setPayload(undefined);
        return;
      }
      setPayload(nextPayload);
      setState("available");
      setErrorMessage(result.updaterError);
      return;
    }
    if (result.status === "ready") {
      setPayload(toPayload(result));
      setState("ready");
      return;
    }
    if (result.status === "disabled") {
      setErrorMessage("当前环境未启用更新检查");
      setState("error");
      return;
    }
    setErrorMessage(result.message);
    setState("error");
  }, []);

  const checkForUpdates = useCallback((): void => {
    setState("checking");
    setErrorMessage(undefined);
    void window.voiceAI
      .checkForUpdates()
      .then(applyResult)
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setState("error");
      });
  }, [applyResult]);

  useEffect(() => {
    if (readyPayload) {
      return;
    }
    checkForUpdates();
  }, [checkForUpdates, readyPayload]);

  useEffect(() => {
    if (!readyPayload) {
      return;
    }
    setPayload(readyPayload);
    setState("ready");
    setErrorMessage(undefined);
  }, [readyPayload]);

  const close = (): void => {
    if (canClose) {
      onClose();
    }
  };

  const restart = (): void => {
    void window.voiceAI.restartToUpdate().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      setState("error");
      onRestartError?.(message);
    });
  };

  const skipOptional = (): void => {
    if (payload) {
      rememberSkippedOptionalUpdate(payload);
    }
    onClose();
  };

  return (
    <div className="mock-update" role="dialog" aria-modal="true" aria-label="检查更新">
      <div className="mock-update__window">
        {canClose ? (
          <button
            type="button"
            className="mock-update__close"
            aria-label="关闭"
            onClick={close}
          >
            <CloseIcon />
          </button>
        ) : null}

        {state === "checking" ? (
          <CenteredState
            icon={<SpinnerIcon />}
            title="正在检查更新"
            description={`当前版本 ${versionLabel}，正在连接更新服务。`}
          />
        ) : null}

        {state === "latest" ? (
          <CenteredState
            icon={<CheckIcon />}
            title="已是最新版本"
            description={`当前版本 ${versionLabel} 已经是最新版本。`}
            action={<button type="button" className="mock-update__primary" onClick={onClose}>完成</button>}
          />
        ) : null}

        {state === "available" ? (
          <UpdateDetails
            payload={payload}
            currentVersion={versionLabel}
            errorMessage={errorMessage}
            primaryLabel="正在下载"
            secondaryLabel={payload?.updateType === "OPTIONAL" ? "跳过此版本" : "本次不提醒"}
            onPrimary={() => undefined}
            onSecondary={payload?.updateType === "OPTIONAL" ? skipOptional : onClose}
            showSecondary={payload?.updateType !== "FORCED"}
            disablePrimary
          />
        ) : null}

        {state === "ready" ? (
          <UpdateDetails
            payload={payload}
            currentVersion={versionLabel}
            primaryLabel="重启应用程序"
            secondaryLabel={payload?.updateType === "OPTIONAL" ? "稍后" : "本次不提醒"}
            onPrimary={restart}
            onSecondary={onClose}
            showSecondary={payload?.updateType !== "FORCED"}
            ready
          />
        ) : null}

        {state === "error" ? (
          <CenteredState
            icon={<WarningIcon />}
            title="检查更新失败"
            description={errorMessage ?? "更新服务暂时不可用，请稍后重试。"}
            action={
              <div className="mock-update__actions mock-update__actions--center">
                <button type="button" className="mock-update__primary" onClick={checkForUpdates}>
                  重试
                </button>
                <button type="button" className="mock-update__secondary" onClick={onClose}>
                  关闭
                </button>
              </div>
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function UpdateDetails({
  payload,
  currentVersion,
  errorMessage,
  primaryLabel,
  secondaryLabel,
  showSecondary,
  disablePrimary = false,
  ready = false,
  onPrimary,
  onSecondary
}: {
  payload?: UpdateReadyPayload | undefined;
  currentVersion: string;
  errorMessage?: string | undefined;
  primaryLabel: string;
  secondaryLabel: string;
  showSecondary: boolean;
  disablePrimary?: boolean;
  ready?: boolean;
  onPrimary(): void;
  onSecondary(): void;
}): React.JSX.Element {
  return (
    <section className="mock-update__available">
      <div className="mock-update__badge">
        <MegaphoneIcon />
      </div>
      <div className="mock-update__available-copy">
        <p className="mock-update__eyebrow">
          {ready ? "更新已准备就绪" : updateTypeLabel(payload?.updateType)}
        </p>
        <h1>Voice Assistant {formatVersionLabel(payload?.version ?? "")}</h1>
        <p>当前版本 {currentVersion}，{ready ? "重启后将安装更新。" : "已发现可用安装包。"}</p>
      </div>
      <dl className="mock-update__meta">
        <div>
          <dt>安装包</dt>
          <dd>{payload?.packageName ?? "-"}</dd>
        </div>
        <div>
          <dt>大小</dt>
          <dd>{formatPackageSize(payload?.packageSize)}</dd>
        </div>
      </dl>
      <div className="mock-update__notes">
        <h2>更新内容</h2>
        <p>{payload?.updateLog?.trim() || "暂无更新说明。"}</p>
      </div>
      {errorMessage ? <p className="mock-update__warning">{errorMessage}</p> : null}
      <div className="mock-update__actions">
        <button
          type="button"
          className="mock-update__primary"
          disabled={disablePrimary}
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
        {showSecondary ? (
          <button type="button" className="mock-update__secondary" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </section>
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

function toPayload(result: Extract<UpdateCheckResult, { status: "available" | "ready" }>): UpdateReadyPayload {
  return {
    version: result.version,
    phase: result.phase,
    updateType: result.updateType,
    updateLog: result.updateLog,
    downloadUrl: result.downloadUrl,
    packageSize: result.packageSize,
    packageName: result.packageName
  };
}

function updateTypeLabel(updateType: UpdateReadyPayload["updateType"]): string {
  if (updateType === "FORCED") {
    return "强制更新";
  }
  if (updateType === "RECOMMENDED") {
    return "推荐更新";
  }
  return "发现新版本";
}

function formatPackageSize(size: number | undefined): string {
  if (!size || size <= 0) {
    return "-";
  }
  const mb = size / 1024 / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function formatVersionLabel(version: string): string {
  const normalized = version.trim();
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function rememberSkippedOptionalUpdate(payload: UpdateReadyPayload): void {
  if (!payload.version) {
    return;
  }
  window.localStorage.setItem(
    SKIPPED_OPTIONAL_UPDATE_KEY,
    JSON.stringify({ version: payload.version })
  );
}

function isSkippedOptionalUpdate(payload: UpdateReadyPayload): boolean {
  if (!payload.version) {
    return false;
  }
  try {
    const value = window.localStorage.getItem(SKIPPED_OPTIONAL_UPDATE_KEY);
    if (!value) {
      return false;
    }
    const parsed = JSON.parse(value) as { version?: unknown };
    return parsed.version === payload.version;
  } catch {
    return false;
  }
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

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="26" cy="26" r="20" />
      <path d="m17 27 6 6 13-15" />
    </svg>
  );
}

function WarningIcon(): React.JSX.Element {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="26" cy="26" r="20" />
      <path d="M26 14v16" />
      <path d="M26 38h.01" />
    </svg>
  );
}
