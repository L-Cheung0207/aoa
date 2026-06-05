import { describe, expect, it } from "vitest";
import {
  parseCreateTranscriptionSessionInput,
  parseApplyHistoryRetentionInput,
  parseUpdateHistoryRecordInput,
  parseInsertTextInput,
  parsePostprocessInput,
  parseReplaceSelectedTextInput,
  parseSettingsPatchInput,
  parseStartRecordingInput,
  parseTestLlmInput,
} from "./ipcSchemas";

describe("ipc schemas", () => {
  it("accepts non-empty insert text", () => {
    expect(parseInsertTextInput({ text: "hello" })).toEqual({ text: "hello" });
  });

  it("rejects empty insert text", () => {
    expect(() => parseInsertTextInput({ text: "   " })).toThrow(
      "Insert text is required",
    );
  });

  it("accepts replacement text with an expected selected text guard", () => {
    expect(
      parseReplaceSelectedTextInput({
        text: "new text",
        expectedSelectedText: "old text",
      }),
    ).toEqual({
      text: "new text",
      expectedSelectedText: "old text",
    });
  });

  it("rejects a non-string replacement selection guard", () => {
    expect(() =>
      parseReplaceSelectedTextInput({
        text: "new text",
        expectedSelectedText: 42,
      }),
    ).toThrow("Expected selected text must be a string when provided");
  });

  it("accepts nested settings patches", () => {
    expect(
      parseSettingsPatchInput({
        appBehavior: { launchAtLogin: false },
        audio: { interactionSounds: false },
        developer: { enabled: true },
        privacy: { saveHistory: false },
        ui: { language: "zh-TW" },
      }),
    ).toEqual({
      appBehavior: { launchAtLogin: false },
      audio: { interactionSounds: false },
      developer: { enabled: true },
      privacy: { saveHistory: false },
      ui: { language: "zh-TW" },
    });
  });

  it("rejects invalid developer settings patches", () => {
    expect(() =>
      parseSettingsPatchInput({
        developer: { enabled: "yes" },
      }),
    ).toThrow("Settings patch is invalid");
  });

  it("accepts non-reserved shortcut settings patches", () => {
    expect(
      parseSettingsPatchInput({
        shortcuts: { toggleRecording: "Ctrl+Shift+K" },
      }),
    ).toEqual({
      shortcuts: { toggleRecording: "Ctrl+Shift+K" },
    });
  });

  it("rejects reserved shortcut settings patches", () => {
    expect(() =>
      parseSettingsPatchInput({
        shortcuts: { toggleRecording: "Ctrl+C" },
      }),
    ).toThrow("Settings patch is invalid");
  });

  it("accepts single-key shortcut settings patches", () => {
    expect(
      parseSettingsPatchInput({
        shortcuts: { toggleRecording: "A" },
      }),
    ).toEqual({
      shortcuts: { toggleRecording: "A" },
    });
  });

  it("accepts a valid history retention apply input", () => {
    expect(
      parseApplyHistoryRetentionInput({
        retention: "7d",
        now: "2026-05-28T00:00:00.000Z",
      }),
    ).toEqual({
      retention: "7d",
      now: "2026-05-28T00:00:00.000Z",
    });
  });

  it("rejects invalid history retention apply input", () => {
    expect(() =>
      parseApplyHistoryRetentionInput({ retention: "yesterday" }),
    ).toThrow("Apply history retention input requires a valid retention");
  });

  it("accepts a valid history record update input", () => {
    expect(
      parseUpdateHistoryRecordInput({
        id: "history-1",
        startedAt: "2026-05-27T07:59:00.000Z",
        durationMs: 1000,
        mode: "direct",
        status: "completed",
        transcript: "hello",
        finalText: "hello",
      }),
    ).toEqual({
      id: "history-1",
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 1000,
      mode: "direct",
      status: "completed",
      transcript: "hello",
      finalText: "hello",
    });
  });

  it("accepts recording input device settings patches", () => {
    expect(
      parseSettingsPatchInput({
        recording: {
          inputDeviceId: "mic-usb-1",
          waveformStyle: "waveform-candy",
        },
      }),
    ).toEqual({
      recording: {
        inputDeviceId: "mic-usb-1",
        waveformStyle: "waveform-candy",
      },
    });
  });

  it("rejects retired waveform style settings patches", () => {
    expect(() =>
      parseSettingsPatchInput({
        recording: { waveformStyle: "waveform-teal" },
      }),
    ).toThrow("Settings patch is invalid");
  });

  it("rejects invalid settings patch values", () => {
    expect(() =>
      parseSettingsPatchInput({ insertion: { strategy: "shell" } }),
    ).toThrow("Settings patch is invalid");
  });

  it("rejects unknown settings patch sections", () => {
    expect(() => parseSettingsPatchInput({ unexpected: true })).toThrow(
      "Settings patch is invalid",
    );
  });

  it("accepts direct recording mode", () => {
    expect(parseStartRecordingInput({ mode: "direct" })).toEqual({
      mode: "direct",
    });
  });

  it("accepts processSelection with selectedText", () => {
    expect(
      parseStartRecordingInput({
        mode: "processSelection",
        selectedText: "hello",
      }),
    ).toEqual({ mode: "processSelection", selectedText: "hello" });
  });

  it("rejects unknown mode", () => {
    expect(() => parseStartRecordingInput({ mode: "unknown" })).toThrow(
      "Start recording input requires a valid mode",
    );
  });

  it("rejects non-string selectedText", () => {
    expect(() =>
      parseStartRecordingInput({ mode: "processSelection", selectedText: 42 }),
    ).toThrow("Selected text must be a string when provided");
  });

  it("accepts a valid transcription session input", () => {
    expect(
      parseCreateTranscriptionSessionInput({
        installationId: "abc",
        mode: "realtime",
        language: "auto",
        audioFormat: "pcm16",
        sampleRate: 16000,
      }),
    ).toEqual({
      installationId: "abc",
      mode: "realtime",
      language: "auto",
      audioFormat: "pcm16",
      sampleRate: 16000,
    });
  });

  it("rejects transcription session input with bad sample rate", () => {
    expect(() =>
      parseCreateTranscriptionSessionInput({
        installationId: "abc",
        mode: "realtime",
        language: "auto",
        audioFormat: "pcm16",
        sampleRate: 44100,
      }),
    ).toThrow(/sampleRate/);
  });

  it("accepts a valid postprocess input", () => {
    const parsed = parsePostprocessInput({
      installationId: "abc",
      rawText: "hi",
      selectedText: "",
      appContext: { platform: "windows", appName: "App", windowTitle: "" },
      mode: "clean",
      language: "zh-CN",
      style: "natural",
      dictionaryTerms: [],
    });
    expect(parsed.mode).toBe("clean");
    expect(parsed.targetLanguage).toBeUndefined();
  });

  it("accepts an AOSO API connectivity test input with only baseUrl", () => {
    const parsed = parseTestLlmInput({ baseUrl: "http://172.30.21.67:9066" });

    expect(parsed).toEqual({
      baseUrl: "http://172.30.21.67:9066",
      apiKey: "",
      modelName: "AOSO API",
    });
  });

  it("rejects postprocess input with unknown mode", () => {
    expect(() =>
      parsePostprocessInput({
        installationId: "abc",
        rawText: "hi",
        selectedText: "",
        appContext: { platform: "windows", appName: "App", windowTitle: "" },
        mode: "unknown",
        language: "zh-CN",
        style: "natural",
        dictionaryTerms: [],
      }),
    ).toThrow(/mode/);
  });
});
