import type BetterSqlite3 from "better-sqlite3";

/**
 * 建立本地 SQLite 库的表结构和索引。实现是幂等的，多次调用安全。
 *
 * 本批只落地 voice_entries；dictionary_terms / app_preferences / user_settings
 * 留到后续批次，集中维护在此函数内部以避免迁移工具。
 */
export function initializeSchema(raw: BetterSqlite3.Database): void {
  raw.exec(`
    CREATE TABLE IF NOT EXISTS voice_entries (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      final_text TEXT NOT NULL,
      mode TEXT NOT NULL,
      language TEXT NOT NULL,
      app_name TEXT,
      window_title TEXT,
      duration_ms INTEGER NOT NULL,
      transcription_ms INTEGER,
      postprocess_ms INTEGER,
      insert_ms INTEGER,
      status TEXT NOT NULL,
      error_code TEXT
    );
  `);

  raw.exec(
    `CREATE INDEX IF NOT EXISTS idx_voice_entries_created_at ON voice_entries(created_at);`
  );
  raw.exec(
    `CREATE INDEX IF NOT EXISTS idx_voice_entries_app_name ON voice_entries(app_name);`
  );
  raw.exec(
    `CREATE INDEX IF NOT EXISTS idx_voice_entries_status ON voice_entries(status);`
  );
}
