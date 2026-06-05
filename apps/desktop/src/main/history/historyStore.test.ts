import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createFileHistoryStore } from "./historyStore";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "voice-history-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("file history store", () => {
  it("persists a history record with local wav audio and lists newest first", async () => {
    const rootDir = await createTempRoot();
    const store = createFileHistoryStore({
      rootDir,
      now: () => new Date("2026-05-27T08:00:00.000Z"),
      createId: () => "record-1"
    });

    const record = await store.create({
      startedAt: "2026-05-27T07:59:50.000Z",
      durationMs: 1200,
      mode: "direct",
      status: "completed",
      transcript: "hello",
      finalText: "hello",
      audio: {
        pcm: new Int16Array([0, 1200, -1200, 0]),
        sampleRate: 16000
      }
    });

    expect(record).toMatchObject({
      id: "record-1",
      startedAt: "2026-05-27T07:59:50.000Z",
      createdAt: "2026-05-27T08:00:00.000Z",
      durationMs: 1200,
      mode: "direct",
      status: "completed",
      transcript: "hello",
      finalText: "hello"
    });
    expect(record.audio?.sampleRate).toBe(16000);
    expect(record.audio?.durationMs).toBe(0.25);
    expect(record.audio?.url).toMatch(/^file:\/\//);

    const audioPath = record.audio?.path ?? "";
    await expect(stat(audioPath)).resolves.toMatchObject({ size: 52 });
    const wav = await readFile(audioPath);
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.readUInt32LE(40)).toBe(8);

    await store.create({
      startedAt: "2026-05-27T08:01:00.000Z",
      durationMs: 0,
      mode: "translate",
      status: "no_audio",
      transcript: "",
      finalText: ""
    });

    const records = await store.list();
    expect(records.map((item) => item.id)).toEqual(["record-1-1", "record-1"]);
  });

  it("deletes the index entry and audio file for a record", async () => {
    const rootDir = await createTempRoot();
    const store = createFileHistoryStore({
      rootDir,
      createId: () => "delete-me"
    });
    const record = await store.create({
      startedAt: "2026-05-27T08:00:00.000Z",
      durationMs: 500,
      mode: "processSelection",
      status: "cancelled",
      transcript: "",
      finalText: "",
      audio: {
        pcm: new Int16Array([1, 2]),
        sampleRate: 16000
      }
    });

    await expect(store.delete(record.id)).resolves.toBe(true);
    await expect(stat(record.audio?.path ?? "")).rejects.toThrow();
    await expect(store.list()).resolves.toEqual([]);
    await expect(store.delete(record.id)).resolves.toBe(false);
  });

  it("updates an existing record in place instead of creating a duplicate", async () => {
    const rootDir = await createTempRoot();
    const store = createFileHistoryStore({
      rootDir,
      now: () => new Date("2026-05-27T08:00:00.000Z"),
      createId: () => "retry-me"
    });
    const original = await store.create({
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 500,
      mode: "direct",
      status: "no_audio",
      transcript: "",
      finalText: "",
      audio: {
        pcm: new Int16Array([1, 2]),
        sampleRate: 16000
      }
    });

    const updated = await store.update(original.id, {
      startedAt: "2026-05-27T09:00:00.000Z",
      durationMs: 700,
      mode: "direct",
      status: "completed",
      transcript: "retry transcript",
      finalText: "retry transcript",
      audio: {
        pcm: new Int16Array([3, 4, 5]),
        sampleRate: 16000
      }
    });

    expect(updated).toMatchObject({
      id: original.id,
      createdAt: original.createdAt,
      startedAt: original.startedAt,
      durationMs: 700,
      status: "completed",
      transcript: "retry transcript",
      finalText: "retry transcript"
    });
    await expect(store.list()).resolves.toEqual([updated]);
    expect(updated.audio?.path).toBe(original.audio?.path);
    await expect(stat(original.audio?.path ?? "")).resolves.toMatchObject({ size: 50 });
  });

  it("clears all history records and audio files", async () => {
    const rootDir = await createTempRoot();
    const store = createFileHistoryStore({
      rootDir,
      createId: () => "clear-me"
    });
    const record = await store.create({
      startedAt: "2026-05-27T08:00:00.000Z",
      durationMs: 500,
      mode: "direct",
      status: "completed",
      transcript: "hello",
      finalText: "hello",
      audio: {
        pcm: new Int16Array([1, 2]),
        sampleRate: 16000
      }
    });

    await expect(store.clear()).resolves.toEqual([record.id]);
    await expect(stat(record.audio?.path ?? "")).rejects.toThrow();
    await expect(store.list()).resolves.toEqual([]);
  });

  it("prunes records older than the retention cutoff", async () => {
    const rootDir = await createTempRoot();
    const startedAtValues = [
      "2026-05-27T08:00:00.000Z",
      "2026-05-25T08:00:00.000Z"
    ];
    const store = createFileHistoryStore({
      rootDir,
      createId: () => "retention"
    });
    const fresh = await store.create({
      startedAt: startedAtValues[0],
      durationMs: 500,
      mode: "direct",
      status: "completed",
      transcript: "fresh",
      finalText: "fresh"
    });
    const stale = await store.create({
      startedAt: startedAtValues[1],
      durationMs: 500,
      mode: "translate",
      status: "completed",
      transcript: "stale",
      finalText: "stale"
    });

    await expect(store.pruneBefore("2026-05-26T08:00:00.000Z")).resolves.toEqual([
      stale.id
    ]);
    await expect(store.list()).resolves.toEqual([fresh]);
  });
});
