import { describe, expect, it } from "vitest";
import { createDefaultSettings } from "@voice/shared";
import { createConfigStore, type ConfigStorageAdapter } from "./configStore";

function createMemoryAdapter(initial?: unknown): ConfigStorageAdapter {
  let value = initial;
  return {
    get: () => value,
    set: (_key, nextValue) => {
      value = nextValue;
    },
    delete: () => {
      value = undefined;
    }
  };
}

describe("config store", () => {
  it("returns defaults when no settings are persisted", () => {
    const store = createConfigStore({
      adapter: createMemoryAdapter(),
      defaults: createDefaultSettings({ isPackaged: false })
    });

    expect(store.get().backend.mode).toBe("mock");
    expect(store.get().shortcuts.toggleRecording).toBe("RightAlt");
    expect(store.get().shortcuts.processSelection).toBe("RightAlt+Space");
    expect(store.get().shortcuts.translateDictation).toBe("RightAlt+RightShift");
    expect(store.get().translation.targetLanguage).toBe("en-US");
  });

  it("persists nested settings patches", () => {
    const store = createConfigStore({
      adapter: createMemoryAdapter(),
      defaults: createDefaultSettings({ isPackaged: false })
    });

    const updated = store.update({
      shortcuts: { toggleRecording: "Ctrl+Shift+Space" },
      privacy: { saveHistory: false }
    });

    expect(updated.shortcuts.toggleRecording).toBe("Ctrl+Shift+Space");
    expect(updated.shortcuts.processSelection).toBe("RightAlt+Space");
    expect(updated.shortcuts.translateDictation).toBe("RightAlt+RightShift");
    expect(updated.shortcuts.holdToTalk).toBe("");
    expect(updated.privacy.saveHistory).toBe(false);
    expect(store.get()).toEqual(updated);
  });

  it("resets corrupt settings back to defaults", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const store = createConfigStore({
      adapter: createMemoryAdapter({ shortcuts: null }),
      defaults
    });

    expect(store.get()).toEqual(defaults);
  });

  it("fills in the bundled ASR server when persisted ws settings are empty", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const store = createConfigStore({
      adapter: createMemoryAdapter({
        ...defaults,
        ws: {
          servers: [],
          selectedIndex: -1
        }
      }),
      defaults
    });

    expect(store.get().ws).toEqual(defaults.ws);
  });

  it("fills in the bundled AOSO API endpoint when persisted llm settings are empty", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const store = createConfigStore({
      adapter: createMemoryAdapter({
        ...defaults,
        llm: {
          models: [],
          selectedIndex: -1
        }
      }),
      defaults
    });

    expect(store.get().llm).toEqual(defaults.llm);
  });

  it("restores bundled ASR when ws was mistakenly pointed at the AOSO host", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const store = createConfigStore({
      adapter: createMemoryAdapter({
        ...defaults,
        ws: {
          servers: [{ url: "ws://172.30.21.67:9066/ws/transcribe" }],
          selectedIndex: 0
        }
      }),
      defaults
    });

    expect(store.get().ws).toEqual(defaults.ws);
  });

  it("preserves persisted ASR credentials because they are user-managed local settings", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const store = createConfigStore({
      adapter: createMemoryAdapter({
        ...defaults,
        ws: {
          servers: [
            {
              url: `${defaults.ws.servers[0].url}?AccessCode=legacy-secret`,
              proxy: "https://proxy-asr.example.test:443",
              proxyUsername: "legacy-user",
              proxyPassword: "legacy-password"
            }
          ],
          selectedIndex: 0
        }
      }),
      defaults
    });

    expect(store.get().ws).toEqual({
      servers: [
        {
          url: `${defaults.ws.servers[0].url}?AccessCode=legacy-secret`,
          proxy: "https://proxy-asr.example.test:443",
          proxyUsername: "legacy-user",
          proxyPassword: "legacy-password"
        }
      ],
      selectedIndex: 0
    });
  });

  it("keeps user-edited ws and llm connection settings including optional proxy", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const custom = {
      ...defaults,
      ws: {
        servers: [
          {
            url: "ws://custom.example/ws",
            proxy: "http://proxy.example:8080",
            proxyUsername: "user",
            proxyPassword: "pass"
          }
        ],
        selectedIndex: 0
      },
      llm: {
        models: [
          {
            baseUrl: "http://custom.example:9066",
            apiKey: "unused",
            modelName: "Custom API",
            proxy: "http://proxy.example:8080"
          }
        ],
        selectedIndex: 0
      }
    };
    const store = createConfigStore({
      adapter: createMemoryAdapter(custom),
      defaults
    });

    expect(store.get().ws).toEqual(custom.ws);
    expect(store.get().llm).toEqual(custom.llm);
  });

  it("fills missing recording device and waveform style from defaults for older persisted settings", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const {
      inputDeviceId: _inputDeviceId,
      waveformStyle: _waveformStyle,
      ...legacyRecording
    } = defaults.recording;
    const store = createConfigStore({
      adapter: createMemoryAdapter({
        ...defaults,
        recording: legacyRecording
      }),
      defaults
    });

    expect(store.get().recording.inputDeviceId).toBe(defaults.recording.inputDeviceId);
    expect(store.get().recording.waveformStyle).toBe(defaults.recording.waveformStyle);
  });

  it("resets retired waveform styles to the current default", () => {
    const defaults = createDefaultSettings({ isPackaged: false });
    const store = createConfigStore({
      adapter: createMemoryAdapter({
        ...defaults,
        recording: {
          ...defaults.recording,
          waveformStyle: "waveform-teal"
        }
      }),
      defaults
    });

    expect(store.get().recording.waveformStyle).toBe("waveform-mono");
  });
});
