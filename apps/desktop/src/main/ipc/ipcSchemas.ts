import type {
  AppContext,
  DictionaryTermContext,
  PostprocessRequest,
  PostprocessMode,
  PostprocessStyle,
  TranscriptionSessionRequest,
} from "@voice/backend-client";
import type {
  CreateHistoryRecordInput,
  AppSettingsPatch,
  AudioFrame,
  BackendMode,
  HistoryRecordStatus,
  HistoryRetention,
  InsertStrategy,
  LlmModelConfig,
  RecordingLanguage,
  RecordingMode,
  UpdateHistoryRecordInput,
  WaveformStyle,
  WsServerConfig,
} from "@voice/shared";
import { validateShortcut } from "@voice/shared/shortcuts/reservedShortcutPolicy";
import type { TranscriptionStartInput } from "@voice/ai";

export interface InsertTextInput {
  text: string;
}

export interface CopyTextInput {
  text: string;
}

export interface ReplaceSelectedTextInput {
  text: string;
  expectedSelectedText?: string;
}

export interface StartRecordingInput {
  mode: RecordingMode;
  selectedText?: string;
}

export interface DeleteHistoryRecordInput {
  id: string;
}

export type UpdateHistoryRecordIpcInput = UpdateHistoryRecordInput;

export interface ApplyHistoryRetentionInput {
  retention: HistoryRetention;
  now?: string;
}

export interface SendEmailCodeIpcInput {
  email: string;
}

export interface EmailCodeLoginIpcInput {
  email: string;
  code: string;
  acceptedLicense: boolean;
}

export interface LdapLoginIpcInput {
  account: string;
  password: string;
  acceptedLicense: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RECORDING_MODES: readonly RecordingMode[] = [
  "direct",
  "processSelection",
  "translate",
] as const;

const RECORDING_LANGUAGES: readonly RecordingLanguage[] = [
  "auto",
  "cantonese",
  "mandarin",
  "korean",
  "english",
  "portuguese",
  "japanese",
  "thai",
  "hindi",
  "indonesia",
  "zh-CN",
  "en-US",
] as const;

/**
 * backend-client 的 TranscriptionSession / Postprocess 仅接受下面 3 种语言（与 AppSettings 的 12 种录音语言独立）。
 */
type BackendLanguage = "auto" | "zh-CN" | "en-US";
const BACKEND_LANGUAGES: readonly BackendLanguage[] = [
  "auto",
  "zh-CN",
  "en-US",
] as const;

const POSTPROCESS_MODES: readonly PostprocessMode[] = [
  "direct",
  "clean",
  "formal",
  "translate",
  "summarize",
  "list",
] as const;

const POSTPROCESS_STYLES: readonly PostprocessStyle[] = [
  "natural",
  "formal",
  "concise",
  "friendly",
] as const;

const TARGET_LANGUAGES: readonly ("zh-CN" | "en-US")[] = [
  "zh-CN",
  "en-US",
] as const;
const BACKEND_MODES: readonly BackendMode[] = [
  "mock",
  "staging",
  "production",
] as const;
const INSERT_STRATEGIES: readonly InsertStrategy[] = [
  "auto",
  "clipboard",
  "native",
] as const;
const WAVEFORM_STYLES: readonly WaveformStyle[] = [
  "waveform-sunset",
  "waveform-mono",
  "waveform-candy",
] as const;
const APP_THEMES: readonly ("dark" | "light")[] = ["dark", "light"] as const;
const INTERFACE_LANGUAGES: readonly ("zh-CN" | "zh-TW" | "en-US")[] = [
  "zh-CN",
  "zh-TW",
  "en-US",
] as const;
const HISTORY_RETENTIONS: readonly HistoryRetention[] = [
  "never",
  "24h",
  "7d",
  "30d",
  "forever",
] as const;
const HISTORY_RECORD_STATUSES: readonly HistoryRecordStatus[] = [
  "completed",
  "cancelled",
  "no_audio",
  "error",
] as const;
const SETTINGS_PATCH_KEYS = [
  "schemaVersion",
  "ui",
  "audio",
  "appBehavior",
  "developer",
  "backend",
  "ws",
  "llm",
  "shortcuts",
  "translation",
  "recording",
  "ai",
  "privacy",
  "insertion",
] as const;
const UI_PATCH_KEYS = ["theme", "language"] as const;
const AUDIO_PATCH_KEYS = [
  "interactionSounds",
  "muteOtherAudioDuringRecording",
] as const;
const APP_BEHAVIOR_PATCH_KEYS = ["launchAtLogin"] as const;
const DEVELOPER_PATCH_KEYS = ["enabled"] as const;
const BACKEND_PATCH_KEYS = ["mode", "baseUrl"] as const;
const WS_PATCH_KEYS = ["servers", "selectedIndex"] as const;
const LLM_PATCH_KEYS = ["models", "selectedIndex"] as const;
const SHORTCUT_PATCH_KEYS = [
  "toggleRecording",
  "processSelection",
  "translateDictation",
  "holdToTalk",
] as const;
const TRANSLATION_PATCH_KEYS = ["sourceLanguage", "targetLanguage"] as const;
const RECORDING_PATCH_KEYS = [
  "language",
  "inputDeviceId",
  "sampleRate",
  "maxDurationSeconds",
  "silenceStopMs",
  "waveformStyle",
] as const;
const AI_PATCH_KEYS = [
  "postprocessEnabled",
  "defaultMode",
  "defaultStyle",
] as const;
const PRIVACY_PATCH_KEYS = [
  "saveHistory",
  "historyRetention",
  "restoreClipboard",
  "allowCrashReports",
] as const;
const INSERTION_PATCH_KEYS = ["strategy", "restoreClipboardDelayMs"] as const;

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasOnlyKeys(
  input: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(input).every((key) => allowedKeys.includes(key));
}

function isOptionalString(
  input: Record<string, unknown>,
  key: string,
): boolean {
  return input[key] === undefined || typeof input[key] === "string";
}

function isOptionalBoolean(
  input: Record<string, unknown>,
  key: string,
): boolean {
  return input[key] === undefined || typeof input[key] === "boolean";
}

function isOptionalFiniteNumber(
  input: Record<string, unknown>,
  key: string,
): boolean {
  return (
    input[key] === undefined ||
    (typeof input[key] === "number" && Number.isFinite(input[key]))
  );
}

function isOptionalStringEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  values: readonly T[],
): boolean {
  const value = input[key];
  return (
    value === undefined ||
    (typeof value === "string" && values.includes(value as T))
  );
}

