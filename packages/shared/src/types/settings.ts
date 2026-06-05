export type BackendMode = "mock" | "staging" | "production";

/**
 * 录音识别语言。同时包含：
 * - old/main.py 的 10 种语言标识（传给 ASR 语音识别 WebSocket 服务）
 * - new 工程先前使用的 zh-CN / en-US（继续用于 backend-client 的转写 session / LLM 后处理 language 参数）
 */
export type RecordingLanguage =
  | "auto"
  | "cantonese"
  | "mandarin"
  | "korean"
  | "english"
  | "portuguese"
  | "japanese"
  | "thai"
  | "hindi"
  | "indonesia"
  | "zh-CN"
  | "en-US";

export type PostprocessMode =
  | "direct"
  | "clean"
  | "formal"
  | "translate"
  | "summarize"
  | "list";

export type PostprocessStyle = "natural" | "formal" | "concise" | "friendly";

export type InsertStrategy = "auto" | "clipboard" | "native";

export type AppTheme = "dark" | "light";
export type InterfaceLanguage = "zh-CN" | "zh-TW" | "en-US";
export type HistoryRetention = "never" | "24h" | "7d" | "30d" | "forever";

/**
 * 录音会话的循行模式：
 * - direct: 单击 Right ALT，ASR 结果直写到光标处
 * - processSelection: Right ALT + Space，对选中文本用语音指令调用 LLM
 * - translate: Right ALT + Right Shift，语音原文直接调用 LLM 翻译
 */
export type RecordingMode = "direct" | "processSelection" | "translate";

export type WaveformStyle =
  | "waveform-sunset"
  | "waveform-mono"
  | "waveform-candy";

/**
 * WebSocket 语音识别服务器配置（对齐 old/main.py 中的 WS 列表项）。
 * proxy 为空表示直连；如填写则使用 HTTP/HTTPS 代理，可选用户名密码（Basic Auth）。
 */
export interface WsServerConfig {
  url: string;
  proxy?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}

/**
 * 后处理服务配置。当前默认使用 AOSO HTTP API，baseUrl 指向服务根地址。
 * 继续保留 apiKey / modelName 字段，兼容旧配置与设置页下拉展示。
 */
export interface LlmModelConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  proxy?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}

export interface AppSettings {
  schemaVersion: number;
  ui: {
    theme: AppTheme;
    language: InterfaceLanguage;
  };
  audio: {
    interactionSounds: boolean;
    muteOtherAudioDuringRecording: boolean;
  };
  appBehavior: {
    launchAtLogin: boolean;
  };
  developer: {
    enabled: boolean;
  };
  backend: {
    mode: BackendMode;
    baseUrl: string;
  };
  /** 语音识别 WebSocket 服务器，对齐 old 的 WS 多条目 + selectedIndex 。 */
  ws: {
    servers: WsServerConfig[];
    selectedIndex: number;
  };
  /** LLM 后处理配置，对齐 old 的 LLM 多条目 + selectedIndex 。 */
  llm: {
    models: LlmModelConfig[];
    selectedIndex: number;
  };
  shortcuts: {
    /** 单击 Right ALT：开启/结束语音直写 */
    toggleRecording: string;
    /** Right ALT + Space：对选中文本用语音指令调用 LLM 处理 */
    processSelection: string;
    /** Right ALT + Right Shift：语音输入后直接调用 LLM 翻译 */
    translateDictation: string;
    /** 可选：按住说话快捷键，默认未绑定 */
    holdToTalk: string;
  };
  translation: {
    /** 翻译模式中用户的源语言（auto 表示自动检测） */
    sourceLanguage: RecordingLanguage;
    /** 翻译目标语言 */
    targetLanguage: "zh-CN" | "en-US";
  };
  recording: {
    language: RecordingLanguage;
    /** Empty string means browser/system default microphone. */
    inputDeviceId: string;
    sampleRate: 16000;
    maxDurationSeconds: number;
    silenceStopMs: number;
    waveformStyle: WaveformStyle;
  };
  ai: {
    postprocessEnabled: boolean;
    defaultMode: PostprocessMode;
    defaultStyle: PostprocessStyle;
  };
  privacy: {
    saveHistory: boolean;
    historyRetention: HistoryRetention;
    restoreClipboard: boolean;
    allowCrashReports: boolean;
  };
  insertion: {
    strategy: InsertStrategy;
    restoreClipboardDelayMs: number;
  };
}

export type AppSettingsPatch = {
  [Key in keyof AppSettings]?: AppSettings[Key] extends object
    ? Partial<AppSettings[Key]>
    : AppSettings[Key];
};
