export type {
  CreateHistoryRecordInput,
  HistoryAudioData,
  HistoryAudioFile,
  HistoryAudioInput,
  HistoryRecord,
  HistoryRecordStatus,
  UpdateHistoryRecordInput,
} from "./types/history";
export type {
  AppSettings,
  AppSettingsPatch,
  BackendMode,
  HistoryRetention,
  InsertStrategy,
  InterfaceLanguage,
  LlmModelConfig,
  PostprocessMode,
  PostprocessStyle,
  RecordingLanguage,
  RecordingMode,
  WaveformStyle,
  WsServerConfig,
} from "./types/settings";
export type { AudioFrame } from "./types/audio";
export {
  AOSO_HTTP_BASE_URL,
  BUNDLED_ASR_WS_URL,
  DEFAULT_INTERFACE_LANGUAGE,
  JAVA_VOICE_WS_URL,
  MISCONFIGURED_AOSO_ASR_WS_URL,
  createDefaultSettings,
  isAppSettings,
  mergeSettingsPatch,
} from "./validation/settingsSchema";
export type {
  ShortcutValidationReason,
  ShortcutValidationResult,
} from "./shortcuts/reservedShortcutPolicy";
export {
  isReservedShortcut,
  normalizeShortcut,
  validateShortcut,
} from "./shortcuts/reservedShortcutPolicy";
export type {
  BackendJsonErrorCode,
  BackendJsonFetch,
  BackendJsonMethod,
  RequestBackendJsonOptions,
} from "./http/backendJson";
export {
  BackendJsonError,
  requestBackendJson,
  unwrapBackendData,
} from "./http/backendJson";
