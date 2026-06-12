import type { AppSettings, RecordingMode } from "@voice/shared";

export type AudioDuckingRecordingState =
  | "idle"
  | "listening"
  | "canceled"
  | "processing"
  | "inserting"
  | "result"
  | "success"
  | "error"
  | "shortcutHelp";

export interface AudioDuckingBridge {
  muteOtherAppsForRecording(excludedProcessIds: number[]): Promise<void>;
  restoreOtherAppsAudio(): Promise<void>;
}

export interface AudioDuckingStateUpdate {
  state: AudioDuckingRecordingState | string;
  mode?: RecordingMode | undefined;
}

export interface CreateAudioDuckingServiceOptions {
  bridge: AudioDuckingBridge;
  getSettings(): AppSettings;
  getExcludedProcessIds(): number[];
  log?: Pick<Console, "warn" | "info">;
}

export interface AudioDuckingService {
  handleRecordingState(update: AudioDuckingStateUpdate): void;
  handleSettingsChanged(settings: AppSettings): void;
  restore(): Promise<void>;
}

export function createAudioDuckingService(
  options: CreateAudioDuckingServiceOptions,
): AudioDuckingService {
  let muted = false;
  let lastState: AudioDuckingStateUpdate = { state: "idle" };
  const log = options.log ?? console;

  async function mute(): Promise<void> {
    if (muted) {
      return;
    }

    muted = true;
    try {
      await options.bridge.muteOtherAppsForRecording(
        normalizeProcessIds(options.getExcludedProcessIds()),
      );
    } catch (error) {
      muted = false;
      log.warn("[audio-ducking] failed to mute other app audio", error);
    }
  }

  async function restore(): Promise<void> {
    if (!muted) {
      return;
    }

    muted = false;
    try {
      await options.bridge.restoreOtherAppsAudio();
    } catch (error) {
      log.warn("[audio-ducking] failed to restore other app audio", error);
    }
  }

  function shouldMute(settings: AppSettings, update: AudioDuckingStateUpdate): boolean {
    return (
      settings.audio.muteOtherAudioDuringRecording === true &&
      update.state === "listening"
    );
  }

  function reconcile(): void {
    const settings = options.getSettings();
    if (shouldMute(settings, lastState)) {
      void mute();
      return;
    }
    void restore();
  }

  return {
    handleRecordingState: (update) => {
      lastState = update;
      reconcile();
    },
    handleSettingsChanged: (_settings) => {
      reconcile();
    },
    restore,
  };
}

function normalizeProcessIds(processIds: readonly number[]): number[] {
  return [...new Set(processIds.filter((pid) => Number.isInteger(pid) && pid > 0))];
}
