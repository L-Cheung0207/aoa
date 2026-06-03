import type { HistoryRecord } from "@voice/shared";

export interface HomeUsageStats {
  durationMinutes: number;
  dictatedCharacters: number;
  rewriteCount: number;
  translationCount: number;
}

export const EMPTY_HOME_USAGE_STATS: HomeUsageStats = {
  durationMinutes: 0,
  dictatedCharacters: 0,
  rewriteCount: 0,
  translationCount: 0
};

export function buildHomeUsageStats(records: HistoryRecord[]): HomeUsageStats {
  return records.reduce<HomeUsageStats>((stats, record) => {
    if (record.status !== "completed") {
      return stats;
    }

    return {
      durationMinutes: stats.durationMinutes + record.durationMs / 60000,
      dictatedCharacters:
        stats.dictatedCharacters + getHistoryRecordText(record).length,
      rewriteCount:
        stats.rewriteCount + (record.mode === "processSelection" ? 1 : 0),
      translationCount:
        stats.translationCount + (record.mode === "translate" ? 1 : 0)
    };
  }, EMPTY_HOME_USAGE_STATS);
}

function getHistoryRecordText(record: HistoryRecord): string {
  return record.finalText.trim() || record.transcript.trim();
}