function isWsServerConfig(input: unknown): input is WsServerConfig {
  return (
    isRecord(input) &&
    hasOnlyKeys(input, ["url", "proxy", "proxyUsername", "proxyPassword"]) &&
    typeof input.url === "string" &&
    isOptionalString(input, "proxy") &&
    isOptionalString(input, "proxyUsername") &&
    isOptionalString(input, "proxyPassword")
  );
}

function isLlmModelConfig(input: unknown): input is LlmModelConfig {
  return (
    isRecord(input) &&
    hasOnlyKeys(input, [
      "baseUrl",
      "apiKey",
      "modelName",
      "proxy",
      "proxyUsername",
      "proxyPassword",
    ]) &&
    typeof input.baseUrl === "string" &&
    typeof input.apiKey === "string" &&
    typeof input.modelName === "string" &&
    isOptionalString(input, "proxy") &&
    isOptionalString(input, "proxyUsername") &&
    isOptionalString(input, "proxyPassword")
  );
}

function isAppContext(input: unknown): input is AppContext {
  return (
    isRecord(input) &&
    input.platform === "windows" &&
    typeof input.appName === "string" &&
    typeof input.windowTitle === "string"
  );
}

function isDictionaryTermContext(input: unknown): input is DictionaryTermContext {
  return (
    isRecord(input) &&
    typeof input.id === "string" &&
    typeof input.source === "string" &&
    typeof input.replacement === "string" &&
    isOptionalString(input, "description")
  );
}

function isSettingsPatch(input: Record<string, unknown>): boolean {
  if (!hasOnlyKeys(input, SETTINGS_PATCH_KEYS)) {
    return false;
  }

  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) {
    return false;
  }

  return (
    isUiPatch(input.ui) &&
    isAudioPatch(input.audio) &&
    isAppBehaviorPatch(input.appBehavior) &&
    isDeveloperPatch(input.developer) &&
    isBackendPatch(input.backend) &&
    isWsPatch(input.ws) &&
    isLlmPatch(input.llm) &&
    isShortcutsPatch(input.shortcuts) &&
    isTranslationPatch(input.translation) &&
    isRecordingPatch(input.recording) &&
    isAiPatch(input.ai) &&
    isPrivacyPatch(input.privacy) &&
    isInsertionPatch(input.insertion)
  );
}

function isUiPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, UI_PATCH_KEYS) &&
      isOptionalStringEnum(input, "theme", APP_THEMES) &&
      isOptionalStringEnum(input, "language", INTERFACE_LANGUAGES))
  );
}

function isAudioPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, AUDIO_PATCH_KEYS) &&
      isOptionalBoolean(input, "interactionSounds") &&
      isOptionalBoolean(input, "muteOtherAudioDuringRecording"))
  );
}

function isAppBehaviorPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, APP_BEHAVIOR_PATCH_KEYS) &&
      isOptionalBoolean(input, "launchAtLogin"))
  );
}

function isDeveloperPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, DEVELOPER_PATCH_KEYS) &&
      isOptionalBoolean(input, "enabled"))
  );
}

function isBackendPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, BACKEND_PATCH_KEYS) &&
      isOptionalStringEnum(input, "mode", BACKEND_MODES) &&
      isOptionalString(input, "baseUrl"))
  );
}

function isWsPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, WS_PATCH_KEYS) &&
      (input.servers === undefined ||
        (Array.isArray(input.servers) &&
          input.servers.every(isWsServerConfig))) &&
      isOptionalFiniteNumber(input, "selectedIndex"))
  );
}

function isLlmPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, LLM_PATCH_KEYS) &&
      (input.models === undefined ||
        (Array.isArray(input.models) &&
          input.models.every(isLlmModelConfig))) &&
      isOptionalFiniteNumber(input, "selectedIndex"))
  );
}

function isShortcutsPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, SHORTCUT_PATCH_KEYS) &&
      isOptionalShortcut(input, "toggleRecording") &&
      isOptionalShortcut(input, "processSelection") &&
      isOptionalShortcut(input, "translateDictation") &&
      isOptionalShortcut(input, "holdToTalk"))
  );
}

function isOptionalShortcut(
  input: Record<string, unknown>,
  key: string,
): boolean {
  const value = input[key];
  return (
    value === undefined ||
    (typeof value === "string" && isValidShortcutValue(value))
  );
}

function isValidShortcutValue(value: string): boolean {
  if (value.length === 0) {
    return true;
  }
  return validateShortcut(value, process.platform).ok;
}

function isTranslationPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, TRANSLATION_PATCH_KEYS) &&
      isOptionalStringEnum(input, "sourceLanguage", RECORDING_LANGUAGES) &&
      isOptionalStringEnum(input, "targetLanguage", TARGET_LANGUAGES))
  );
}

function isRecordingPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, RECORDING_PATCH_KEYS) &&
      isOptionalStringEnum(input, "language", RECORDING_LANGUAGES) &&
      isOptionalString(input, "inputDeviceId") &&
      (input.sampleRate === undefined || input.sampleRate === 16000) &&
      isOptionalFiniteNumber(input, "maxDurationSeconds") &&
      isOptionalFiniteNumber(input, "silenceStopMs") &&
      isOptionalStringEnum(input, "waveformStyle", WAVEFORM_STYLES))
  );
}

function isAiPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, AI_PATCH_KEYS) &&
      isOptionalBoolean(input, "postprocessEnabled") &&
      isOptionalStringEnum(input, "defaultMode", POSTPROCESS_MODES) &&
      isOptionalStringEnum(input, "defaultStyle", POSTPROCESS_STYLES))
  );
}

function isPrivacyPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, PRIVACY_PATCH_KEYS) &&
      isOptionalBoolean(input, "saveHistory") &&
      isOptionalStringEnum(input, "historyRetention", HISTORY_RETENTIONS) &&
      isOptionalBoolean(input, "restoreClipboard") &&
      isOptionalBoolean(input, "allowCrashReports"))
  );
}

function isInsertionPatch(input: unknown): boolean {
  return (
    input === undefined ||
    (isRecord(input) &&
      hasOnlyKeys(input, INSERTION_PATCH_KEYS) &&
      isOptionalStringEnum(input, "strategy", INSERT_STRATEGIES) &&
      isOptionalFiniteNumber(input, "restoreClipboardDelayMs"))
  );
}

export function parseInsertTextInput(input: unknown): InsertTextInput {
  if (
    !isRecord(input) ||
    typeof input.text !== "string" ||
    input.text.trim().length === 0
  ) {
    throw new Error("Insert text is required");
  }

  return { text: input.text };
}

export function parseCopyTextInput(input: unknown): CopyTextInput {
  if (!isRecord(input) || typeof input.text !== "string") {
    throw new Error("Copy text is required");
  }

  return { text: input.text };
}

