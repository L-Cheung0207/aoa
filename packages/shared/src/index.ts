export type {
  CreateHistoryRecordInput,
  HistoryAudioData,
  HistoryAudioFile,
  HistoryAudioInput,
  HistoryRecord,
  HistoryRecordStatus
} from "./types/history";
export type {
  AppSettings,
  AppSettingsPatch,
  BackendMode,
  HistoryRetention,
  InsertStrategy,
  LlmModelConfig,
  PostprocessMode,
  PostprocessStyle,
  RecordingLanguage,
  RecordingMode,
  WaveformStyle,
  WsServerConfig
} from "./types/settings";
export type { AudioFrame } from "./types/audio";
export {
  AOSO_HTTP_BASE_URL,
  BUNDLED_ASR_WS_URL,
  MISCONFIGURED_AOSO_ASR_WS_URL,
  createDefaultSettings,
  isAppSettings,
  mergeSettingsPatch
} from "./validation/settingsSchema";
export type { ShortcutValidationReason, ShortcutValidationResult } from "./shortcuts/reservedShortcutPolicy";
export {
  isReservedShortcut,
  normalizeShortcut,
  validateShortcut
} from "./shortcuts/reservedShortcutPolicy";
