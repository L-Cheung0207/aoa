import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppSettings,
  HistoryRecord,
  HistoryRecordStatus,
  HistoryRetention,
  InterfaceLanguage
} from "@voice/shared";
import { retryHistoryRecord } from "./historyRetry";
import { getHistoryText, type HistoryText } from "./historyI18n";
import {
  getResultOverlayText,
  ResultOverlayPanel,
  type ResultOverlayContent,
} from "../overlay/ResultOverlayPanel";

type HistoryFilter = "all" | "dictation" | "translate" | "rewrite";

export interface HistoryPageProps {
  initialRecords?: HistoryRecord[];
  initialNow?: Date;
  language?: InterfaceLanguage | undefined;
}

interface HistoryGroup {
  label: string;
  records: HistoryRecord[];
}

export function HistoryPage({
  initialRecords,
  initialNow,
  language
}: HistoryPageProps = {}): React.JSX.Element {
  const text = getHistoryText(language);
  const [records, setRecords] = useState<HistoryRecord[]>(() => initialRecords ?? []);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [error, setError] = useState<string | undefined>(undefined);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [downloadingIds, setDownloadingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [retryingRecordId, setRetryingRecordId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<HistoryRecord | undefined>(undefined);
  const [answerRecord, setAnswerRecord] = useState<HistoryRecord | undefined>(undefined);
  const [historyRetention, setHistoryRetention] = useState<HistoryRetention>("forever");
  const [pendingRetention, setPendingRetention] = useState<HistoryRetention | undefined>(undefined);
  const [applyingRetention, setApplyingRetention] = useState(false);
  const retryInFlightRef = useRef(false);
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
    () => groupHistoryRecordsByDay(visibleRecords, now, language),
    [language, now, visibleRecords]
  );
  const selectedRetention = pendingRetention ?? historyRetention;
  const isRetrying = retryingRecordId !== undefined;

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(undefined), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

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
        throw new Error(text.missingAudioFile);
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
    if (!record.audio || retryInFlightRef.current || isRetrying) {
      return;
    }
    retryInFlightRef.current = true;
    setRetryingRecordId(record.id);
    setToastMessage(undefined);
    setError(undefined);
    try {
      const retryRecord = await retryHistoryRecord(record);
      setRecords((current) => upsertHistoryRecord(current, retryRecord));
    } catch (retryError) {
      console.warn("[history] retry failed", retryError);
      setToastMessage(text.retryFailed);
    } finally {
      retryInFlightRef.current = false;
      setRetryingRecordId(undefined);
    }
  };

  return (
    <main className="history-page">
      <header className="history-header">
        <div>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
      </header>

      <section className="history-privacy" aria-label={text.storeHistory}>
        <div className="history-privacy__row">
          <div>
            <strong>{text.storeHistory}</strong>
            <p>{text.storeHistoryQuestion}</p>
          </div>
          <select
            aria-label={text.storeHistoryDuration}
            disabled={applyingRetention}
            value={selectedRetention}
            onChange={(event) => {
              const retention = event.target.value as HistoryRetention;
              if (retention !== historyRetention) {
                setPendingRetention(retention);
              }
            }}
          >
            {text.retentionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="history-privacy__row">
          <div>
            <strong>{text.privacyTitle}</strong>
            <p>{text.privacyDescription}</p>
          </div>
        </div>
      </section>

      <div className="history-tabs" role="tablist" aria-label={text.filtersLabel}>
        <HistoryFilterButton filter="all" activeFilter={filter} onChange={setFilter}>
          {text.filters.all}
        </HistoryFilterButton>
        <HistoryFilterButton filter="dictation" activeFilter={filter} onChange={setFilter}>
          {text.filters.dictation}
        </HistoryFilterButton>
        <HistoryFilterButton filter="translate" activeFilter={filter} onChange={setFilter}>
          {text.filters.translate}
        </HistoryFilterButton>
        <HistoryFilterButton filter="rewrite" activeFilter={filter} onChange={setFilter}>
          {text.filters.rewrite}
        </HistoryFilterButton>
      </div>

      {error ? <p className="history-error">{error}</p> : null}
      {groups.length === 0 ? (
        <section className="history-empty">
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyDescription}</p>
        </section>
      ) : (
        <section className="history-list" aria-label={text.listLabel}>
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
                    retrying={retryingRecordId === record.id}
                    retryDisabled={isRetrying && retryingRecordId !== record.id}
                    text={text}
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
          text={text}
          onCancel={() => setPendingDeleteRecord(undefined)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {pendingRetention ? (
        <HistoryRetentionConfirmDialog
          applying={applyingRetention}
          retention={pendingRetention}
          text={text}
          onCancel={() => setPendingRetention(undefined)}
          onConfirm={handleConfirmRetention}
        />
      ) : null}
      {answerRecord ? (
        <HistoryAnswerDialog
          language={language}
          record={answerRecord}
          text={text}
          onClose={() => setAnswerRecord(undefined)}
        />
      ) : null}
      {toastMessage ? (
        <div className="history-toast history-toast--error" role="status">
          {toastMessage}
        </div>
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
  retryDisabled,
  retrying,
  record,
  text
}: {
  deleting: boolean;
  downloading: boolean;
  onDownload(record: HistoryRecord): Promise<void>;
  onRequestDelete(record: HistoryRecord): void;
  onRetry(record: HistoryRecord): Promise<void>;
  onViewAnswer(record: HistoryRecord): void;
  retryDisabled: boolean;
  retrying: boolean;
  record: HistoryRecord;
  text: HistoryText;
}): React.JSX.Element {
  const displayText = getHistoryRecordListText(record, text);
  const answerText = getHistoryRecordAnswerText(record);
  const canViewAnswer = record.mode === "processSelection" && answerText.length > 0;
  const canRetry = record.audio !== undefined;
  const retryLabel = retrying || retryDisabled ? text.retrying : canRetry ? text.retry : text.retryNoAudio;

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
            {text.viewAnswer}
          </button>
        ) : null}
        {record.status !== "completed" ? (
          <button
            className="history-row__icon-button"
            type="button"
            aria-label={retryLabel}
            title={retryLabel}
            aria-busy={retrying}
            disabled={!canRetry || retrying || retryDisabled}
            onClick={() => {
              void onRetry(record);
            }}
          >
            {retrying ? <span className="history-row__spinner" aria-hidden="true" /> : <RetryIcon />}
          </button>
        ) : null}
        {record.audio ? (
          <button
            className="history-row__icon-button"
            type="button"
            aria-label={downloading ? text.downloading : text.downloadAudio}
            title={downloading ? text.downloading : text.downloadAudio}
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
          aria-label={deleting ? text.deleting : text.delete}
          title={deleting ? text.deleting : text.delete}
          disabled={deleting}
          onClick={() => onRequestDelete(record)}
        >
          {deleting ? <span>{text.deleting}</span> : <TrashIcon />}
        </button>
      </div>
    </article>
  );
}

function HistoryAnswerDialog({
  language,
  record,
  text,
  onClose
}: {
  language: InterfaceLanguage | undefined;
  record: HistoryRecord;
  text: HistoryText;
  onClose(): void;
}): React.JSX.Element {
  const result = toHistoryResultOverlayContent(record, text);

  return (
    <div className="history-answer-modal" role="presentation">
      <ResultOverlayPanel
        result={result}
        text={getResultOverlayText(language)}
        onDismiss={onClose}
      />
    </div>
  );
}

function toHistoryResultOverlayContent(
  record: HistoryRecord,
  text: HistoryText,
): ResultOverlayContent {
  const transcript = record.transcript.trim();
  const selectedText = record.selectedText?.trim() ?? "";

  return {
    rawText: transcript || selectedText || text.statusLabels[record.status],
    selectedText: transcript ? selectedText : "",
    finalText: getHistoryRecordAnswerText(record) || text.statusLabels[record.status],
    warnings: [],
  };
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

function getHistoryRecordListText(record: HistoryRecord, text: HistoryText): string {
  if (record.mode === "processSelection") {
    return (
      record.transcript.trim() ||
      record.selectedText?.trim() ||
      text.statusLabels[record.status]
    );
  }

  return record.finalText.trim() || record.transcript.trim() || text.statusLabels[record.status];
}

function getHistoryRecordAnswerText(record: HistoryRecord): string {
  return record.finalText.trim();
}

function DeleteHistoryConfirmDialog({
  deleting,
  record,
  text,
  onCancel,
  onConfirm
}: {
  deleting: boolean;
  record: HistoryRecord;
  text: HistoryText;
  onCancel(): void;
  onConfirm(): Promise<void>;
}): React.JSX.Element {
  const preview = record.finalText || record.transcript || text.statusLabels[record.status];

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
          aria-label={text.close}
          disabled={deleting}
          onClick={onCancel}
        >
          ×
        </button>
        <h2 id="history-delete-title">{text.deleteTitle}</h2>
        <p id="history-delete-description">{text.deleteDescription}</p>
        <p className="history-delete-dialog__preview">{preview}</p>
        <div className="history-delete-dialog__actions">
          <button
            className="history-delete-dialog__cancel"
            type="button"
            disabled={deleting}
            onClick={onCancel}
          >
            {text.cancel}
          </button>
          <button
            className="history-delete-dialog__confirm"
            type="button"
            disabled={deleting}
            onClick={() => {
              void onConfirm();
            }}
          >
            {deleting ? text.deleting : text.delete}
          </button>
        </div>
      </section>
    </div>
  );
}

function HistoryRetentionConfirmDialog({
  applying,
  retention,
  text,
  onCancel,
  onConfirm
}: {
  applying: boolean;
  retention: HistoryRetention;
  text: HistoryText;
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
          aria-label={text.close}
          disabled={applying}
          onClick={onCancel}
        >
          ×
        </button>
        <h2 id="history-retention-title">{text.deleteOldTitle}</h2>
        <p id="history-retention-description">
          {getHistoryRetentionConfirmDescription(retention, text)}
        </p>
        <div className="history-delete-dialog__actions">
          <button
            className="history-delete-dialog__cancel"
            type="button"
            disabled={applying}
            onClick={onCancel}
          >
            {text.cancel}
          </button>
          <button
            className={isDeleting ? "history-delete-dialog__confirm" : "history-delete-dialog__primary"}
            type="button"
            disabled={applying}
            onClick={() => {
              void onConfirm();
            }}
          >
            {applying ? text.applying : isDeleting ? text.delete : text.confirm}
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
  retention: HistoryRetention,
  text: HistoryText
): string {
  return text.retentionDescriptions[retention];
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
  now: Date = new Date(),
  language?: InterfaceLanguage
): HistoryGroup[] {
  const text = getHistoryText(language);
  const today = toDateKey(now);
  const yesterday = toDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const groups = new Map<string, HistoryRecord[]>();

  for (const record of records) {
    const key = toDateKey(new Date(record.startedAt));
    const label = key === today ? text.today : key === yesterday ? text.yesterday : key;
    const group = groups.get(label) ?? [];
    group.push(record);
    groups.set(label, group);
  }

  return Array.from(groups.entries()).map(([label, groupRecords]) => ({
    label,
    records: groupRecords
  }));
}

export function resolveHistoryStatusLabel(
  status: HistoryRecordStatus,
  language?: InterfaceLanguage
): string {
  return getHistoryText(language).statusLabels[status];
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