export function parseReplaceSelectedTextInput(
  input: unknown,
): ReplaceSelectedTextInput {
  const { text } = parseInsertTextInput(input);

  if (!isRecord(input)) {
    throw new Error("Replace selected text input must be an object");
  }

  const expectedSelectedText = input.expectedSelectedText;
  if (
    expectedSelectedText !== undefined &&
    typeof expectedSelectedText !== "string"
  ) {
    throw new Error("Expected selected text must be a string when provided");
  }

  const result: ReplaceSelectedTextInput = { text };
  if (expectedSelectedText !== undefined) {
    result.expectedSelectedText = expectedSelectedText;
  }
  return result;
}

export function parseStartRecordingInput(input: unknown): StartRecordingInput {
  if (!isRecord(input)) {
    throw new Error("Start recording input must be an object");
  }

  const mode = input.mode;
  if (
    typeof mode !== "string" ||
    !RECORDING_MODES.includes(mode as RecordingMode)
  ) {
    throw new Error("Start recording input requires a valid mode");
  }

  const selectedText = input.selectedText;
  if (selectedText !== undefined && typeof selectedText !== "string") {
    throw new Error("Selected text must be a string when provided");
  }

  if (
    mode === "processSelection" &&
    (selectedText === undefined || selectedText.length === 0)
  ) {
    // 允许主进程在后续从原生 helper 补充，但必须在 handler 内实际校验
  }

  const result: StartRecordingInput = { mode: mode as RecordingMode };
  if (selectedText !== undefined) {
    result.selectedText = selectedText;
  }
  return result;
}

export function parseSettingsPatchInput(input: unknown): AppSettingsPatch {
  if (!isRecord(input)) {
    throw new Error("Settings patch must be an object");
  }

  if (!isSettingsPatch(input)) {
    throw new Error("Settings patch is invalid");
  }

  return input as AppSettingsPatch;
}

export function parseCreateTranscriptionSessionInput(
  input: unknown,
): TranscriptionSessionRequest {
  if (!isRecord(input)) {
    throw new Error("Transcription session input must be an object");
  }

  if (
    typeof input.installationId !== "string" ||
    input.installationId.length === 0
  ) {
    throw new Error("Transcription session input requires installationId");
  }
  if (input.mode !== "realtime") {
    throw new Error("Transcription session input requires mode=realtime");
  }
  if (
    typeof input.language !== "string" ||
    !BACKEND_LANGUAGES.includes(input.language as BackendLanguage)
  ) {
    throw new Error("Transcription session input requires a valid language");
  }
  if (input.audioFormat !== "pcm16") {
    throw new Error("Transcription session input requires audioFormat=pcm16");
  }
  if (input.sampleRate !== 16000) {
    throw new Error("Transcription session input requires sampleRate=16000");
  }

  return {
    installationId: input.installationId,
    mode: "realtime",
    language: input.language as BackendLanguage,
    audioFormat: "pcm16",
    sampleRate: 16000,
  };
}

export function parsePostprocessInput(input: unknown): PostprocessRequest {
  if (!isRecord(input)) {
    throw new Error("Postprocess input must be an object");
  }
  if (
    typeof input.installationId !== "string" ||
    input.installationId.length === 0
  ) {
    throw new Error("Postprocess input requires installationId");
  }
  if (typeof input.rawText !== "string") {
    throw new Error("Postprocess input requires rawText");
  }
  if (typeof input.selectedText !== "string") {
    throw new Error("Postprocess input requires selectedText");
  }
  if (!isAppContext(input.appContext)) {
    throw new Error("Postprocess input requires appContext");
  }
  if (
    typeof input.mode !== "string" ||
    !POSTPROCESS_MODES.includes(input.mode as PostprocessMode)
  ) {
    throw new Error("Postprocess input requires a valid mode");
  }
  if (
    typeof input.language !== "string" ||
    !BACKEND_LANGUAGES.includes(input.language as BackendLanguage)
  ) {
    throw new Error("Postprocess input requires a valid language");
  }
  if (
    typeof input.style !== "string" ||
    !POSTPROCESS_STYLES.includes(input.style as PostprocessStyle)
  ) {
    throw new Error("Postprocess input requires a valid style");
  }
  if (
    input.targetLanguage !== undefined &&
    (typeof input.targetLanguage !== "string" ||
      !TARGET_LANGUAGES.includes(input.targetLanguage as "zh-CN" | "en-US"))
  ) {
    throw new Error("Postprocess input requires a valid targetLanguage");
  }
  if (
    !Array.isArray(input.dictionaryTerms) ||
    !input.dictionaryTerms.every(isDictionaryTermContext)
  ) {
    throw new Error("Postprocess input requires dictionaryTerms");
  }

  return {
    installationId: input.installationId,
    rawText: input.rawText,
    selectedText: input.selectedText,
    appContext: input.appContext,
    mode: input.mode as PostprocessMode,
    language: input.language as BackendLanguage,
    style: input.style as PostprocessStyle,
    ...(input.targetLanguage === undefined
      ? {}
      : { targetLanguage: input.targetLanguage as "zh-CN" | "en-US" }),
    dictionaryTerms: input.dictionaryTerms
  };
}

