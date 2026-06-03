import type { AppSettings, AppSettingsPatch } from "../types/settings";

export interface DefaultSettingsOptions {
  isPackaged: boolean;
}

const AOSO_SERVER_HOST = "172.30.21.67:9066";
export const AOSO_HTTP_BASE_URL = `http://${AOSO_SERVER_HOST}`;

/** 内置 ASR 语音识别 WebSocket（与 AOSO 后处理 HTTP API 无关）。 */
export const BUNDLED_ASR_WS_URL =
  "wss://aiapi.ctmcloud.com.mo:8443/Others/websocket-uat2/ws";

/** 误将 ASR 指到 AOSO 同机 WS 时的地址，启动时还原为内置 ASR。 */
export const MISCONFIGURED_AOSO_ASR_WS_URL = `ws://${AOSO_SERVER_HOST}/ws/transcribe`;

export function createDefaultSettings(options: DefaultSettingsOptions): AppSettings {
  return {
    schemaVersion: 1,
    ui: {
      theme: "dark",
      language: "zh-CN"
    },
    audio: {
      interactionSounds: true,
      muteOtherAudioDuringRecording: true
    },
    appBehavior: {
      launchAtLogin: true
    },
    backend: {
      mode: options.isPackaged ? "production" : "mock",
      baseUrl: "http://127.0.0.1:8787"
    },
    ws: {
      servers: [
        {
          url: BUNDLED_ASR_WS_URL
        }
      ],
      selectedIndex: 0
    },
    llm: {
      models: [
        {
          baseUrl: AOSO_HTTP_BASE_URL,
          apiKey: "unused",
          modelName: "AOSO API"
        }
      ],
      selectedIndex: 0
    },
    shortcuts: {
      toggleRecording: "RightAlt",
      processSelection: "RightAlt+Space",
      translateDictation: "RightAlt+RightShift",
      holdToTalk: ""
    },
    translation: {
      sourceLanguage: "auto",
      targetLanguage: "en-US"
    },
    recording: {
      language: "cantonese",
      inputDeviceId: "",
      sampleRate: 16000,
      maxDurationSeconds: 60,
      silenceStopMs: 900,
      waveformStyle: "waveform-sunset"
    },
    ai: {
      postprocessEnabled: true,
      defaultMode: "clean",
      defaultStyle: "natural"
    },
    privacy: {
      saveHistory: true,
      historyRetention: "forever",
      restoreClipboard: true,
      allowCrashReports: false
    },
    insertion: {
      strategy: "auto",
      restoreClipboardDelayMs: 250
    }
  };
}

export function mergeSettingsPatch(
  settings: AppSettings,
  patch: AppSettingsPatch
): AppSettings {
  const privacyPatch = patch.privacy;
  const mergedPrivacy = normalizePrivacySettings({
    ...settings.privacy,
    ...privacyPatch
  }, privacyPatch);

  return {
    ...settings,
    ...patch,
    ui: { ...settings.ui, ...patch.ui },
    audio: { ...settings.audio, ...patch.audio },
    appBehavior: { ...settings.appBehavior, ...patch.appBehavior },
    backend: { ...settings.backend, ...patch.backend },
    ws: { ...settings.ws, ...patch.ws },
    llm: { ...settings.llm, ...patch.llm },
    shortcuts: { ...settings.shortcuts, ...patch.shortcuts },
    translation: { ...settings.translation, ...patch.translation },
    recording: { ...settings.recording, ...patch.recording },
    ai: { ...settings.ai, ...patch.ai },
    privacy: mergedPrivacy,
    insertion: { ...settings.insertion, ...patch.insertion }
  };
}

function normalizePrivacySettings(
  privacy: AppSettings["privacy"],
  patch?: Partial<AppSettings["privacy"]>
): AppSettings["privacy"] {
  const historyRetention =
    patch?.historyRetention ??
    (patch?.saveHistory === false
      ? "never"
      : patch?.saveHistory === true
        ? "forever"
        : (privacy.historyRetention ?? (privacy.saveHistory ? "forever" : "never")));
  return {
    ...privacy,
    historyRetention,
    saveHistory: historyRetention !== "never"
  };
}

export function isAppSettings(input: unknown): input is AppSettings {
  if (!isRecord(input)) {
    return false;
  }

  return (
    input.schemaVersion === 1 &&
    // ui 为后续版本新增字段；兼容旧持久化数据（缺失 ui 时由 defaults 补齐）。
    (!("ui" in input) || hasObject(input, "ui")) &&
    (!("audio" in input) || hasObject(input, "audio")) &&
    (!("appBehavior" in input) || hasObject(input, "appBehavior")) &&
    hasObject(input, "backend") &&
    hasObject(input, "ws") &&
    hasObject(input, "llm") &&
    hasObject(input, "shortcuts") &&
    hasObject(input, "translation") &&
    hasObject(input, "recording") &&
    hasObject(input, "ai") &&
    hasObject(input, "privacy") &&
    hasObject(input, "insertion")
  );
}

function hasObject(input: Record<string, unknown>, key: string): boolean {
  return isRecord(input[key]);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
