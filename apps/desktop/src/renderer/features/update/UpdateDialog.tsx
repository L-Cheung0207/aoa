import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { InterfaceLanguage } from "@voice/shared";
import type {
  UpdateCheckResult,
  UpdateDownloadProgressPayload,
  UpdateReadyPayload
} from "../../../preload/voiceApi";
import { ThemedIcon } from "../../shared/ui/ThemedIcon";

interface UpdateReadyDialogProps {
  language?: InterfaceLanguage | undefined;
  version?: string | undefined;
  onClose(): void;
  onRestart(): void;
}

type DialogState = "checking" | "available" | "latest" | "ready" | "error";
type DownloadProgressState = UpdateDownloadProgressPayload | undefined;

interface UpdateDialogProps {
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
const MIN_CHECKING_DURATION_MS = 1000;
const CHECKING_PROGRESS_INTERVAL_MS = 180;
const CHECKING_PROGRESS_MAX = 92;

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

export function UpdateDialog({
  currentVersion,
  language,
  readyPayload,
  onClose,
  onRestartError
}: UpdateDialogProps): React.JSX.Element {
  const [state, setState] = useState<DialogState>(() =>
    readyPayload ? "ready" : "checking"
  );
  const [payload, setPayload] = useState<UpdateReadyPayload | undefined>(readyPayload);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [checkingProgress, setCheckingProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState>(undefined);

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
      setDownloadProgress(undefined);
      return;
    }
    if (result.status === "available") {
      const nextPayload = toPayload(result);
      if (nextPayload.updateType === "OPTIONAL" && isSkippedOptionalUpdate(nextPayload)) {
        setState("latest");
        setPayload(undefined);
        setDownloadProgress(undefined);
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
      setDownloadProgress(undefined);
      return;
    }
    if (result.status === "disabled") {
      setErrorMessage("当前环境未启用更新检查");
      setState("error");
      return;
    }
    setErrorMessage(result.message);
    setDownloadProgress(undefined);
    setState("error");
  }, []);

