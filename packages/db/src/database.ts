import BetterSqlite3 from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { initializeSchema } from "./schema/initializeSchema";

export interface VoiceDatabase {
  /** drizzle query builder 句柄，仓储层实际使用的对象 */
  db: BetterSQLite3Database;
  /** better-sqlite3 原生连接，负责 pragma 和原生 SQL */
  raw: BetterSqlite3.Database;
  close(): void;
}

/**
 * 打开一个本地 SQLite 数据库。
 *
 * - `":memory:"` 专用于测试，不开启 WAL
 * - 其它路径开启 WAL，提升并发读写表现
 * - 自动调用 `initializeSchema` 建表/索引（幂等）
 */
export function createDatabase(filePath: string): VoiceDatabase {
  const raw = new BetterSqlite3(filePath);

  if (filePath !== ":memory:") {
    raw.pragma("journal_mode = WAL");
  }
  raw.pragma("foreign_keys = ON");

  initializeSchema(raw);

  const db = drizzle(raw);

  return {
    db,
    raw,
    close: () => raw.close()
  };
}
