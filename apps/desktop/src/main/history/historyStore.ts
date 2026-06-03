import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  CreateHistoryRecordInput,
  HistoryAudioData,
  HistoryAudioFile,
  HistoryRecord,
} from "@voice/shared";

export type { CreateHistoryRecordInput, HistoryRecord } from "@voice/shared";

export interface HistoryStore {
  create(input: CreateHistoryRecordInput): Promise<HistoryRecord>;
  list(): Promise<HistoryRecord[]>;
  readAudio(id: string): Promise<HistoryAudioData | undefined>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<string[]>;
  pruneBefore(cutoffStartedAt: string): Promise<string[]>;
}

export interface FileHistoryStoreOptions {
  rootDir: string;
  audioEncryptionKey?: Buffer;
  now?: () => Date;
  createId?: () => string;
}

interface HistoryIndex {
  records: HistoryRecord[];
}

const INDEX_FILE_NAME = "index.json";
const AUDIO_ENCRYPTION_ALGORITHM = "aes-256-gcm";
const AUDIO_ENCRYPTION_KEY_BYTES = 32;
const AUDIO_ENCRYPTION_IV_BYTES = 12;
const AUDIO_ENCRYPTION_TAG_BYTES = 16;
const ENCRYPTED_AUDIO_MAGIC = Buffer.from("VHAUD001", "ascii");

