import type {
  AppSettings,
  AudioFrame,
  CreateHistoryRecordInput,
  HistoryAudioData,
  HistoryRecord,
  RecordingLanguage,
  RecordingMode
} from "@voice/shared";

const HISTORY_RETRY_FRAME_SIZE = 1600;
const PCM16_WAV_FORMAT = 1;
const PCM16_BITS_PER_SAMPLE = 16;
const PCM16_CHANNELS = 1;
const PCM16_SAMPLE_RATE = 16000;

export async function retryHistoryRecord(record: HistoryRecord): Promise<HistoryRecord> {
  if (!record.audio) {
    throw new Error("此歷史記錄沒有可重試的音訊。");
  }

  const [audio, settings, bootstrap] = await Promise.all([
    window.voiceAI.readHistoryAudio(record.id),
    window.voiceAI.getSettings(),
    window.voiceAI.bootstrapClient()
  ]);
  if (!audio) {
    throw new Error("未找到此歷史記錄的音訊檔案。");
  }

  const pcm = decodePcm16Wav(audio);
  if (pcm.length === 0) {
    throw new Error("此歷史記錄的音訊為空，無法重試。");
  }

  const transcript = await transcribeHistoryAudio(pcm, {
    installationId: bootstrap.installationId,
    language: settings.recording.language
  });
  const finalText = await resolveHistoryRetryFinalText({
    installationId: bootstrap.installationId,
    mode: record.mode,
    rawText: transcript,
    selectedText: record.selectedText ?? "",
    settings
  });
  const startedAt = new Date().toISOString();
  const input: CreateHistoryRecordInput = {
    startedAt,
    durationMs: record.audio.durationMs || (pcm.length / PCM16_SAMPLE_RATE) * 1000,
    mode: record.mode,
    status: transcript.trim() ? "completed" : "no_audio",
    transcript,
    finalText,
    audio: {
      pcm,
      sampleRate: PCM16_SAMPLE_RATE
    }
  };
  if (record.selectedText !== undefined) {
    input.selectedText = record.selectedText;
  }

  return window.voiceAI.createHistoryRecord(input);
}

async function transcribeHistoryAudio(
  pcm: Int16Array,
  input: {
    installationId: string;
    language: RecordingLanguage;
  }
): Promise<string> {
  let finalText = "";
  let transcriptionStarted = false;
  const unsubscribe = window.voiceAI.onTranscriptionEvent((event) => {
    if (event.type === "final") {
      finalText = event.text;
    }
  });

  try {
    await window.voiceAI.startTranscription({
      installationId: input.installationId,
      language: input.language,
      sampleRate: PCM16_SAMPLE_RATE
    });
    transcriptionStarted = true;
    for (const frame of buildAudioFrames(pcm)) {
      await window.voiceAI.sendTranscriptionAudio(frame);
    }
    const stopResult = await window.voiceAI.stopTranscription();
    if (!finalText && typeof stopResult?.finalText === "string") {
      finalText = stopResult.finalText;
    }
    return finalText;
  } catch (error) {
    if (transcriptionStarted) {
      await window.voiceAI.cancelTranscription().catch(() => undefined);
    }
    throw error;
  } finally {
    unsubscribe();
  }
}

async function resolveHistoryRetryFinalText(input: {
  installationId: string;
  mode: RecordingMode;
  rawText: string;
  selectedText: string;
  settings: AppSettings;
}): Promise<string> {
  if (!input.rawText.trim()) {
    return "";
  }
  if (input.mode === "direct") {
    return input.rawText;
  }

  const result = await window.voiceAI.postprocess({
    installationId: input.installationId,
    rawText: input.rawText,
    selectedText: input.selectedText,
    appContext: await window.voiceAI.getActiveWindow(),
    mode: input.mode === "translate" ? "translate" : input.settings.ai.defaultMode,
    language: toBackendLanguage(input.settings.recording.language),
    style: input.settings.ai.defaultStyle,
    targetLanguage:
      input.mode === "translate"
        ? resolveTranslateTargetLanguage(
            input.settings.recording.language,
            input.settings.translation.targetLanguage
          )
        : input.settings.translation.targetLanguage,
    dictionaryTerms: []
  });
  return result.finalText;
}

function decodePcm16Wav(audio: HistoryAudioData): Int16Array {
  if (audio.mimeType !== "audio/wav") {
    throw new Error("歷史音訊格式不支援重試。");
  }

  const view = new DataView(audio.data);
  if (
    view.byteLength < 44 ||
    readAscii(view, 0, 4) !== "RIFF" ||
    readAscii(view, 8, 4) !== "WAVE"
  ) {
    throw new Error("歷史音訊檔案格式無效。");
  }

  let offset = 12;
  let audioFormat: number | undefined;
  let channelCount: number | undefined;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let dataOffset: number | undefined;
  let dataSize: number | undefined;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;
    if (chunkDataOffset + chunkSize > view.byteLength) {
      break;
    }

    if (chunkId === "fmt ") {
      audioFormat = view.getUint16(chunkDataOffset, true);
      channelCount = view.getUint16(chunkDataOffset + 2, true);
      sampleRate = view.getUint32(chunkDataOffset + 4, true);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    }
    if (chunkId === "data") {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (
    audioFormat !== PCM16_WAV_FORMAT ||
    channelCount !== PCM16_CHANNELS ||
    sampleRate !== PCM16_SAMPLE_RATE ||
    bitsPerSample !== PCM16_BITS_PER_SAMPLE ||
    dataOffset === undefined ||
    dataSize === undefined
  ) {
    throw new Error("歷史音訊必須是 16k 單聲道 PCM WAV 才能重試。");
  }

  const sampleCount = Math.floor(dataSize / 2);
  const pcm = new Int16Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    pcm[index] = view.getInt16(dataOffset + index * 2, true);
  }
  return pcm;
}

function buildAudioFrames(pcm: Int16Array): AudioFrame[] {
  const frames: AudioFrame[] = [];
  for (let offset = 0; offset < pcm.length; offset += HISTORY_RETRY_FRAME_SIZE) {
    const framePcm = pcm.slice(offset, offset + HISTORY_RETRY_FRAME_SIZE);
    frames.push({
      pcm: framePcm,
      sampleRate: PCM16_SAMPLE_RATE,
      timestampMs: Math.round((offset / PCM16_SAMPLE_RATE) * 1000),
      rms: calculateRms(framePcm)
    });
  }
  return frames;
}

function calculateRms(pcm: Int16Array): number {
  if (pcm.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (const sample of pcm) {
    const normalized = sample / 32768;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / pcm.length);
}

function readAscii(view: DataView, offset: number, length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
}

function toBackendLanguage(lang: RecordingLanguage): "auto" | "zh-CN" | "en-US" {
  switch (lang) {
    case "auto":
      return "auto";
    case "mandarin":
    case "zh-CN":
      return "zh-CN";
    case "english":
    case "en-US":
      return "en-US";
    default:
      return "auto";
  }
}

function resolveTranslateTargetLanguage(
  lang: RecordingLanguage,
  fallback: "zh-CN" | "en-US"
): "zh-CN" | "en-US" {
  switch (lang) {
    case "cantonese":
    case "mandarin":
    case "zh-CN":
      return "en-US";
    case "english":
    case "en-US":
      return "zh-CN";
    default:
      return fallback;
  }
}
