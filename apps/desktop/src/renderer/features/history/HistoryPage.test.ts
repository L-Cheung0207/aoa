import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HistoryRecord } from "@voice/shared";
import {
  groupHistoryRecordsByDay,
  HistoryPage,
  resolveHistoryStatusLabel
} from "./HistoryPage";

const records: HistoryRecord[] = [
  {
    id: "today-1",
    createdAt: "2026-05-27T08:00:00.000Z",
    startedAt: "2026-05-27T07:59:00.000Z",
    durationMs: 1000,
    mode: "direct",
    status: "completed",
    transcript: "hello",
    finalText: "hello",
    audio: {
      path: "C:/voice/history/audio/today-1.wav",
      url: "file:///C:/voice/history/audio/today-1.wav",
      sampleRate: 16000,
      durationMs: 1000,
      sizeBytes: 32044
    }
  },
  {
    id: "yesterday-1",
    createdAt: "2026-05-26T08:00:00.000Z",
    startedAt: "2026-05-26T07:59:00.000Z",
    durationMs: 0,
    mode: "translate",
    status: "no_audio",
    transcript: "",
    finalText: ""
  }
];

describe("HistoryPage", () => {
  it("groups records into today and yesterday buckets", () => {
    const groups = groupHistoryRecordsByDay(
      records,
      new Date("2026-05-27T12:00:00.000Z")
    );

    expect(groups.map((group) => group.label)).toEqual(["今天", "昨天"]);
    expect(groups[0]?.records.map((record) => record.id)).toEqual(["today-1"]);
    expect(groups[1]?.records.map((record) => record.id)).toEqual(["yesterday-1"]);
  });

  it("renders persisted history records with audio playback affordance", () => {
    const html = renderToStaticMarkup(
      createElement(HistoryPage, {
        initialRecords: records,
        initialNow: new Date("2026-05-27T12:00:00.000Z")
      })
    );

    expect(html).toContain("历史记录");
    expect(html).toContain("保存历史");
    expect(html).toContain("hello");
    expect(html).toContain("音频无声。");
    expect(html).toContain("file:///C:/voice/history/audio/today-1.wav");
  });

  it("maps status labels for cancelled and no-audio rows", () => {
    expect(resolveHistoryStatusLabel("cancelled")).toBe("转录已被取消。");
    expect(resolveHistoryStatusLabel("no_audio")).toBe("音频无声。");
  });
});
