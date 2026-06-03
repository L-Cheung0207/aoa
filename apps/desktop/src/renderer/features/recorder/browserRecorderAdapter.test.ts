import { describe, expect, it, vi } from "vitest";
import type { AudioFrame } from "@voice/shared";
import { createBrowserRecorderAdapter } from "./browserRecorderAdapter";

class FakeAudioWorkletNode {
  static lastInstance: FakeAudioWorkletNode | undefined;

  readonly port = {
    onmessage: undefined as ((event: MessageEvent<AudioFrame>) => void) | undefined,
    onmessageerror: undefined as (() => void) | undefined
  };
  readonly connections: unknown[] = [];
  disconnected = false;

  constructor() {
    FakeAudioWorkletNode.lastInstance = this;
  }

  connect(target: unknown): void {
    this.connections.push(target);
  }

  disconnect(): void {
    this.disconnected = true;
  }
}

describe("browser recorder adapter", () => {
  it("requests raw mono microphone audio and routes worklet output through muted gain", async () => {
    vi.stubGlobal("AudioWorkletNode", FakeAudioWorkletNode);
    const constraints: MediaStreamConstraints[] = [];
    const stoppedTracks: string[] = [];
    const gainNode = {
      gain: { value: 1 },
      connect: (target: unknown) => {
        expect(target).toBe("destination");
      },
      disconnect: () => undefined
    };
    const sourceNode = {
      connect: (target: unknown) => {
        expect(target).toBe(FakeAudioWorkletNode.lastInstance);
      },
      disconnect: () => undefined
    };
    const audioContext = {
      sampleRate: 16000,
      destination: "destination",
      audioWorklet: {
        addModule: async () => undefined
      },
      createMediaStreamSource: () => sourceNode,
      createGain: () => gainNode,
      close: async () => undefined
    };
    const adapter = createBrowserRecorderAdapter({
      mediaDevices: {
        getUserMedia: async (input) => {
          constraints.push(input);
          return {
            getAudioTracks: () => [
              {
                label: "Test Mic",
                stop: () => stoppedTracks.push("stopped"),
                getSettings: () => ({ sampleRate: 16000, channelCount: 1 })
              }
            ],
            getTracks: () => [
              {
                stop: () => stoppedTracks.push("stopped")
              }
            ]
          } as unknown as MediaStream;
        }
      },
      AudioContextConstructor: class {
        constructor(input: AudioContextOptions) {
          expect(input).toEqual({ sampleRate: 16000 });
          return audioContext;
        }
      } as unknown as typeof AudioContext,
      workletUrl: "worklet.js"
    });

    const session = await adapter.start(
      { sampleRate: 16000, maxDurationSeconds: 60 },
      {
        onFrame: () => undefined,
        onError: () => undefined
      }
    );

    expect(constraints).toEqual([
      {
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      }
    ]);
    expect(gainNode.gain.value).toBe(0);

    await session.stop();

    expect(stoppedTracks).toEqual(["stopped"]);
  });

  it("passes the selected microphone device id to getUserMedia", async () => {
    vi.stubGlobal("AudioWorkletNode", FakeAudioWorkletNode);
    const constraints: MediaStreamConstraints[] = [];
    const audioContext = {
      sampleRate: 16000,
      destination: "destination",
      audioWorklet: {
        addModule: async () => undefined
      },
      createMediaStreamSource: () => ({
        connect: () => undefined,
        disconnect: () => undefined
      }),
      createGain: () => ({
        gain: { value: 1 },
        connect: () => undefined,
        disconnect: () => undefined
      }),
      close: async () => undefined
    };
    const adapter = createBrowserRecorderAdapter({
      mediaDevices: {
        getUserMedia: async (input) => {
          constraints.push(input);
          return {
            getAudioTracks: () => [
              {
                label: "USB Mic",
                stop: () => undefined,
                getSettings: () => ({ deviceId: "mic-usb-1" })
              }
            ],
            getTracks: () => [
              {
                stop: () => undefined
              }
            ]
          } as unknown as MediaStream;
        }
      },
      AudioContextConstructor: class {
        constructor() {
          return audioContext;
        }
      } as unknown as typeof AudioContext,
      workletUrl: "worklet.js"
    });

    const session = await adapter.start(
      {
        sampleRate: 16000,
        maxDurationSeconds: 60,
        inputDeviceId: "mic-usb-1"
      },
      {
        onFrame: () => undefined,
        onError: () => undefined
      }
    );

    expect(constraints[0]).toMatchObject({
      audio: {
        deviceId: { exact: "mic-usb-1" }
      }
    });

    await session.stop();
  });
});