  const checkForUpdates = useCallback((): void => {
    const startedAt = Date.now();
    setState("checking");
    setErrorMessage(undefined);
    setDownloadProgress(undefined);
    setCheckingProgress(8);
    void window.voiceAI
      .checkForUpdates()
      .then(async (result) => {
        await waitForMinimumCheckingDuration(startedAt);
        applyResult(result);
      })
      .catch(async (error: unknown) => {
        await waitForMinimumCheckingDuration(startedAt);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setDownloadProgress(undefined);
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
    setDownloadProgress(undefined);
  }, [readyPayload]);

  useEffect(() => {
    if (state !== "checking" || isRealDownloadProgress(downloadProgress)) {
      return;
    }
    const interval = window.setInterval(() => {
      setCheckingProgress((current) =>
        Math.min(CHECKING_PROGRESS_MAX, current + Math.max(1, Math.round((100 - current) * 0.08)))
      );
    }, CHECKING_PROGRESS_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [downloadProgress, state]);

  useEffect(() => {
    return window.voiceAI.onUpdateDownloadProgress((progress) => {
      if (progress.phase === "checking") {
        setDownloadProgress(undefined);
        setCheckingProgress(progress.percent ?? 8);
        return;
      }
      setState("checking");
      setErrorMessage(undefined);
      setDownloadProgress(progress);
      if (typeof progress.percent === "number") {
        setCheckingProgress(progress.percent);
      }
    });
  }, []);

  const close = (): void => {
    if (canClose) {
      onClose();
    }
  };

  const restart = (): void => {
    void window.voiceAI
      .restartToUpdate()
      .then(() => {
        onClose();
      })
      .catch((error: unknown) => {
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
    close();
  };

  return (
    <div className="update-dialog" role="dialog" aria-modal="true" aria-label="检查更新">
      <div className="update-dialog__window">
        {canClose ? (
          <button
            type="button"
            className="update-dialog__close"
            aria-label="关闭"
            onClick={close}
          >
            <CloseIcon />
          </button>
        ) : null}

        {state === "checking" ? (
          <CheckingState
            versionLabel={versionLabel}
            progress={checkingProgress}
            downloadProgress={downloadProgress}
          />
        ) : null}

        {state === "latest" ? (
          <CenteredState
            icon={<CheckIcon />}
            title="已是最新版本"
            description={`当前版本 ${versionLabel} 已经是最新版本。`}
            action={<button type="button" className="update-dialog__primary" onClick={onClose}>完成</button>}
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
            onSecondary={payload?.updateType === "OPTIONAL" ? skipOptional : close}
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
            onSecondary={close}
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
              <div className="update-dialog__actions update-dialog__actions--center">
                <button type="button" className="update-dialog__primary" onClick={checkForUpdates}>
                  重试
                </button>
                <button type="button" className="update-dialog__secondary" onClick={close}>
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

function ProgressPanel({
  progress,
  label
}: {
  progress: number;
  label: string;
}): React.JSX.Element {
  return (
    <div className="update-dialog__progress-panel">
      <div className="update-dialog__progress-head">
        <span>进度</span>
        <strong>{label}</strong>
      </div>
      <div
        className="update-dialog__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className="update-dialog__progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function CheckingState({
  versionLabel,
  progress,
  downloadProgress
}: {
  versionLabel: string;
  progress: number;
  downloadProgress?: DownloadProgressState;
}): React.JSX.Element {
  const shownProgress = normalizeProgress(
    typeof downloadProgress?.percent === "number" ? downloadProgress.percent : progress
  );
  const isDownloading = downloadProgress?.phase === "downloading";
  const isVerifying = downloadProgress?.phase === "verifying";
  const title = isVerifying
    ? "正在校验安装包"
    : isDownloading
      ? "正在下载安装包"
      : "正在检查更新";
  const description = isVerifying
    ? "安装包已下载完成，正在进行完整性校验。"
    : isDownloading
      ? undefined
      : `当前版本 ${versionLabel}，正在连接更新服务。`;

  return (
    <section className="update-dialog__checking">
      <p className="update-dialog__eyebrow">检查更新</p>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <ProgressPanel progress={shownProgress} label={`${shownProgress}%`} />
    </section>
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
    <section className="update-dialog__available">
      <div className="update-dialog__badge">
        <MegaphoneIcon />
      </div>
      <div className="update-dialog__available-copy">
        <p className="update-dialog__eyebrow">
          {ready ? "更新已准备就绪" : updateTypeLabel(payload?.updateType)}
        </p>
        <h1>Voice Assistant {formatVersionLabel(payload?.version ?? "")}</h1>
        <p>当前版本 {currentVersion}，{ready ? "重启后将安装更新。" : "已发现可用安装包。"}</p>
      </div>
      <dl className="update-dialog__meta">
        <div>
          <dt>安装包</dt>
          <dd>{payload?.packageName ?? "-"}</dd>
        </div>
        <div>
          <dt>大小</dt>
          <dd>{formatPackageSize(payload?.packageSize)}</dd>
        </div>
      </dl>
      <div className="update-dialog__notes">
        <h2>更新内容</h2>
        <p>{payload?.updateLog?.trim() || "暂无更新说明。"}</p>
      </div>
      {errorMessage ? <p className="update-dialog__warning">{errorMessage}</p> : null}
      <div className="update-dialog__actions">
        <button
          type="button"
          className="update-dialog__primary"
          disabled={disablePrimary}
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
        {showSecondary ? (
          <button type="button" className="update-dialog__secondary" onClick={onSecondary}>
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
    <section className="update-dialog__centered">
      <div className="update-dialog__large-icon" aria-hidden="true">
        {icon}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
      {action ? <div className="update-dialog__centered-action">{action}</div> : null}
    </section>
  );
}

function toPayload(result: Extract<UpdateCheckResult, { status: "available" | "ready" }>): UpdateReadyPayload {
  const payload: UpdateReadyPayload = {};
  setOptionalPayloadField(payload, "version", result.version);
  setOptionalPayloadField(payload, "phase", result.phase);
  setOptionalPayloadField(payload, "updateType", result.updateType);
  setOptionalPayloadField(payload, "updateLog", result.updateLog);
  setOptionalPayloadField(payload, "downloadUrl", result.downloadUrl);
  setOptionalPayloadField(payload, "packageSize", result.packageSize);
  setOptionalPayloadField(payload, "packageName", result.packageName);
  return payload;
}

function setOptionalPayloadField<Key extends keyof UpdateReadyPayload>(
  payload: UpdateReadyPayload,
  key: Key,
  value: UpdateReadyPayload[Key] | undefined
): void {
  if (value !== undefined) {
    payload[key] = value;
  }
}

function waitForMinimumCheckingDuration(startedAt: number): Promise<void> {
  const remainingMs = MIN_CHECKING_DURATION_MS - (Date.now() - startedAt);
  if (remainingMs <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => window.setTimeout(resolve, remainingMs));
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

function isRealDownloadProgress(progress: DownloadProgressState): boolean {
  return progress?.phase === "downloading" || progress?.phase === "verifying";
}

function normalizeProgress(progress: number): number {
  return Math.min(100, Math.max(0, Math.round(progress)));
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
  return <ThemedIcon name="announcement" mode="image" />;
}

function CloseIcon(): React.JSX.Element {
  return <ThemedIcon name="close" />;
}

function CheckIcon(): React.JSX.Element {
  return <ThemedIcon name="check" />;
}

function WarningIcon(): React.JSX.Element {
  return <ThemedIcon name="warning" mode="image" />;
}
