import { randomUUID } from "node:crypto";
import { and, desc, eq, type SQL } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { PostprocessMode } from "@voice/shared";
import {
  voiceEntries,
  type NewVoiceEntryRow,
  type VoiceEntryRow,
  type VoiceEntryStatus
} from "../schema/voiceEntries";

/**
 * 仓储对外暴露的语音历史记录。可空字段统一用 `null` 表示缺省，
 * 以与 tsconfig `exactOptionalPropertyTypes` 规则相容。
 */
export interface VoiceEntry {
  id: string;
  createdAt: number;
  rawText: string;
  finalText: string;
  mode: PostprocessMode;
  language: string;
  appName: string | null;
  windowTitle: string | null;
  durationMs: number;
  transcriptionMs: number | null;
  postprocessMs: number | null;
  insertMs: number | null;
  status: VoiceEntryStatus;
  errorCode: string | null;
}

/** 新建语音历史的入参，id/createdAt 可由仓储自动生成 */
export interface NewVoiceEntryInput {
  id?: string;
  createdAt?: number;
  rawText: string;
  finalText: string;
  mode: PostprocessMode;
  language: string;
  appName?: string;
  windowTitle?: string;
  durationMs: number;
  transcriptionMs?: number;
  postprocessMs?: number;
  insertMs?: number;
  status: VoiceEntryStatus;
  errorCode?: string;
}

export interface ListVoiceEntriesQuery {
  limit?: number;
  appName?: string;
  status?: VoiceEntryStatus;
}

export interface VoiceEntryRepository {
  insert(input: NewVoiceEntryInput): VoiceEntry;
  list(query?: ListVoiceEntriesQuery): VoiceEntry[];
  deleteById(id: string): boolean;
  clear(): number;
}

const DEFAULT_LIST_LIMIT = 50;

export function createVoiceEntryRepository(
  db: BetterSQLite3Database
): VoiceEntryRepository {
  return {
    insert(input) {
      const row: NewVoiceEntryRow = {
        id: input.id ?? randomUUID(),
        createdAt: input.createdAt ?? Date.now(),
        rawText: input.rawText,
        finalText: input.finalText,
        mode: input.mode,
        language: input.language,
        appName: input.appName ?? null,
        windowTitle: input.windowTitle ?? null,
        durationMs: input.durationMs,
        transcriptionMs: input.transcriptionMs ?? null,
        postprocessMs: input.postprocessMs ?? null,
        insertMs: input.insertMs ?? null,
        status: input.status,
        errorCode: input.errorCode ?? null
      };

      db.insert(voiceEntries).values(row).run();
      return toVoiceEntry(row as VoiceEntryRow);
    },

    list(query) {
      const conditions: SQL[] = [];
      if (query?.appName !== undefined) {
        conditions.push(eq(voiceEntries.appName, query.appName));
      }
      if (query?.status !== undefined) {
        conditions.push(eq(voiceEntries.status, query.status));
      }

      const limit = query?.limit ?? DEFAULT_LIST_LIMIT;

      const baseQuery = db.select().from(voiceEntries);
      const filteredQuery =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const rows = filteredQuery
        .orderBy(desc(voiceEntries.createdAt))
        .limit(limit)
        .all();

      return rows.map(toVoiceEntry);
    },

    deleteById(id) {
      const result = db.delete(voiceEntries).where(eq(voiceEntries.id, id)).run();
      return result.changes > 0;
    },

    clear() {
      const result = db.delete(voiceEntries).run();
      return result.changes;
    }
  };
}

function toVoiceEntry(row: VoiceEntryRow): VoiceEntry {
  return {
    id: row.id,
    createdAt: row.createdAt,
    rawText: row.rawText,
    finalText: row.finalText,
    mode: row.mode,
    language: row.language,
    appName: row.appName,
    windowTitle: row.windowTitle,
    durationMs: row.durationMs,
    transcriptionMs: row.transcriptionMs,
    postprocessMs: row.postprocessMs,
    insertMs: row.insertMs,
    status: row.status,
    errorCode: row.errorCode
  };
}