export function createFileHistoryStore(
  options: FileHistoryStoreOptions,
): HistoryStore {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? createTimestampId;
  const indexPath = join(options.rootDir, INDEX_FILE_NAME);
  const audioEncryptionKey = normalizeAudioEncryptionKey(
    options.audioEncryptionKey,
  );

  const ensureRoot = async (): Promise<void> => {
    await mkdir(options.rootDir, { recursive: true });
  };

  const readIndex = async (): Promise<HistoryIndex> => {
    await ensureRoot();
    try {
      const raw = await readFile(indexPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<HistoryIndex>;
      return {
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return { records: [] };
      }
      throw error;
    }
  };

  const writeIndex = async (index: HistoryIndex): Promise<void> => {
    await ensureRoot();
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  };

  return {
    create: async (input) => {
      const index = await readIndex();
      const id = ensureUniqueId(createId(), index.records);
      const audio = input.audio
        ? await writeAudioFile(
            options.rootDir,
            id,
            input.audio.pcm,
            input.audio.sampleRate,
            audioEncryptionKey,
          )
        : undefined;
      const record: HistoryRecord = {
        id,
        createdAt: now().toISOString(),
        startedAt: input.startedAt,
        durationMs: input.durationMs,
        mode: input.mode,
        status: input.status,
        transcript: input.transcript,
        finalText: input.finalText,
      };
      if (input.selectedText !== undefined) {
        record.selectedText = input.selectedText;
      }
      if (input.errorMessage !== undefined) {
        record.errorMessage = input.errorMessage;
      }
      if (audio !== undefined) {
        record.audio = audio;
      }

      index.records = [record, ...index.records]
        .slice()
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
      await writeIndex(index);
      return record;
    },
    list: async () => {
      const index = await readIndex();
      if (await migrateLegacyAudioFiles(index, audioEncryptionKey)) {
        await writeIndex(index);
      }
      return index.records
        .slice()
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    },
    readAudio: async (id) => {
      const index = await readIndex();
      const record = index.records.find((item) => item.id === id);
      if (!record?.audio) {
        return undefined;
      }
      const storedBuffer = await readFile(record.audio.path);
      const buffer = decryptAudioBuffer(storedBuffer, audioEncryptionKey);
      return {
        data: toArrayBuffer(buffer),
        mimeType: "audio/wav",
        sizeBytes: buffer.byteLength,
      };
    },
    delete: async (id) => {
      const index = await readIndex();
      const existing = index.records.find((record) => record.id === id);
      if (!existing) {
        return false;
      }

      index.records = index.records.filter((record) => record.id !== id);
      if (existing.audio) {
        await rm(existing.audio.path, { force: true });
      }
      await writeIndex(index);
      return true;
    },
    clear: async () => {
      const index = await readIndex();
      const deletedIds = index.records.map((record) => record.id);
      await removeAudioFiles(index.records);
      index.records = [];
      await writeIndex(index);
      return deletedIds;
    },
    pruneBefore: async (cutoffStartedAt) => {
      const index = await readIndex();
      const expired = index.records.filter(
        (record) => record.startedAt < cutoffStartedAt,
      );
      if (expired.length === 0) {
        return [];
      }
      await removeAudioFiles(expired);
      const expiredIds = new Set(expired.map((record) => record.id));
      index.records = index.records.filter((record) => !expiredIds.has(record.id));
      await writeIndex(index);
      return Array.from(expiredIds);
    },
  };
}

async function removeAudioFiles(records: HistoryRecord[]): Promise<void> {
  await Promise.all(
    records.map((record) =>
      record.audio ? rm(record.audio.path, { force: true }) : Promise.resolve(),
    ),
  );
}

async function writeAudioFile(
  rootDir: string,
  id: string,
  pcm: Int16Array,
  sampleRate: 16000,
  audioEncryptionKey: Buffer | undefined,
): Promise<HistoryAudioFile> {
  const audioDir = join(rootDir, "audio");
  await mkdir(audioDir, { recursive: true });
  const audioPath = join(
    audioDir,
    audioEncryptionKey ? `${id}.wav.enc` : `${id}.wav`,
  );
  const wavBuffer = encodePcm16Wav(pcm, sampleRate);
  const storedBuffer = audioEncryptionKey
    ? encryptAudioBuffer(wavBuffer, audioEncryptionKey)
    : wavBuffer;
  await writeFile(audioPath, storedBuffer);

  return {
    path: audioPath,
    url: pathToFileURL(audioPath).toString(),
    sampleRate,
    durationMs: pcm.length > 0 ? (pcm.length / sampleRate) * 1000 : 0,
    sizeBytes: storedBuffer.byteLength,
  };
}

async function migrateLegacyAudioFiles(
  index: HistoryIndex,
  audioEncryptionKey: Buffer | undefined,
): Promise<boolean> {
  if (!audioEncryptionKey) {
    return false;
  }

  let changed = false;
  for (const record of index.records) {
    if (!record.audio) {
      continue;
    }
    if (record.audio.path.endsWith(".enc")) {
      continue;
    }

    const storedBuffer = await readFile(record.audio.path).catch(
      (error: unknown) => {
        if (isMissingFileError(error)) {
          return undefined;
        }
        throw error;
      },
    );
    if (!storedBuffer) {
      continue;
    }
    if (isEncryptedAudioBuffer(storedBuffer)) {
      continue;
    }

    const encryptedBuffer = encryptAudioBuffer(
      storedBuffer,
      audioEncryptionKey,
    );
    const encryptedPath = record.audio.path.endsWith(".enc")
      ? record.audio.path
      : join(dirname(record.audio.path), `${record.id}.wav.enc`);
    await writeFile(encryptedPath, encryptedBuffer);
    if (encryptedPath !== record.audio.path) {
      await rm(record.audio.path, { force: true });
    }
    record.audio = {
      ...record.audio,
      path: encryptedPath,
      url: pathToFileURL(encryptedPath).toString(),
      sizeBytes: encryptedBuffer.byteLength,
    };
    changed = true;
  }

  return changed;
}

function normalizeAudioEncryptionKey(
  key: Buffer | undefined,
): Buffer | undefined {
  if (!key) {
    return undefined;
  }
  if (key.byteLength !== AUDIO_ENCRYPTION_KEY_BYTES) {
    throw new Error("History audio encryption key must be 32 bytes.");
  }
  return Buffer.from(key);
}

function encryptAudioBuffer(
  buffer: Buffer,
  audioEncryptionKey: Buffer,
): Buffer {
  const iv = randomBytes(AUDIO_ENCRYPTION_IV_BYTES);
  const cipher = createCipheriv(
    AUDIO_ENCRYPTION_ALGORITHM,
    audioEncryptionKey,
    iv,
  );
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([ENCRYPTED_AUDIO_MAGIC, iv, authTag, encrypted]);
}

function decryptAudioBuffer(
  buffer: Buffer,
  audioEncryptionKey: Buffer | undefined,
): Buffer {
  if (!isEncryptedAudioBuffer(buffer)) {
    return buffer;
  }
  if (!audioEncryptionKey) {
    throw new Error(
      "History audio is encrypted, but no encryption key is available.",
    );
  }

  const ivStart = ENCRYPTED_AUDIO_MAGIC.byteLength;
  const tagStart = ivStart + AUDIO_ENCRYPTION_IV_BYTES;
  const dataStart = tagStart + AUDIO_ENCRYPTION_TAG_BYTES;
  const iv = buffer.subarray(ivStart, tagStart);
  const authTag = buffer.subarray(tagStart, dataStart);
  const encrypted = buffer.subarray(dataStart);
  const decipher = createDecipheriv(
    AUDIO_ENCRYPTION_ALGORITHM,
    audioEncryptionKey,
    iv,
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function isEncryptedAudioBuffer(buffer: Buffer): boolean {
  return (
    buffer.byteLength >
      ENCRYPTED_AUDIO_MAGIC.byteLength +
        AUDIO_ENCRYPTION_IV_BYTES +
        AUDIO_ENCRYPTION_TAG_BYTES &&
    buffer
      .subarray(0, ENCRYPTED_AUDIO_MAGIC.byteLength)
      .equals(ENCRYPTED_AUDIO_MAGIC)
  );
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const data = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(data).set(buffer);
  return data;
}

export function encodePcm16Wav(pcm: Int16Array, sampleRate: 16000): Buffer {
  const bytesPerSample = 2;
  const channelCount = 1;
  const dataSize = pcm.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < pcm.length; index += 1) {
    buffer.writeInt16LE(pcm[index] ?? 0, 44 + index * bytesPerSample);
  }

  return buffer;
}

function createTimestampId(): string {
  return `history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureUniqueId(preferredId: string, records: HistoryRecord[]): string {
  const ids = new Set(records.map((record) => record.id));
  if (!ids.has(preferredId)) {
    return preferredId;
  }

  let suffix = 1;
  let nextId = `${preferredId}-${suffix}`;
  while (ids.has(nextId)) {
    suffix += 1;
    nextId = `${preferredId}-${suffix}`;
  }
  return nextId;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
