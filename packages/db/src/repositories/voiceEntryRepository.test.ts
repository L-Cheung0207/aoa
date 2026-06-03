import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type VoiceDatabase } from "../database";
import {
  createVoiceEntryRepository,
  type NewVoiceEntryInput,
  type VoiceEntryRepository
} from "./voiceEntryRepository";

function baseEntry(overrides: Partial<NewVoiceEntryInput> = {}): NewVoiceEntryInput {
  return {
    rawText: "raw",
    finalText: "final",
    mode: "clean",
    language: "zh-CN",
    durationMs: 1200,
    status: "success",
    ...overrides
  };
}

describe("voiceEntryRepository", () => {
  let handle: VoiceDatabase;
  let repo: VoiceEntryRepository;

  beforeEach(() => {
    handle = createDatabase(":memory:");
    repo = createVoiceEntryRepository(handle.db);
  });

  afterEach(() => {
    handle.close();
  });

  it("inserts an entry with auto-generated id and createdAt, and returns a consistent row", () => {
    const before = Date.now();
    const entry = repo.insert(baseEntry({ rawText: "hello", finalText: "Hello." }));
    const after = Date.now();

    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(entry.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry.createdAt).toBeLessThanOrEqual(after);
    expect(entry.rawText).toBe("hello");
    expect(entry.finalText).toBe("Hello.");
    expect(entry.appName).toBeNull();
    expect(entry.transcriptionMs).toBeNull();
    expect(entry.errorCode).toBeNull();

    const [stored] = repo.list();
    expect(stored).toEqual(entry);
  });

  it("honours caller-provided id and createdAt", () => {
    const entry = repo.insert(
      baseEntry({ id: "fixed-id", createdAt: 1_700_000_000_000 })
    );

    expect(entry.id).toBe("fixed-id");
    expect(entry.createdAt).toBe(1_700_000_000_000);
  });

  it("list returns rows ordered by createdAt desc with default limit = 50", () => {
    for (let offset = 0; offset < 60; offset += 1) {
      repo.insert(
        baseEntry({
          id: `id-${offset}`,
          createdAt: 1_000 + offset,
          rawText: `raw-${offset}`
        })
      );
    }

    const all = repo.list();
    expect(all).toHaveLength(50);
    expect(all[0]?.id).toBe("id-59");
    expect(all[49]?.id).toBe("id-10");
  });

  it("list honours limit and filters by appName and status", () => {
    repo.insert(baseEntry({ id: "a", createdAt: 10, appName: "chrome.exe", status: "success" }));
    repo.insert(baseEntry({ id: "b", createdAt: 20, appName: "chrome.exe", status: "failed" }));
    repo.insert(baseEntry({ id: "c", createdAt: 30, appName: "code.exe", status: "success" }));
    repo.insert(baseEntry({ id: "d", createdAt: 40, appName: "chrome.exe", status: "success" }));

    const chromeSuccess = repo.list({ appName: "chrome.exe", status: "success" });
    expect(chromeSuccess.map((item) => item.id)).toEqual(["d", "a"]);

    const top2 = repo.list({ limit: 2 });
    expect(top2.map((item) => item.id)).toEqual(["d", "c"]);
  });

  it("deleteById returns true for existing row, false for missing", () => {
    const entry = repo.insert(baseEntry());

    expect(repo.deleteById(entry.id)).toBe(true);
    expect(repo.deleteById(entry.id)).toBe(false);
    expect(repo.list()).toHaveLength(0);
  });

  it("clear returns number of removed rows and empties the table", () => {
    repo.insert(baseEntry({ id: "x" }));
    repo.insert(baseEntry({ id: "y" }));
    repo.insert(baseEntry({ id: "z" }));

    expect(repo.clear()).toBe(3);
    expect(repo.list()).toEqual([]);
    expect(repo.clear()).toBe(0);
  });
});
