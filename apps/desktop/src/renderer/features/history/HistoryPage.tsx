import { useEffect, useMemo, useState } from "react";
import type {
  AppSettings,
  HistoryRecord,
  HistoryRecordStatus,
  HistoryRetention
} from "@voice/shared";
import { retryHistoryRecord } from "./historyRetry";

type HistoryFilter = "all" | "dictation" | "translate" | "rewrite";

const HISTORY_RETENTION_OPTIONS: Array<{
  value: HistoryRetention;
  label: string;
}> = [
  { value: "never", label: "從不" },
  { value: "24h", label: "24小時" },
  { value: "7d", label: "1周" },
  { value: "30d", label: "1個月" },
  { value: "forever", label: "永遠" }
];

export interface HistoryPageProps {
  initialRecords?: HistoryRecord[];
  initialNow?: Date;
}

interface HistoryGroup {
  label: string;
  records: HistoryRecord[];
}

export function HistoryPage({
  initialRecords,
  initialNow
}: HistoryPageProps = {}): React.JSX.Element {
  const [records, setRecords] = useState<HistoryRecord[]>(() => initialRecords ?? []);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [error, setError] = useState<string | undefined>(undefined);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [downloadingIds, setDownloadingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [retryingIds, setRetryingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<HistoryRecord | undefined>(undefined);
  const [answerRecord, setAnswerRecord] = useState<HistoryRecord | undefined>(undefined);
  const [historyRetention, setHistoryRetention] = useState<HistoryRetention>("forever");
  const [pendingRetention, setPendingRetention] = useState<HistoryRetention | undefined>(undefined);
  const [applyingRetention, setApplyingRetention] = useState(false);
  const now = initialNow ?? new Date();

  useEffect(() => {
    if (initialRecords || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    void window.voiceAI
      .listHistoryRecords()
      .then((nextRecords) => {
        if (!cancelled) {
          setRecords(nextRecords);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialRecords]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    void window.voiceAI
      .getSettings()
      .then((settings) => {
        if (!cancelled) {
          setHistoryRetention(resolveSettingsHistoryRetention(settings));
        }
      })
      .catch((settingsError: unknown) => {
        if (!cancelled) {
          setError(settingsError instanceof Error ? settingsError.message : String(settingsError));
        }
      });

    const unsubscribeSettings = window.voiceAI.onSettingsChanged((settings) => {
      setHistoryRetention(resolveSettingsHistoryRetention(settings));
    });
    const unsubscribeCreated = window.voiceAI.onHistoryRecordCreated((record) => {
      setRecords((current) => upsertHistoryRecord(current, record));
    });
    const unsubscribeDeleted = window.voiceAI.onHistoryRecordDeleted(({ id }) => {
      removeHistoryRecordsById([id], setRecords, setAnswerRecord);
    });

    return () => {
      cancelled = true;
      unsubscribeSettings();
      unsubscribeCreated();
      unsubscribeDeleted();
    };
  }, []);

  const visibleRecords = useMemo(
    () => records.filter((record) => matchesFilter(record, filter)),
    [filter, records]
  );
  const groups = useMemo(
    () => groupHistoryRecordsByDay(visibleRecords, now),
    [now, visibleRecords]
  );
  const selectedRetention = pendingRetention ?? historyRetention;
  const handleConfirmDelete = async (): Promise<void> => {
    const id = pendingDeleteRecord?.id;
    if (!id) {
      return;
    }
    setDeletingIds((current) => new Set(current).add(id));
    setError(undefined);
    try {
      const result = await window.voiceAI.deleteHistoryRecord(id);
      if (result.deleted) {
        setRecords((current) => current.filter((record) => record.id !== id));
        setPendingDeleteRecord(undefined);
        setAnswerRecord((current) => (current?.id === id ? undefined : current));
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
  const handleConfirmRetention = async (): Promise<void> => {
    if (!pendingRetention) {
      return;
    }

    setApplyingRetention(true);
    setError(undefined);
    try {
      const result = await window.voiceAI.applyHistoryRetention(pendingRetention);
      setHistoryRetention(resolveSettingsHistoryRetention(result.settings));
      removeHistoryRecordsById(result.deletedIds, setRecords, setAnswerRecord);
      setPendingRetention(undefined);
    } catch (retentionError) {
      setError(retentionError instanceof Error ? retentionError.message : String(retentionError));
    } finally {
      setApplyingRetention(false);
    }
  };
  const handleDownload = async (record: HistoryRecord): Promise<void> => {
    if (!record.audio) {
      return;
    }
    setDownloadingIds((current) => new Set(current).add(record.id));
    setError(undefined);
    try {
      const audio = await window.voiceAI.readHistoryAudio(record.id);
      if (!audio) {
        throw new Error("未找到歷史音訊檔案");
      }
      triggerHistoryAudioDownload(
        audio.data,
        audio.mimeType,
        buildHistoryAudioFileName(record)
      );
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : String(downloadError));
    } finally {
      setDownloadingIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
  };
  const handleRetry = async (record: HistoryRecord): Promise<void> => {
    if (!record.audio || retryingIds.has(record.id)) {
      return;
    }
    setRetryingIds((current) => new Set(current).add(record.id));
    setError(undefined);
    try {
      const retryRecord = await retryHistoryRecord(record);
      setRecords((current) => upsertHistoryRecord(current, retryRecord));
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : String(retryError));
    } finally {
      setRetryingIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
  };

  return (
    <main className="history-page">
      <header className="history-header">
        <div>
          <h1>歷史記錄</h1>
          <p>您的語音口述只儲存在這臺裝置上。</p>
        </div>
        <button className="history-header__menu" type="button" aria-label="更多">
          ...
        </button>
      </header>

      <section className="history-privacy" aria-label="儲存歷史">
        <div className="history-privacy__row">
          <div>
            <strong>儲存歷史</strong>
            <p>您希望在裝置上儲存口述歷史多久？</p>
          </div>
          <select
            aria-label="儲存歷史時長"
            disabled={applyingRetention}
            value={selectedRetention}
            onChange={(event) => {
              const retention = event.target.value as HistoryRetention;
              if (retention !== historyRetention) {
                setPendingRetention(retention);
              }
            }}
          >
            {HISTORY_RETENTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="history-privacy__row">
          <div>
            <strong>您的資料保持私密</strong>
            <p>您的語音口述是私密的，零資料保留。它們僅儲存在您的裝置上，無法從其他地方訪問。</p>
          </div>
        </div>
      </section>

      <div className="history-tabs" role="tablist" aria-label="歷史篩選">
        <HistoryFilterButton filter="all" activeFilter={filter} onChange={setFilter}>
          全部
        </HistoryFilterButton>
        <HistoryFilterButton filter="dictation" activeFilter={filter} onChange={setFilter}>
          口述
        </HistoryFilterButton>
        <HistoryFilterButton filter="translate" activeFilter={filter} onChange={setFilter}>
          翻譯
        </HistoryFilterButton>
        <HistoryFilterButton filter="rewrite" activeFilter={filter} onChange={setFilter}>
          改寫
        </HistoryFilterButton>
      </div>

      {error ? <p className="history-error">{error}</p> : null}
      {groups.length === 0 ? (
        <section className="history-empty">
          <h2>還沒有歷史記錄</h2>
          <p>完成一次語音輸入後，音訊和文本會出現在這裡。</p>
        </section>
      ) : (
        <section className="history-list" aria-label="歷史記錄列表">
          {groups.map((group) => (
            <div className="history-group" key={group.label}>
              <h2>{group.label}</h2>
              <div className="history-group__items">
                {group.records.map((record) => (
                  <HistoryRecordRow
                    key={record.id}
                    record={record}
                    deleting={deletingIds.has(record.id)}
                    downloading={downloadingIds.has(record.id)}
                    retrying={retryingIds.has(record.id)}
                    onDownload={handleDownload}
                    onRequestDelete={setPendingDeleteRecord}
                    onRetry={handleRetry}
                    onViewAnswer={setAnswerRecord}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {pendingDeleteRecord ? (
        <DeleteHistoryConfirmDialog
          deleting={deletingIds.has(pendingDeleteRecord.id)}
          record={pendingDeleteRecord}
          onCancel={() => setPendingDeleteRecord(undefined)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {pendingRetention ? (
        <HistoryRetentionConfirmDialog
          applying={applyingRetention}
          retention={pendingRetention}
          onCancel={() => setPendingRetention(undefined)}
          onConfirm={handleConfirmRetention}
        />
      ) : null}
      {answerRecord ? (
        <HistoryAnswerDialog
          record={answerRecord}
          onClose={() => setAnswerRecord(undefined)}
        />
      ) : null}
    </main>
  );
}

function HistoryFilterButton({
  activeFilter,
  children,
  filter,
  onChange
}: {
  activeFilter: HistoryFilter;
  children: string;
  filter: HistoryFilter;
  onChange(filter: HistoryFilter): void;
}): React.JSX.Element {
  return (
    <button
      className={activeFilter === filter ? "history-tabs__item history-tabs__item--active" : "history-tabs__item"}
      type="button"
      role="tab"
      aria-selected={activeFilter === filter}
      onClick={() => onChange(filter)}
    >
      {children}
    </button>
  );
}

function HistoryRecordRow({
  deleting,
  downloading,
  onDownload,
  onRequestDelete,
  onRetry,
  onViewAnswer,
  retrying,
  record
}: {
  deleting: boolean;
  downloading: boolean;
  onDownload(record: HistoryRecord): Promise<void>;
  onRequestDelete(record: HistoryRecord): void;
  onRetry(record: HistoryRecord): Promise<void>;
  onViewAnswer(record: HistoryRecord): void;
  retrying: boolean;
  record: HistoryRecord;
}): React.JSX.Element {
  const displayText = getHistoryRecordListText(record);
  const answerText = getHistoryRecordAnswerText(record);
  const canViewAnswer = record.mode === "processSelection" && answerText.length > 0;
  const canRetry = record.audio !== undefined;

  return (
    <article className="history-row">
      <time className="history-row__time" dateTime={record.startedAt}>
        {formatRecordTime(record.startedAt)}
      </time>
      <div className="history-row__body">
        <p>{displayText}</p>
      </div>
      <div className="history-row__actions">
        {canViewAnswer ? (
          <button
            className="history-row__answer-button"
            type="button"
            onClick={() => onViewAnswer(record)}
          >
            檢視答案
          </button>
        ) : null}
        {record.status !== "completed" ? (
          <button
            className="history-row__icon-button"
            type="button"
            aria-label={retrying ? "重試中" : canRetry ? "重試" : "沒有音訊，無法重試"}
            title={retrying ? "重試中" : canRetry ? "重試" : "沒有音訊，無法重試"}
            disabled={!canRetry || retrying}
            onClick={() => {
              void onRetry(record);
            }}
          >
            {retrying ? <span>...</span> : <RetryIcon />}
          </button>
        ) : null}
        {record.audio ? (
          <button
            className="history-row__icon-button"
            type="button"
            aria-label={downloading ? "下載中" : "下載音訊"}
            title={downloading ? "下載中" : "下載音訊"}
            disabled={downloading}
            onClick={() => {
              void onDownload(record);
            }}
          >
            {downloading ? <span>...</span> : <DownloadIcon />}
          </button>
        ) : null}
        <button
          className="history-row__icon-button"
          type="button"
          aria-label={deleting ? "刪除中" : "刪除"}
          title={deleting ? "刪除中" : "刪除"}
          disabled={deleting}
          onClick={() => onRequestDelete(record)}
        >
          {deleting ? <span>刪除中</span> : <TrashIcon />}
        </button>
      </div>
    </article>
  );
}

function HistoryAnswerDialog({
  record,
  onClose
}: {
  record: HistoryRecord;
  onClose(): void;
}): React.JSX.Element {
  const prompt = getHistoryRecordListText(record);
  const answer = getHistoryRecordAnswerText(record) || resolveHistoryStatusLabel(record.status);

  return (
    <div className="history-answer-modal" role="presentation">
      <section
        className="history-answer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-answer-title"
        aria-describedby="history-answer-content"
      >
        <button
          className="history-answer-dialog__close"
          type="button"
          aria-label="關閉"
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="history-answer-title">答案</h2>
        <div className="history-answer-dialog__prompt">
          <span>輸入</span>
          <p>{prompt}</p>
        </div>
        <div className="history-answer-dialog__content" id="history-answer-content">
          {answer}
        </div>
        <div className="history-answer-dialog__actions">
          <button type="button" onClick={onClose}>
            關閉
          </button>
        </div>
      </section>
    </div>
  );
}

function DownloadIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function RetryIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function getHistoryRecordListText(record: HistoryRecord): string {
  if (record.mode === "processSelection") {
    return (
      record.transcript.trim() ||
      record.selectedText?.trim() ||
      resolveHistoryStatusLabel(record.status)
    );
  }

  return record.finalText.trim() || record.transcript.trim() || resolveHistoryStatusLabel(record.status);
}

function getHistoryRecordAnswerText(record: HistoryRecord): string {
  return record.finalText.trim();
}

function DeleteHistoryConfirmDialog({
  deleting,
  record,
  onCancel,
  onConfirm
}: {
  deleting: boolean;
  record: HistoryRecord;
  onCancel(): void;
  onConfirm(): Promise<void>;
}): React.JSX.Element {
  const preview = record.finalText || record.transcript || resolveHistoryStatusLabel(record.status);

  return (
    <div className="history-delete-modal" role="presentation">
      <section
        className="history-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-delete-title"
        aria-describedby="history-delete-description"
      >
        <button
          className="history-delete-dialog__close"
          type="button"
          aria-label="關閉"
          disabled={deleting}
          onClick={onCancel}
        >
          ×
        </button>
        <h2 id="history-delete-title">刪除此記錄？</h2>
        <p id="history-delete-description">此轉錄將被永久刪除，無法恢復。</p>
        <p className="history-delete-dialog__preview">{preview}</p>
        <div className="history-delete-dialog__actions">
          <button
            className="history-delete-dialog__cancel"
            type="button"
            disabled={deleting}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="history-delete-dialog__confirm"
            type="button"
            disabled={deleting}
            onClick={() => {
              void onConfirm();
            }}
          >
            {deleting ? "刪除中" : "刪除"}
          </button>
        </div>
      </section>
    </div>
  );
}

function HistoryRetentionConfirmDialog({
  applying,
  retention,
  onCancel,
  onConfirm
}: {
  applying: boolean;
  retention: HistoryRetention;
  onCancel(): void;
  onConfirm(): Promise<void>;
}): React.JSX.Element {
  const isDeleting = retention !== "forever";

  return (
    <div className="history-delete-modal" role="presentation">
      <section
        className="history-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-retention-title"
        aria-describedby="history-retention-description"
      >
        <button
          className="history-delete-dialog__close"
          type="button"
          aria-label="關閉"
          disabled={applying}
          onClick={onCancel}
        >
          ×
        </button>
        <h2 id="history-retention-title">刪除舊歷史記錄？</h2>
        <p id="history-retention-description">
          {getHistoryRetentionConfirmDescription(retention)}
        </p>
        <div className="history-delete-dialog__actions">
          <button
            className="history-delete-dialog__cancel"
            type="button"
            disabled={applying}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={isDeleting ? "history-delete-dialog__confirm" : "history-delete-dialog__primary"}
            type="button"
            disabled={applying}
            onClick={() => {
              void onConfirm();
            }}
          >
            {applying ? "處理中" : isDeleting ? "刪除" : "確認"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TrashIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function getHistoryRetentionConfirmDescription(
  retention: HistoryRetention
): string {
  switch (retention) {
    case "never":
      return "您所有的本地歷史記錄將被永久刪除，且之後不會再儲存新的歷史記錄。";
    case "24h":
      return "早於24小時的本地歷史記錄將被永久刪除，無法恢復。";
    case "7d":
      return "早於1周的本地歷史記錄將被永久刪除，無法恢復。";
    case "30d":
      return "早於1個月的本地歷史記錄將被永久刪除，無法恢復。";
    case "forever":
      return "之後會永久保留新的本地歷史記錄，現有記錄不會被刪除。";
  }
}

function resolveSettingsHistoryRetention(settings: AppSettings): HistoryRetention {
  return settings.privacy.historyRetention ?? (settings.privacy.saveHistory ? "forever" : "never");
}

function upsertHistoryRecord(
  records: HistoryRecord[],
  record: HistoryRecord
): HistoryRecord[] {
  return [record, ...records.filter((item) => item.id !== record.id)].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt)
  );
}

function removeHistoryRecordsById(
  ids: readonly string[],
  setRecords: React.Dispatch<React.SetStateAction<HistoryRecord[]>>,
  setAnswerRecord: React.Dispatch<React.SetStateAction<HistoryRecord | undefined>>
): void {
  if (ids.length === 0) {
    return;
  }
  const deletedIds = new Set(ids);
  setRecords((current) => current.filter((record) => !deletedIds.has(record.id)));
  setAnswerRecord((current) => (current && deletedIds.has(current.id) ? undefined : current));
}

export function groupHistoryRecordsByDay(
  records: HistoryRecord[],
  now: Date = new Date()
): HistoryGroup[] {
  const today = toDateKey(now);
  const yesterday = toDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const groups = new Map<string, HistoryRecord[]>();

  for (const record of records) {
    const key = toDateKey(new Date(record.startedAt));
    const label = key === today ? "今天" : key === yesterday ? "昨天" : key;
    const group = groups.get(label) ?? [];
    group.push(record);
    groups.set(label, group);
  }

  return Array.from(groups.entries()).map(([label, groupRecords]) => ({
    label,
    records: groupRecords
  }));
}

export function resolveHistoryStatusLabel(status: HistoryRecordStatus): string {
  switch (status) {
    case "cancelled":
      return "轉錄已被取消。";
    case "no_audio":
      return "音訊無聲。";
    case "error":
      return "轉錄失敗。";
    case "completed":
      return "已完成。";
  }
}

function matchesFilter(record: HistoryRecord, filter: HistoryFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "rewrite") {
    return record.mode === "processSelection";
  }
  if (filter === "translate") {
    return record.mode === "translate";
  }
  return record.mode === "direct";
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatRecordTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildHistoryAudioFileName(record: HistoryRecord): string {
  const timestamp = record.startedAt
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  return `voice-history-${timestamp}.wav`;
}

function triggerHistoryAudioDownload(
  data: ArrayBuffer,
  mimeType: string,
  fileName: string
): void {
  const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
