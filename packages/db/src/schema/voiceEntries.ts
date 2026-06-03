import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { PostprocessMode } from "@voice/shared";

export type VoiceEntryStatus = "success" | "failed";

/**
 * 语音输入历史。对应 DEVELOPMENT_PLAN 4.6 voice_entries 表。
 *
 * 可空字段在数据库中存 NULL；上层返回 `VoiceEntry` 时维持 `string | null`
 * / `number | null`，避免与 tsconfig `exactOptionalPropertyTypes` 冲突。
 */
export const voiceEntries = sqliteTable(
  "voice_entries",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at").notNull(),
    rawText: text("raw_text").notNull(),
    finalText: text("final_text").notNull(),
    mode: text("mode").$type<PostprocessMode>().notNull(),
    language: text("language").notNull(),
    appName: text("app_name"),
    windowTitle: text("window_title"),
    durationMs: integer("duration_ms").notNull(),
    transcriptionMs: integer("transcription_ms"),
    postprocessMs: integer("postprocess_ms"),
    insertMs: integer("insert_ms"),
    status: text("status").$type<VoiceEntryStatus>().notNull(),
    errorCode: text("error_code")
  },
  (table) => ({
    createdAtIdx: index("idx_voice_entries_created_at").on(table.createdAt),
    appNameIdx: index("idx_voice_entries_app_name").on(table.appName),
    statusIdx: index("idx_voice_entries_status").on(table.status)
  })
);

export type VoiceEntryRow = typeof voiceEntries.$inferSelect;
export type NewVoiceEntryRow = typeof voiceEntries.$inferInsert;
