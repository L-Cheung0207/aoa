import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings, type AppSettings } from "@voice/shared";
import { createAudioDuckingService } from "./audioDuckingService";

describe("audio ducking service", () => {
  it("mutes other apps while listening and restores after recording leaves listening", async () => {
    const calls: string[] = [];
    let settings = createDefaultSettings({ isPackaged: false });
    const service = createAudioDuckingService({
      bridge: {
        muteOtherAppsForRecording: async (excludedProcessIds) => {
          calls.push(`mute:${excludedProcessIds.join(",")}`);
        },
        restoreOtherAppsAudio: async () => {
          calls.push("restore");
        },
      },
      getSettings: () => settings,
      getExcludedProcessIds: () => [10, 20, 20],
    });

    service.handleRecordingState({ state: "processing" });
    await Promise.resolve();
    service.handleRecordingState({ state: "listening", mode: "direct" });
    await Promise.resolve();
    service.handleRecordingState({ state: "listening", mode: "direct" });
    await Promise.resolve();
    service.handleRecordingState({ state: "processing", mode: "direct" });
    await Promise.resolve();
    service.handleRecordingState({ state: "success", mode: "direct" });
    await Promise.resolve();

    expect(calls).toEqual(["mute:10,20", "restore"]);

    settings = {
      ...settings,
      audio: {
        ...settings.audio,
        muteOtherAudioDuringRecording: false,
      },
    } satisfies AppSettings;
    service.handleRecordingState({ state: "listening", mode: "direct" });
    await Promise.resolve();

    expect(calls).toEqual(["mute:10,20", "restore"]);
  });

  it("restores immediately when the setting is disabled during listening", async () => {
    const calls: string[] = [];
    let settings = createDefaultSettings({ isPackaged: false });
    const service = createAudioDuckingService({
      bridge: {
        muteOtherAppsForRecording: async () => {
          calls.push("mute");
        },
        restoreOtherAppsAudio: async () => {
          calls.push("restore");
        },
      },
      getSettings: () => settings,
      getExcludedProcessIds: () => [10],
    });

    service.handleRecordingState({ state: "listening", mode: "direct" });
    await Promise.resolve();

    settings = {
      ...settings,
      audio: {
        ...settings.audio,
        muteOtherAudioDuringRecording: false,
      },
    };
    service.handleSettingsChanged(settings);
    await Promise.resolve();

    expect(calls).toEqual(["mute", "restore"]);
  });

  it("logs native failures without throwing into the recording flow", async () => {
    const warn = vi.fn();
    const service = createAudioDuckingService({
      bridge: {
        muteOtherAppsForRecording: async () => {
          throw new Error("native unavailable");
        },
        restoreOtherAppsAudio: async () => {
          throw new Error("restore unavailable");
        },
      },
      getSettings: () => createDefaultSettings({ isPackaged: false }),
      getExcludedProcessIds: () => [10],
      log: { warn, info: vi.fn() },
    });

    expect(() =>
      service.handleRecordingState({ state: "listening", mode: "direct" }),
    ).not.toThrow();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(
      "[audio-ducking] failed to mute other app audio",
      expect.any(Error),
    );
  });
});
