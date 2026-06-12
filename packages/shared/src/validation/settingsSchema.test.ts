import { describe, expect, it } from "vitest";
import {
  createDefaultSettings,
  JAVA_VOICE_WS_URL,
  mergeSettingsPatch,
} from "./settingsSchema";

describe("settings schema", () => {
  it("creates Windows anonymous-client defaults for development", () => {
    const settings = createDefaultSettings({ isPackaged: false });

    expect(settings.backend.mode).toBe("mock");
    expect(settings.backend.baseUrl).toBe("http://127.0.0.1:8787");
    expect(settings.ui.theme).toBe("light");
    expect(settings.ui.language).toBe("zh-TW");
    expect(settings.audio.interactionSounds).toBe(true);
    expect(settings.audio.muteOtherAudioDuringRecording).toBe(true);
    expect(settings.appBehavior.launchAtLogin).toBe(true);
    expect(settings.shortcuts.toggleRecording).toBe("RightAlt");
    expect(settings.shortcuts.processSelection).toBe("RightAlt+Space");
    expect(settings.shortcuts.translateDictation).toBe("RightAlt+RightShift");
    expect(settings.shortcuts.holdToTalk).toBe("");
    expect(settings.translation.sourceLanguage).toBe("auto");
    expect(settings.translation.targetLanguage).toBe("en-US");
    expect(settings.recording.sampleRate).toBe(16000);
    expect(settings.recording.inputDeviceId).toBe("");
    expect(settings.recording.waveformStyle).toBe("waveform-sunset");
    expect(settings.developer.enabled).toBe(false);
    expect(settings.privacy.saveHistory).toBe(true);
    expect(settings.privacy.historyRetention).toBe("forever");
  });

  it("creates default ws settings for the bundled ASR endpoint", () => {
    const settings = createDefaultSettings({ isPackaged: false });

    expect(JAVA_VOICE_WS_URL).toBe(
      "ws://172.27.209.114:8095/aoa_api/voice",
    );
    expect(settings.ws.servers).toEqual([
      {
        url: "wss://aiapi.ctmcloud.com.mo:8443/Others/websocket-uat2/ws",
      },
    ]);
    expect(settings.ws.selectedIndex).toBe(0);
    expect(settings.llm.models).toEqual([
      {
        baseUrl: "http://172.30.21.67:9066",
        apiKey: "unused",
        modelName: "AOSO API",
      },
    ]);
    expect(settings.llm.selectedIndex).toBe(0);
    expect(settings.llm.models[0]).not.toHaveProperty("proxy");
  });

  it("does not ship embedded ASR access codes or proxy credentials", () => {
    const settings = createDefaultSettings({ isPackaged: false });
    const serialized = JSON.stringify(settings);

    expect(serialized).not.toContain("AccessCode=");
    expect(serialized).not.toContain("proxyPassword");
    expect(settings.ws.servers[0]).not.toHaveProperty("proxyUsername");
    expect(settings.ws.servers[0]).not.toHaveProperty("proxyPassword");
  });

  it("creates production defaults without enabling mock backend", () => {
    const settings = createDefaultSettings({ isPackaged: true });

    expect(settings.backend.mode).toBe("production");
  });

  it("merges nested patches without dropping existing defaults", () => {
    const settings = mergeSettingsPatch(
      createDefaultSettings({ isPackaged: false }),
      {
        ai: { defaultMode: "formal" },
        appBehavior: { launchAtLogin: false },
        audio: { interactionSounds: false },
        developer: { enabled: true },
        privacy: { saveHistory: false },
      },
    );

    expect(settings.ai.defaultMode).toBe("formal");
    expect(settings.ai.defaultStyle).toBe("natural");
    expect(settings.audio.interactionSounds).toBe(false);
    expect(settings.audio.muteOtherAudioDuringRecording).toBe(true);
    expect(settings.appBehavior.launchAtLogin).toBe(false);
    expect(settings.developer.enabled).toBe(true);
    expect(settings.privacy.saveHistory).toBe(false);
    expect(settings.privacy.historyRetention).toBe("never");
    expect(settings.privacy.restoreClipboard).toBe(true);
    expect(settings.ws.servers).toHaveLength(1);
    expect(settings.ws.selectedIndex).toBe(0);
    expect(settings.llm.models[0]?.baseUrl).toBe("http://172.30.21.67:9066");
  });

  it("merges recording device and waveform patches without dropping recorder defaults", () => {
    const settings = mergeSettingsPatch(
      createDefaultSettings({ isPackaged: false }),
      {
        recording: {
          inputDeviceId: "mic-usb-1",
          waveformStyle: "waveform-candy",
        },
      },
    );

    expect(settings.recording.inputDeviceId).toBe("mic-usb-1");
    expect(settings.recording.waveformStyle).toBe("waveform-candy");
    expect(settings.recording.language).toBe("cantonese");
    expect(settings.recording.sampleRate).toBe(16000);
    expect(settings.recording.silenceStopMs).toBe(900);
  });

  it("allows replacing ws.servers and llm.models wholesale", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const next = mergeSettingsPatch(base, {
      ws: { servers: [{ url: "wss://example.com/ws" }], selectedIndex: 0 },
      llm: {
        models: [
          {
            baseUrl: "https://llm.example.com/v1",
            apiKey: "k",
            modelName: "m",
          },
        ],
        selectedIndex: 0,
      },
    });

    expect(next.ws.servers).toHaveLength(1);
    expect(next.ws.servers[0].url).toBe("wss://example.com/ws");
    expect(next.llm.models[0].modelName).toBe("m");
  });

  it("keeps saveHistory in sync with history retention patches", () => {
    const disabled = mergeSettingsPatch(
      createDefaultSettings({ isPackaged: false }),
      {
        privacy: { historyRetention: "never" },
      },
    );
    const monthly = mergeSettingsPatch(disabled, {
      privacy: { historyRetention: "30d" },
    });

    expect(disabled.privacy.saveHistory).toBe(false);
    expect(monthly.privacy.saveHistory).toBe(true);
  });
});
