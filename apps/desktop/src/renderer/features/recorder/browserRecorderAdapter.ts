import type { AudioFrame } from "@voice/shared";
import type { RecorderAdapter, RecorderAdapterHandlers, RecorderOptions, RecorderSession } from "./recorderService";
import { createPcmFrameBatcher } from "./audioFrames";

const ASR_SEND_RATE_MS = 100;
const ASR_FRAME_SAMPLES = (16000 * ASR_SEND_RATE_MS) / 1000;

export interface BrowserRecorderAdapterDependencies {
  mediaDevices: Pick<MediaDevices, "getUserMedia">;
  AudioContextConstructor: typeof AudioContext;
  workletUrl: string;
}

export function createBrowserRecorderAdapter(
  dependencies: BrowserRecorderAdapterDependencies
): RecorderAdapter {
  return {
    async start(options, handlers): Promise<RecorderSession> {
      return startBrowserRecording(dependencies, options, handlers);
    }
  };
}

async function startBrowserRecording(
  dependencies: BrowserRecorderAdapterDependencies,
  options: RecorderOptions,
  handlers: RecorderAdapterHandlers
): Promise<RecorderSession> {
  const stream = await openMicrophoneStream(dependencies.mediaDevices, options);
  const audioContext = new dependencies.AudioContextConstructor({ sampleRate: options.sampleRate });
  const [track] = stream.getAudioTracks();
  console.log(
    `[recorder] mic="${track?.label ?? "unknown"}" requestedSampleRate=${options.sampleRate} ` +
      `actualContextSampleRate=${audioContext.sampleRate} settings=${JSON.stringify(track?.getSettings?.() ?? {})}`
  );
  await audioContext.audioWorklet.addModule(dependencies.workletUrl);

  const source = audioContext.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(audioContext, "voice-recorder-worklet");
  const monitorGain = audioContext.createGain();
  monitorGain.gain.value = 0;
  const batcher = createPcmFrameBatcher({
    targetSamples: ASR_FRAME_SAMPLES,
    onFrame: handlers.onFrame
  });
  source.connect(worklet);
  worklet.connect(monitorGain);
  monitorGain.connect(audioContext.destination);

  worklet.port.onmessage = (event: MessageEvent<AudioFrame>) => {
    batcher.push(event.data);
  };
  worklet.port.onmessageerror = () => {
    handlers.onError(new Error("Failed to read microphone audio frame"));
  };

  return {
    stop: async () => {
      batcher.flush();
      worklet.disconnect();
      monitorGain.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await audioContext.close();
    }
  };
}

async function openMicrophoneStream(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  options: RecorderOptions
): Promise<MediaStream> {
  try {
    return await mediaDevices.getUserMedia({
      audio: buildRecordingAudioConstraints(options.inputDeviceId)
    });
  } catch (error) {
    logGetUserMediaFailure(error, options.inputDeviceId);
    if (!options.inputDeviceId || !isStaleSelectedDeviceError(error)) {
      throw error;
    }
    console.warn(
      "[recorder] selected microphone is unavailable; retrying with the system default microphone"
    );
    return mediaDevices.getUserMedia({
      audio: buildRecordingAudioConstraints("")
    });
  }
}

function buildRecordingAudioConstraints(
  inputDeviceId: string
): MediaTrackConstraints {
  return {
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    ...(inputDeviceId
      ? { deviceId: { exact: inputDeviceId } }
      : {})
  };
}

function isStaleSelectedDeviceError(error: unknown): boolean {
  const name = getErrorName(error);
  return name === "OverconstrainedError" || name === "NotFoundError";
}

function logGetUserMediaFailure(error: unknown, inputDeviceId: string): void {
  console.error(
    `[recorder] getUserMedia failed name=${getErrorName(error)} ` +
      `message="${getErrorMessage(error)}" selectedDevice=${inputDeviceId ? "yes" : "default"}`,
    error
  );
}

function getErrorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