export function parseTranscriptionStartInput(
  input: unknown,
): TranscriptionStartInput {
  if (!isRecord(input)) {
    throw new Error("Transcription start input must be an object");
  }
  if (
    typeof input.installationId !== "string" ||
    input.installationId.length === 0
  ) {
    throw new Error("Transcription start input requires installationId");
  }
  if (
    typeof input.language !== "string" ||
    !RECORDING_LANGUAGES.includes(input.language as RecordingLanguage)
  ) {
    throw new Error("Transcription start input requires a valid language");
  }
  if (input.sampleRate !== 16000) {
    throw new Error("Transcription start input requires sampleRate=16000");
  }

  return {
    installationId: input.installationId,
    language: input.language as RecordingLanguage,
    sampleRate: 16000,
  };
}

export function parseAudioFrameInput(input: unknown): AudioFrame {
  if (!isRecord(input)) {
    throw new Error("Audio frame input must be an object");
  }
  if (!(input.pcm instanceof Int16Array)) {
    throw new Error("Audio frame input requires Int16Array pcm");
  }
  if (input.sampleRate !== 16000) {
    throw new Error("Audio frame input requires sampleRate=16000");
  }
  if (
    typeof input.timestampMs !== "number" ||
    !Number.isFinite(input.timestampMs)
  ) {
    throw new Error("Audio frame input requires timestampMs");
  }
  if (typeof input.rms !== "number" || !Number.isFinite(input.rms)) {
    throw new Error("Audio frame input requires rms");
  }

  return {
    pcm: input.pcm,
    sampleRate: 16000,
    timestampMs: input.timestampMs,
    rms: input.rms,
  };
}

export function parseCreateHistoryRecordInput(
  input: unknown,
): CreateHistoryRecordInput {
  if (!isRecord(input)) {
    throw new Error("History record input must be an object");
  }
  if (
    typeof input.startedAt !== "string" ||
    Number.isNaN(Date.parse(input.startedAt))
  ) {
    throw new Error("History record input requires startedAt");
  }
  if (
    typeof input.durationMs !== "number" ||
    !Number.isFinite(input.durationMs) ||
    input.durationMs < 0
  ) {
    throw new Error("History record input requires durationMs");
  }
  if (
    typeof input.mode !== "string" ||
    !RECORDING_MODES.includes(input.mode as RecordingMode)
  ) {
    throw new Error("History record input requires a valid mode");
  }
  if (
    typeof input.status !== "string" ||
    !HISTORY_RECORD_STATUSES.includes(input.status as HistoryRecordStatus)
  ) {
    throw new Error("History record input requires a valid status");
  }
  if (typeof input.transcript !== "string") {
    throw new Error("History record input requires transcript");
  }
  if (typeof input.finalText !== "string") {
    throw new Error("History record input requires finalText");
  }
  if (
    input.selectedText !== undefined &&
    typeof input.selectedText !== "string"
  ) {
    throw new Error(
      "History record selectedText must be a string when provided",
    );
  }
  if (
    input.errorMessage !== undefined &&
    typeof input.errorMessage !== "string"
  ) {
    throw new Error(
      "History record errorMessage must be a string when provided",
    );
  }

  const result: CreateHistoryRecordInput = {
    startedAt: input.startedAt,
    durationMs: input.durationMs,
    mode: input.mode as RecordingMode,
    status: input.status as HistoryRecordStatus,
    transcript: input.transcript,
    finalText: input.finalText,
  };

  if (input.selectedText !== undefined) {
    result.selectedText = input.selectedText;
  }
  if (input.errorMessage !== undefined) {
    result.errorMessage = input.errorMessage;
  }
  if (input.audio !== undefined) {
    if (!isRecord(input.audio)) {
      throw new Error("History record audio must be an object when provided");
    }
    if (!(input.audio.pcm instanceof Int16Array)) {
      throw new Error("History record audio requires Int16Array pcm");
    }
    if (input.audio.sampleRate !== 16000) {
      throw new Error("History record audio requires sampleRate=16000");
    }
    result.audio = {
      pcm: input.audio.pcm,
      sampleRate: 16000,
    };
  }

  return result;
}

