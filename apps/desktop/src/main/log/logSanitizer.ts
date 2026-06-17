import { inspect } from "node:util";

const SENSITIVE_KEY_PATTERN =
  /(?:apiKey|api_key|authorization|password|secret|token|accessCode|AccessCode)$/i;
const TEXT_KEY_PATTERN =
  /^(?:text|rawText|selectedText|expectedSelectedText|finalText|transcript)$/;
const AUDIO_KEY_PATTERN = /^(?:audio|pcm)$/;

export type SanitizedLogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SanitizedLogValue[]
  | { [key: string]: SanitizedLogValue };

export function sanitizeUrlForLog(input: string): string {
  try {
    const parsed = new URL(input);
    redactSearchParams(parsed.searchParams);
    return parsed.toString();
  } catch {
    return input.replace(
      /([?&](?:AccessCode|accessCode|token|apiKey|password|secret)=)[^&\s]+/gi,
      "$1***"
    );
  }
}

export function sanitizeForLog(input: unknown): SanitizedLogValue {
  return sanitizeValue(input);
}

export function formatLogFields(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatLogValue(sanitizeForLog(value))}`)
    .join(" ");
}

function sanitizeValue(input: unknown, key = ""): SanitizedLogValue {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === "string") {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return "***";
    }
    if (TEXT_KEY_PATTERN.test(key)) {
      return undefined;
    }
    if (isLikelyUrl(input)) {
      return sanitizeUrlForLog(input);
    }
    return input;
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return input;
  }
  if (ArrayBuffer.isView(input)) {
    return { length: getArrayBufferViewLength(input) };
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeValue(item));
  }
  if (!isRecord(input)) {
    return String(input);
  }

  const result: Record<string, SanitizedLogValue> = {};
  for (const [entryKey, value] of Object.entries(input)) {
    if (TEXT_KEY_PATTERN.test(entryKey) && typeof value === "string") {
      result[`${entryKey}Length`] = value.length;
      continue;
    }
    if (AUDIO_KEY_PATTERN.test(entryKey)) {
      result[entryKey] = summarizeAudioValue(value);
      continue;
    }
    result[entryKey] = sanitizeValue(value, entryKey);
  }
  return result;
}

function summarizeAudioValue(input: unknown): SanitizedLogValue {
  if (ArrayBuffer.isView(input)) {
    return { pcmLength: input.byteLength };
  }
  if (!isRecord(input)) {
    return sanitizeValue(input);
  }

  const result: Record<string, SanitizedLogValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "pcm" && ArrayBuffer.isView(value)) {
      result.pcmLength = getArrayBufferViewLength(value);
      continue;
    }
    result[key] = sanitizeValue(value, key);
  }
  return result;
}

function formatLogValue(value: SanitizedLogValue): string {
  if (typeof value === "string") {
    return value.includes(" ") ? JSON.stringify(value) : value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }
  if (value === undefined) {
    return "";
  }
  return JSON.stringify(value) ?? inspect(value);
}

function redactSearchParams(params: URLSearchParams): void {
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      params.set(key, "***");
    }
  }
}

function isLikelyUrl(input: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(input);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function getArrayBufferViewLength(input: ArrayBufferView): number {
  return "length" in input && typeof input.length === "number"
    ? input.length
    : input.byteLength;
}
