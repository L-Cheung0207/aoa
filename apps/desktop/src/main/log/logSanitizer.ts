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

export interface LogSanitizerOptions {
  revealSensitive?: boolean | undefined;
}

let defaultOptions: Required<LogSanitizerOptions> = {
  revealSensitive: false,
};

export function configureLogSanitizer(options: LogSanitizerOptions): void {
  defaultOptions = {
    ...defaultOptions,
    revealSensitive: options.revealSensitive === true,
  };
}

function resolveOptions(options: LogSanitizerOptions): Required<LogSanitizerOptions> {
  return {
    ...defaultOptions,
    ...options,
    revealSensitive:
      options.revealSensitive === undefined
        ? defaultOptions.revealSensitive
        : options.revealSensitive === true,
  };
}

export function sanitizeUrlForLog(
  input: string,
  options: LogSanitizerOptions = {},
): string {
  const resolvedOptions = resolveOptions(options);
  if (resolvedOptions.revealSensitive) {
    return normalizeUrlForLog(input);
  }
  return redactUrlForLog(input);
}

function normalizeUrlForLog(input: string): string {
  try {
    return new URL(input).toString();
  } catch {
    return input;
  }
}

function redactUrlForLog(input: string): string {
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

export function sanitizeForLog(
  input: unknown,
  options: LogSanitizerOptions = {},
): SanitizedLogValue {
  return sanitizeValue(input, "", resolveOptions(options));
}

export function formatLogFields(
  fields: Record<string, unknown>,
  options: LogSanitizerOptions = {},
): string {
  const resolvedOptions = resolveOptions(options);
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) => {
        const sanitized = sanitizeValue(value, key, resolvedOptions);
        return TEXT_KEY_PATTERN.test(key) && !resolvedOptions.revealSensitive
          ? `${key}Length=${formatLogValue(sanitized)}`
          : `${key}=${formatLogValue(sanitized)}`;
      }
    )
    .join(" ");
}

function sanitizeValue(
  input: unknown,
  key = "",
  options: LogSanitizerOptions = {},
): SanitizedLogValue {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === "string") {
    if (!options.revealSensitive && SENSITIVE_KEY_PATTERN.test(key)) {
      return "***";
    }
    if (!options.revealSensitive && TEXT_KEY_PATTERN.test(key)) {
      return input.length;
    }
    if (isLikelyUrl(input)) {
      return sanitizeUrlForLog(input, options);
    }
    return input;
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return input;
  }
  if (ArrayBuffer.isView(input)) {
    return { pcmLength: getArrayBufferViewLength(input) };
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeValue(item, "", options));
  }
  if (!isRecord(input)) {
    return String(input);
  }

  const result: Record<string, SanitizedLogValue> = {};
  for (const [entryKey, value] of Object.entries(input)) {
    if (TEXT_KEY_PATTERN.test(entryKey) && typeof value === "string") {
      if (options.revealSensitive) {
        result[entryKey] = value;
      } else {
        result[`${entryKey}Length`] = value.length;
      }
      continue;
    }
    if (AUDIO_KEY_PATTERN.test(entryKey)) {
      result[entryKey] = summarizeAudioValue(value, options);
      continue;
    }
    result[entryKey] = sanitizeValue(value, entryKey, options);
  }
  return result;
}

function summarizeAudioValue(
  input: unknown,
  options: LogSanitizerOptions = {},
): SanitizedLogValue {
  if (ArrayBuffer.isView(input)) {
    return { pcmLength: getArrayBufferViewLength(input) };
  }
  if (!isRecord(input)) {
    return sanitizeValue(input, "", options);
  }

  const result: Record<string, SanitizedLogValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "pcm" && ArrayBuffer.isView(value)) {
      result.pcmLength = getArrayBufferViewLength(value);
      continue;
    }
    result[key] = sanitizeValue(value, key, options);
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