export function parseUpdateHistoryRecordInput(
  input: unknown,
): UpdateHistoryRecordInput {
  if (
    !isRecord(input) ||
    typeof input.id !== "string" ||
    input.id.trim().length === 0
  ) {
    throw new Error("Update history record input requires id");
  }

  return {
    id: input.id,
    ...parseCreateHistoryRecordInput(input),
  };
}

export function parseDeleteHistoryRecordInput(
  input: unknown,
): DeleteHistoryRecordInput {
  if (
    !isRecord(input) ||
    typeof input.id !== "string" ||
    input.id.trim().length === 0
  ) {
    throw new Error("Delete history record input requires id");
  }

  return { id: input.id };
}

// Auth IPC accepts renderer payloads and returns only normalized credentials.
export function parseSendEmailCodeInput(input: unknown): SendEmailCodeIpcInput {
  if (!isRecord(input) || typeof input.email !== "string") {
    throw new Error("Auth email is required");
  }

  const email = input.email.trim();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Auth email must be a valid email address");
  }

  return { email };
}

export function parseEmailCodeLoginInput(
  input: unknown,
): EmailCodeLoginIpcInput {
  if (!isRecord(input)) {
    throw new Error("Auth email login input must be an object");
  }

  const { email } = parseSendEmailCodeInput(input);
  if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    throw new Error("Auth code must be 6 digits");
  }
  if (typeof input.acceptedLicense !== "boolean") {
    throw new Error("Auth acceptedLicense must be a boolean");
  }

  return {
    email,
    code: input.code,
    acceptedLicense: input.acceptedLicense,
  };
}

export function parseLdapLoginInput(input: unknown): LdapLoginIpcInput {
  if (!isRecord(input)) {
    throw new Error("Auth LDAP login input must be an object");
  }

  if (typeof input.account !== "string" || input.account.trim().length === 0) {
    throw new Error("Auth LDAP account is required");
  }
  if (typeof input.password !== "string" || input.password.trim().length === 0) {
    throw new Error("Auth LDAP password is required");
  }
  if (typeof input.acceptedLicense !== "boolean") {
    throw new Error("Auth acceptedLicense must be a boolean");
  }

  return {
    account: input.account.trim(),
    password: input.password,
    acceptedLicense: input.acceptedLicense,
  };
}

/** 瑙ｆ瀽鏉ヨ嚜 Settings 椤电殑 銆學S 娴嬭瘯銆嶈姹備綋锛屼粎鏍￠獙蹇呭～瀛楁銆?*/
export function parseApplyHistoryRetentionInput(
  input: unknown,
): ApplyHistoryRetentionInput {
  if (!isRecord(input)) {
    throw new Error("Apply history retention input must be an object");
  }

  if (
    typeof input.retention !== "string" ||
    !HISTORY_RETENTIONS.includes(input.retention as HistoryRetention)
  ) {
    throw new Error("Apply history retention input requires a valid retention");
  }

  const result: ApplyHistoryRetentionInput = {
    retention: input.retention as HistoryRetention,
  };
  if (input.now !== undefined) {
    if (typeof input.now !== "string" || Number.isNaN(Date.parse(input.now))) {
      throw new Error(
        "Apply history retention input requires a valid now timestamp",
      );
    }
    result.now = input.now;
  }
  return result;
}

/** 解析来自 Settings 页的 「WS 测试」请求体，仅校验必填字段。 */
export function parseTestWebSocketInput(input: unknown): WsServerConfig {
  if (!isRecord(input)) {
    throw new Error("WS test input must be an object");
  }
  if (typeof input.url !== "string" || input.url.trim().length === 0) {
    throw new Error("WS test input requires non-empty url");
  }
  const result: WsServerConfig = { url: input.url };
  if (typeof input.proxy === "string" && input.proxy.trim().length > 0) {
    result.proxy = input.proxy;
  }
  if (
    typeof input.proxyUsername === "string" &&
    input.proxyUsername.length > 0
  ) {
    result.proxyUsername = input.proxyUsername;
  }
  if (
    typeof input.proxyPassword === "string" &&
    input.proxyPassword.length > 0
  ) {
    result.proxyPassword = input.proxyPassword;
  }
  return result;
}
