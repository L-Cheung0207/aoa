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
}

export interface ConfigStore {
  get(): AppSettings;
  update(patch: AppSettingsPatch): AppSettings;
  reset(): AppSettings;
}

export function createConfigStore(options: CreateConfigStoreOptions): ConfigStore {
  let currentSettings = readPersistedSettings(options.adapter, options.defaults);

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
  defaults: AppSettings
): AppSettings {
  const persisted = adapter.get(settingsKey);

  if (!isAppSettings(persisted)) {
    return defaults;
  }

  let merged = mergeSettingsPatch(defaults, persisted);

  if (merged.ws.servers.length === 0 && defaults.ws.servers.length > 0) {
    merged = {
      ...merged,
      ws: defaults.ws
    };
  }

  if (merged.llm.models.length === 0 && defaults.llm.models.length > 0) {
    merged = {
      ...merged,
      llm: defaults.llm
    };
  }

  if (
    merged.ws.servers.length === 1 &&
    merged.ws.servers[0]?.url === MISCONFIGURED_AOSO_ASR_WS_URL
  ) {
    merged = {
      ...merged,
      ws: defaults.ws
    };
  }

  if (!SUPPORTED_WAVEFORM_STYLES.includes(merged.recording.waveformStyle)) {
    merged = {
      ...merged,
      recording: {
        ...merged.recording,
        waveformStyle: defaults.recording.waveformStyle
      }
    };
  }

  return merged;
}
