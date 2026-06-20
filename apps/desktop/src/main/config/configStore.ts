import {
  isAppSettings,
  MISCONFIGURED_AOSO_ASR_WS_URL,
  mergeSettingsPatch,
  type WaveformStyle,
  type AppSettings,
  type AppSettingsPatch
} from "@voice/shared";

const settingsKey = "settings";
const SUPPORTED_WAVEFORM_STYLES: readonly WaveformStyle[] = [
  "waveform-sunset",
  "waveform-mono",
  "waveform-candy"
] as const;

export interface ConfigStorageAdapter {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

export interface CreateConfigStoreOptions {
  adapter: ConfigStorageAdapter;
  defaults: AppSettings;
  platform?: "darwin" | "win32" | "linux" | "mac" | "windows";
}

export interface ConfigStore {
  get(): AppSettings;
  update(patch: AppSettingsPatch): AppSettings;
  reset(): AppSettings;
}

export function createConfigStore(options: CreateConfigStoreOptions): ConfigStore {
  const persistedSettings = readPersistedSettings(
    options.adapter,
    options.defaults,
    options.platform,
  );
  let currentSettings = persistedSettings.settings;
  if (persistedSettings.migrated) {
    options.adapter.set(settingsKey, currentSettings);
  }

  return {
    get: () => currentSettings,
    update: (patch) => {
      currentSettings = mergeSettingsPatch(currentSettings, patch);
      options.adapter.set(settingsKey, currentSettings);
      return currentSettings;
    },
    reset: () => {
      currentSettings = options.defaults;
      options.adapter.delete(settingsKey);
      return currentSettings;
    }
  };
}

function readPersistedSettings(
  adapter: ConfigStorageAdapter,
  defaults: AppSettings,
  platform?: CreateConfigStoreOptions["platform"],
): { settings: AppSettings; migrated: boolean } {
  const persisted = adapter.get(settingsKey);

  if (!isAppSettings(persisted)) {
    return { settings: defaults, migrated: false };
  }

  let merged = mergeSettingsPatch(defaults, persisted);
  let migrated = false;

  if (merged.ws.servers.length === 0 && defaults.ws.servers.length > 0) {
    merged = {
      ...merged,
      ws: defaults.ws
    };
    migrated = true;
  }

  if (merged.llm.models.length === 0 && defaults.llm.models.length > 0) {
    merged = {
      ...merged,
      llm: defaults.llm
    };
    migrated = true;
  }

  if (
    merged.ws.servers.length === 1 &&
    merged.ws.servers[0]?.url === MISCONFIGURED_AOSO_ASR_WS_URL
  ) {
    merged = {
      ...merged,
      ws: defaults.ws
    };
    migrated = true;
  }

  if (!SUPPORTED_WAVEFORM_STYLES.includes(merged.recording.waveformStyle)) {
    merged = {
      ...merged,
      recording: {
        ...merged.recording,
        waveformStyle: defaults.recording.waveformStyle
      }
    };
    migrated = true;
  }

  const normalizedShortcuts = normalizeLegacyShortcuts(merged.shortcuts, platform);
  if (normalizedShortcuts !== merged.shortcuts) {
    merged = {
      ...merged,
      shortcuts: normalizedShortcuts
    };
    migrated = true;
  }

  if (
    (platform === "darwin" || platform === "mac") &&
    (merged.shortcuts.processSelection === "RightAlt+Space" ||
      merged.shortcuts.processSelection === "MetaRight+Space") &&
    defaults.shortcuts.processSelection === "MetaRight+/"
  ) {
    merged = {
      ...merged,
      shortcuts: {
        ...merged.shortcuts,
        processSelection: defaults.shortcuts.processSelection,
      },
    };
    migrated = true;
  }

  return { settings: merged, migrated };
}

function normalizeLegacyShortcuts(
  shortcuts: AppSettings["shortcuts"],
  platform?: CreateConfigStoreOptions["platform"],
): AppSettings["shortcuts"] {
  const normalized = {
    ...shortcuts,
    toggleRecording: normalizeLegacyShortcut(shortcuts.toggleRecording, platform),
    processSelection: normalizeLegacyShortcut(shortcuts.processSelection, platform),
    translateDictation: normalizeLegacyShortcut(shortcuts.translateDictation, platform),
    holdToTalk: normalizeLegacyShortcut(shortcuts.holdToTalk, platform)
  };
  if (
    normalized.toggleRecording === shortcuts.toggleRecording &&
    normalized.processSelection === shortcuts.processSelection &&
    normalized.translateDictation === shortcuts.translateDictation &&
    normalized.holdToTalk === shortcuts.holdToTalk
  ) {
    return shortcuts;
  }
  return normalized;
}

function normalizeLegacyShortcut(
  shortcut: string,
  platform?: CreateConfigStoreOptions["platform"],
): string {
  const storageRightModifier =
    platform === "darwin" || platform === "mac" ? "MetaRight" : "RightAlt";
  return shortcut
    .split("+")
    .filter(Boolean)
    .map((part) => {
      switch (part) {
        case "MetaRight":
        case "RightAlt":
          return storageRightModifier;
        case "Slash":
          return "/";
        case "ShiftRight":
          return "RightShift";
        default:
          return part;
      }
    })
    .join("+");
}
