import { describe, expect, it } from "vitest";
import type { TranscriptionEvent, TranscriptionStartInput } from "@voice/ai";
import type { PostprocessResult } from "@voice/backend-client";
import type {
  AudioFrame,
  CreateHistoryRecordInput,
  RecordingMode
} from "@voice/shared";
import type {
  RecorderEvent,
  RecorderOptions,
  RecorderService
} from "../recorder/recorderService";
import {
  createVoiceOperationController,
  VoiceTextInsertionError,
  type VoiceOperationSettings,
  type VoiceTextTarget
} from "./voiceOperationController";

type PostProcessInput = Record<string, unknown>;

interface PostProcessService {
  process(input: PostProcessInput): Promise<PostprocessResult>;
}

function createFrame(timestampMs: number): AudioFrame {
  return {
    pcm: new Int16Array([1, 2]),
    sampleRate: 16000,
    timestampMs,
    rms: 0.2
  };
}

class FakeRecorderService implements RecorderService {
  private listeners = new Set<(event: RecorderEvent) => void>();
  private state: "idle" | "listening" = "idle";
  public starts: Array<Partial<RecorderOptions> | undefined> = [];
  public stopCount = 0;
  public cancelCount = 0;

  getState(): "idle" | "listening" {
    return this.state;
  }

  subscribe(listener: (event: RecorderEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(options?: Partial<RecorderOptions>): Promise<void> {
    this.starts.push(options);
    this.state = "listening";
    this.emit({ type: "start" });
  }

  async stop(): Promise<void> {
    this.stopCount += 1;
    this.state = "idle";
    this.emit({ type: "stop" });
  }

  async cancel(): Promise<void> {
    this.cancelCount += 1;
    this.state = "idle";
  }

  emitFrame(frame: AudioFrame): void {
    this.emit({ type: "frame", frame });
  }

  private emit(event: RecorderEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

class FakeTranscriptionProvider {
  private listeners = new Set<(event: TranscriptionEvent) => void>();
  public startInputs: TranscriptionStartInput[] = [];
  public frames: AudioFrame[] = [];
  public stopCount = 0;
  public cancelCount = 0;

  constructor(
    private readonly finalText: string,
    private readonly finalResult?: PostprocessResult
  ) {}

  subscribe(listener: (event: TranscriptionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(input: TranscriptionStartInput): Promise<void> {
    this.startInputs.push(input);
    this.emit({ type: "started" });
  }

  sendAudio(frame: AudioFrame): void {
    this.frames.push(frame);
  }

  async stop(): Promise<void> {
    this.stopCount += 1;
    this.emit(
      this.finalResult
        ? { type: "final", text: this.finalText, result: this.finalResult }
        : { type: "final", text: this.finalText }
    );
    this.emit({ type: "stopped" });
  }

  async cancel(): Promise<void> {
    this.cancelCount += 1;
    this.emit({ type: "stopped" });
  }

  private emit(event: TranscriptionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function createTextTarget(selectedText = ""): VoiceTextTarget & {
  inserted: string[];
  replacements: Array<{ text: string; expectedSelectedText?: string }>;
} {
  const target: VoiceTextTarget & {
    inserted: string[];
    replacements: Array<{ text: string; expectedSelectedText?: string }>;
  } = {
    inserted: [],
    replacements: [],
    getSelectedText: async () => selectedText,
    insertText: async (text) => {
      target.inserted.push(text);
    },
    replaceSelection: async (text, expectedSelectedText) => {
      const replacement: { text: string; expectedSelectedText?: string } = { text };
      if (expectedSelectedText !== undefined) {
        replacement.expectedSelectedText = expectedSelectedText;
      }
      target.replacements.push(replacement);
    }
  };

  return target;
}

function createSettings(): VoiceOperationSettings {
  return {
    installationId: "inst_test",
    language: "en-US",
    sampleRate: 16000,
    inputDeviceId: "",
    postprocessMode: "clean",
    postprocessStyle: "natural",
    targetLanguage: "zh-CN",
    dictionaryTerms: []
  };
}

function createPostProcessService(result: PostprocessResult): PostProcessService & {
  requests: PostProcessInput[];
} {
  const requests: PostProcessInput[] = [];
  return {
    requests,
    process: async (input) => {
      requests.push(input);
      return result;
    }
  };
}

describe("voice operation controller", () => {
  it("toggles Right Alt direct dictation and inserts the ASR final text", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("hello from ASR");
    const postProcessService = createPostProcessService({
      action: "insert",
      finalText: "should not be used",
      confidence: 1,
      usedDictionaryTermIds: [],
      warnings: []
    });
    const textTarget = createTextTarget();
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    const frame = createFrame(10);
    recorder.emitFrame(frame);
    await controller.handleToggle("direct");

    expect(transcriptionProvider.startInputs).toMatchObject([
      {
        installationId: "inst_test",
        language: "en-US",
        sampleRate: 16000,
        mode: "direct",
        selectedText: "",
        postprocessMode: "clean",
        targetLanguage: "zh-CN"
      }
    ]);
    expect(transcriptionProvider.frames).toEqual([frame]);
    expect(postProcessService.requests).toEqual([]);
    expect(textTarget.inserted).toEqual(["hello from ASR"]);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
  });

  it("passes the selected ASR language through when starting ASR", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("unused");
    const settings = createSettings();
    settings.language = "cantonese";
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings,
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");

    expect(transcriptionProvider.startInputs).toMatchObject([
      {
        installationId: "inst_test",
        language: "cantonese",
        sampleRate: 16000,
        mode: "direct"
      }
    ]);
  });

  it("passes the selected microphone device to the recorder", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("unused");
    const settings = createSettings();
    settings.inputDeviceId = "mic-usb-1";
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings,
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");

    expect(recorder.starts).toEqual([
      {
        sampleRate: 16000,
        inputDeviceId: "mic-usb-1"
      }
    ]);
  });

  it("uses Right Alt + Space to process selected text through ASR then LLM", async () => {
    const recorder = new FakeRecorderService();
    const result: PostprocessResult = {
      action: "show_result",
      finalText: "Shorter text.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    };
    const transcriptionProvider = new FakeTranscriptionProvider(
      "make this shorter",
      result
    );
    const displayedResults: PostprocessResult[] = [];
    const postProcessService = createPostProcessService(result);
    const textTarget = createTextTarget("This is the old selected text.");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "chrome.exe",
        windowTitle: "Docs"
      }),
      onPostprocessResult: ({ result }) => {
        displayedResults.push(result);
      }
    });

    await controller.handleToggle("processSelection");
    await controller.handleToggle("direct");

    expect(transcriptionProvider.startInputs).toMatchObject([
      {
        installationId: "inst_test",
        selectedText: "This is the old selected text.",
        appContext: {
          platform: "windows",
          appName: "chrome.exe",
          windowTitle: "Docs"
        },
        mode: "processSelection",
        language: "en-US",
        postprocessMode: "clean",
        targetLanguage: "zh-CN"
      }
    ]);
    expect(displayedResults).toEqual([result]);
    expect(textTarget.replacements).toEqual([]);
    expect(textTarget.inserted).toEqual([]);
  });

  it("uses Right Alt + Right Shift to translate ASR text through LLM and insert it", async () => {
    const recorder = new FakeRecorderService();
    const result: PostprocessResult = {
      action: "insert",
      finalText: "明天下午三点开会。",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    };
    const transcriptionProvider = new FakeTranscriptionProvider(
      "meeting tomorrow at 3",
      result
    );
    const postProcessService = createPostProcessService(result);
    const textTarget = createTextTarget();
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "wechat.exe",
        windowTitle: "Chat"
      })
    });

    await controller.handleToggle("translate");
    await controller.handleToggle("direct");

    expect(transcriptionProvider.startInputs).toMatchObject([
      {
        mode: "translate",
        postprocessMode: "translate",
        targetLanguage: "zh-CN"
      }
    ]);
    expect(textTarget.inserted).toEqual(["明天下午三点开会。"]);
  });
  it("uses the configured target language for Right Alt + Right Shift", async () => {
    const recorder = new FakeRecorderService();
    const result: PostprocessResult = {
      action: "insert",
      finalText: "Meeting tomorrow at 3 PM.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    };
    const transcriptionProvider = new FakeTranscriptionProvider(
      "明天下午三点开会",
      result
    );
    const postProcessService = createPostProcessService(result);
    const textTarget = createTextTarget();
    const settings = createSettings();
    settings.language = "mandarin";
    settings.targetLanguage = "zh-CN";
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings,
      getAppContext: async () => ({
        platform: "windows",
        appName: "wechat.exe",
        windowTitle: "Chat"
      })
    });

    await controller.handleToggle("translate");
    await controller.handleToggle("direct");

    expect(transcriptionProvider.startInputs).toMatchObject([
      {
        selectedText: "",
        mode: "translate",
        language: "mandarin",
        postprocessMode: "translate",
        targetLanguage: "zh-CN"
      }
    ]);
    expect(textTarget.inserted).toEqual(["Meeting tomorrow at 3 PM."]);
  });
  it("ignores another combo mode while listening", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("unused");
    let cancelledMode: RecordingMode | undefined;
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      }),
      onCancel: (mode) => {
        cancelledMode = mode;
      }
    });

    await controller.handleToggle("direct");
    await controller.handleToggle("translate");

    expect(cancelledMode).toBeUndefined();
    expect(controller.getSnapshot()).toEqual({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "ready"
    });
    expect(recorder.stopCount).toBe(0);
    expect(transcriptionProvider.stopCount).toBe(0);
  });

  it("shows a canceled state after canceling listening and can undo into processing", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("undo transcript");
    const textTarget = createTextTarget();
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    await controller.cancel();

    expect(controller.getSnapshot()).toEqual({ state: "canceled", mode: "direct" });
    expect(recorder.stopCount).toBe(1);
    expect(recorder.cancelCount).toBe(0);
    expect(transcriptionProvider.cancelCount).toBe(0);
    expect(transcriptionProvider.stopCount).toBe(0);

    await controller.undoCancel();

    expect(textTarget.inserted).toEqual(["undo transcript"]);
    expect(transcriptionProvider.stopCount).toBe(1);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
  });

  it("fails process selection without selected text before starting audio", async () => {
    const recorder = new FakeRecorderService();
    const result: PostprocessResult = {
      action: "show_result",
      finalText: "Today: finish the release plan.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    };
    const transcriptionProvider = new FakeTranscriptionProvider(
      "summarize today's plan",
      result
    );
    const displayedResults: PostprocessResult[] = [];
    const postProcessService = createPostProcessService(result);
    const textTarget = createTextTarget("");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      }),
      onPostprocessResult: ({ result }) => {
        displayedResults.push(result);
      }
    });

    await controller.handleToggle("processSelection");

    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "no_selection"
    });
    expect(recorder.starts).toEqual([]);
    expect(transcriptionProvider.startInputs).toEqual([]);
    expect(displayedResults).toEqual([]);
    expect(textTarget.inserted).toEqual([]);
    expect(textTarget.replacements).toEqual([]);
  });
  it("uses the voice input key to finish process selection", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("done");
    const postProcessService = createPostProcessService({
      action: "insert",
      finalText: "处理完成",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    });
    const textTarget = createTextTarget("some selected text");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("processSelection");
    expect(controller.getSnapshot().state).toBe("listening");

    await controller.handleToggle("translate");
    expect(controller.getSnapshot()).toEqual({
      state: "listening",
      mode: "processSelection",
      transcriptionStatus: "ready"
    });
    expect(recorder.stopCount).toBe(0);
    expect(transcriptionProvider.stopCount).toBe(0);

    await controller.handleToggle("direct");
    expect(controller.getSnapshot().state).toBe("success");
    expect(recorder.stopCount).toBe(1);
    expect(transcriptionProvider.stopCount).toBe(1);
  });

  it("keeps listening and marks transcription unavailable when the ASR provider reports an error", async () => {
    const recorder = new FakeRecorderService();
    class ErroringProvider extends FakeTranscriptionProvider {
      emitError(): void {
        for (const listener of (this as unknown as {
          listeners: Set<(event: TranscriptionEvent) => void>;
        }).listeners) {
          listener({ type: "error", error: new Error("ASR failed") });
        }
      }
    }
    const transcriptionProvider = new ErroringProvider("irrelevant");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    const beforeRevision = controller.getSnapshotRevision();
    transcriptionProvider.emitError();
    await Promise.resolve();

    expect(controller.getSnapshot()).toEqual({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "unavailable"
    });
    expect(controller.getSnapshotRevision()).toBeGreaterThan(beforeRevision);
    expect(recorder.cancelCount).toBe(0);
    expect(transcriptionProvider.cancelCount).toBe(0);
  });

  it("marks transcription ready and bumps the snapshot revision after retry succeeds", async () => {
    const recorder = new FakeRecorderService();
    class RetryableProvider extends FakeTranscriptionProvider {
      emitError(): void {
        for (const listener of (this as unknown as {
          listeners: Set<(event: TranscriptionEvent) => void>;
        }).listeners) {
          listener({ type: "error", error: new Error("ASR failed") });
        }
      }
    }
    const transcriptionProvider = new RetryableProvider("irrelevant");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    transcriptionProvider.emitError();
    await Promise.resolve();
    const unavailableRevision = controller.getSnapshotRevision();

    await expect(controller.retryTranscription()).resolves.toBe(true);

    expect(controller.getSnapshot()).toEqual({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "ready"
    });
    expect(controller.getSnapshotRevision()).toBeGreaterThan(unavailableRevision);
  });

  it("keeps transcription unavailable and bumps the snapshot revision after retry fails", async () => {
    const recorder = new FakeRecorderService();
    class RetryFailingProvider extends FakeTranscriptionProvider {
      public failNextStart = false;

      override async start(input: TranscriptionStartInput): Promise<void> {
        if (this.failNextStart) {
          this.failNextStart = false;
          throw new Error("retry failed");
        }
        await super.start(input);
      }

      emitError(): void {
        for (const listener of (this as unknown as {
          listeners: Set<(event: TranscriptionEvent) => void>;
        }).listeners) {
          listener({ type: "error", error: new Error("ASR failed") });
        }
      }
    }
    const transcriptionProvider = new RetryFailingProvider("irrelevant");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    transcriptionProvider.emitError();
    await Promise.resolve();
    const unavailableRevision = controller.getSnapshotRevision();
    transcriptionProvider.failNextStart = true;

    await expect(controller.retryTranscription()).resolves.toBe(false);

    expect(controller.getSnapshot()).toEqual({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "unavailable"
    });
    expect(controller.getSnapshotRevision()).toBeGreaterThan(unavailableRevision);
  });

  it("marks the error reason as postprocess when provider returns a failed postprocess result", async () => {
    const recorder = new FakeRecorderService();
    const result: PostprocessResult = {
      action: "show_result",
      finalText: "Shorter text.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    };
    const transcriptionProvider = new FakeTranscriptionProvider("shorten this", result);
    const postProcessService = createPostProcessService(result);
    const textTarget = createTextTarget("The old text.");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      }),
      onPostprocessResult: () => {
        throw new Error("LLM_FAILED");
      }
    });

    await controller.handleToggle("processSelection");
    await expect(controller.handleToggle("direct")).rejects.toThrow("LLM_FAILED");

    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "postprocess"
    });
  });
  it("marks the error reason as insertion when text insertion fails in direct mode", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("hello");
    const textTarget: VoiceTextTarget = {
      getSelectedText: async () => "",
      insertText: async () => {
        throw new Error("INSERT_FAILED");
      },
      replaceSelection: async () => undefined
    };
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    await expect(controller.handleToggle("direct")).rejects.toThrow("INSERT_FAILED");

    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "insertion"
    });
  });

  it("reports a copy fallback when translated text cannot be inserted", async () => {
    const recorder = new FakeRecorderService();
    const translatedText = "The meeting starts now.";
    const transcriptionProvider = new FakeTranscriptionProvider("现在开会", {
      action: "insert",
      finalText: translatedText,
      confidence: 0.8,
      usedDictionaryTermIds: [],
      warnings: []
    });
    const textTarget: VoiceTextTarget = {
      getSelectedText: async () => "",
      insertText: async () => {
        throw new VoiceTextInsertionError("INSERT_FAILED", translatedText);
      },
      replaceSelection: async () => undefined
    };
    const fallbacks: Array<{ mode: "direct" | "translate"; text: string }> = [];
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: translatedText,
        confidence: 0.8,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      }),
      onInsertionFallback: (event) => {
        fallbacks.push(event);
      }
    });

    await controller.handleToggle("translate");
    await expect(controller.handleToggle("direct")).rejects.toThrow("INSERT_FAILED");

    expect(fallbacks).toEqual([{ mode: "translate", text: translatedText }]);
    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "insertion"
    });
  });

  it("forces the controller back to idle when Right ALT is pressed while stuck in processing", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("never");
    let resolveStop: (() => void) | undefined;
    let stopStarted = 0;
    // Simulate ASR stop hanging forever to cover stuck processing recovery.
    transcriptionProvider.stop = async () => {
      stopStarted += 1;
      await new Promise<void>((resolve) => {
        resolveStop = resolve;
      });
    };
    const textTarget = createTextTarget();
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    expect(controller.getSnapshot().state).toBe("listening");

    // First toggle starts stop, but transcription.stop hangs and leaves processing active.
    const stuckPromise = controller.handleToggle("direct");
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
    expect(stopStarted).toBe(1);
    expect(controller.getSnapshot().state).toBe("processing");

    // Pressing Right ALT again must force the controller back to idle.
    await controller.handleToggle("direct");
    expect(controller.getSnapshot()).toEqual({ state: "idle", mode: undefined });

    // Resolve the hanging promise to avoid Vitest leak warnings.
    resolveStop?.();
    await stuckPromise;
    expect(textTarget.inserted).toEqual([]);
  });

  it("forces the controller back to idle when Right ALT is pressed while stuck in inserting", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("hello");
    let resolveInsert: (() => void) | undefined;
    const textTarget: VoiceTextTarget = {
      getSelectedText: async () => "",
      insertText: async () => {
        await new Promise<void>((resolve) => {
          resolveInsert = resolve;
        });
      },
      replaceSelection: async () => undefined
    };
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    // Trigger the stop flow and hang after entering inserting.
    const stuckPromise = controller.handleToggle("direct");
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
    }
    expect(controller.getSnapshot().state).toBe("inserting");
    expect(resolveInsert).toBeDefined();

    await controller.handleToggle("direct");
    expect(controller.getSnapshot()).toEqual({ state: "idle", mode: undefined });

    resolveInsert?.();
    await stuckPromise;
  });

  it("gracefully finishes a direct session when ASR returns an empty final text (silence)", async () => {
    const recorder = new FakeRecorderService();
    // Provider emits final:"" when the server returns code=0 and voice_text_str="".
    const transcriptionProvider = new FakeTranscriptionProvider("");
    const postProcessService = createPostProcessService({
      action: "insert",
      finalText: "should not be used",
      confidence: 0,
      usedDictionaryTermIds: [],
      warnings: []
    });
    const textTarget = createTextTarget();
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");
    await controller.handleToggle("direct");

    // Empty text must not call insert-text, which would reject with "Insert text is required".
    expect(textTarget.inserted).toEqual([]);
    expect(postProcessService.requests).toEqual([]);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
  });

  it("emits a completed history record with concatenated audio after direct dictation", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("hello from ASR");
    const historyInputs: CreateHistoryRecordInput[] = [];
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      }),
      now: () => new Date("2026-05-27T08:00:00.000Z"),
      onHistoryRecord: (input) => {
        historyInputs.push(input);
      }
    });

    await controller.handleToggle("direct");
    recorder.emitFrame({
      pcm: new Int16Array([1, 2]),
      sampleRate: 16000,
      timestampMs: 10,
      rms: 0.2
    });
    recorder.emitFrame({
      pcm: new Int16Array([3, 4]),
      sampleRate: 16000,
      timestampMs: 20,
      rms: 0.3
    });
    await controller.handleToggle("direct");

    expect(historyInputs).toHaveLength(1);
    expect(historyInputs[0]).toMatchObject({
      startedAt: "2026-05-27T08:00:00.000Z",
      mode: "direct",
      status: "completed",
      transcript: "hello from ASR",
      finalText: "hello from ASR",
      audio: {
        sampleRate: 16000
      }
    });
    expect(Array.from(historyInputs[0]?.audio?.pcm ?? [])).toEqual([1, 2, 3, 4]);
  });

  it("emits a no_audio history record when ASR returns an empty final text", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("");
    const historyInputs: CreateHistoryRecordInput[] = [];
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "unused",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      }),
      now: () => new Date("2026-05-27T08:00:00.000Z"),
      onHistoryRecord: (input) => {
        historyInputs.push(input);
      }
    });

    await controller.handleToggle("direct");
    recorder.emitFrame(createFrame(10));
    await controller.handleToggle("direct");

    expect(historyInputs).toMatchObject([
      {
        startedAt: "2026-05-27T08:00:00.000Z",
        mode: "direct",
        status: "no_audio",
        transcript: "",
        finalText: ""
      }
    ]);
  });

  it("gracefully finishes a processSelection session when ASR returns an empty final text", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("");
    const postProcessService = createPostProcessService({
      action: "replace_selection",
      finalText: "unused",
      confidence: 0,
      usedDictionaryTermIds: [],
      warnings: []
    });
    const textTarget = createTextTarget("some selected text");
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService,
      textTarget,
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "chrome.exe",
        windowTitle: "Docs"
      })
    });

    await controller.handleToggle("processSelection");
    await controller.handleToggle("direct");

    // Empty raw text must skip postprocess and avoid replace/insert calls.
    expect(postProcessService.requests).toEqual([]);
    expect(textTarget.replacements).toEqual([]);
    expect(textTarget.inserted).toEqual([]);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
  });

  it("queues stop when toggled while provider.start is still pending", async () => {
    const recorder = new FakeRecorderService();
    let releaseStart: (() => void) | undefined;
    let startCount = 0;
    let stopCount = 0;
    let cancelCount = 0;
    const frames: AudioFrame[] = [];
    const transcriptionProvider = {
      subscribe: () => () => undefined,
      start: async () => {
        startCount += 1;
        await new Promise<void>((resolve) => {
          releaseStart = resolve;
        });
      },
      sendAudio: (frame: AudioFrame) => {
        frames.push(frame);
      },
      stop: async () => {
        stopCount += 1;
      },
      cancel: async () => {
        cancelCount += 1;
      }
    };
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    const firstToggle = controller.handleToggle("direct");
    await Promise.resolve();
    expect(controller.getSnapshot()).toMatchObject({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "starting"
    });

    const secondToggle = controller.handleToggle("direct");
    await secondToggle;
    expect(recorder.cancelCount).toBe(0);
    expect(recorder.getState()).toBe("listening");
    expect(controller.getSnapshot()).toMatchObject({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "starting"
    });
    expect(stopCount).toBe(0);
    expect(cancelCount).toBe(0);

    releaseStart?.();
    await firstToggle;

    expect(startCount).toBe(1);
    expect(stopCount).toBe(1);
    expect(cancelCount).toBe(0);
    expect(recorder.cancelCount).toBe(0);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
  });
  it("starts the recorder before starting transcription", async () => {
    const order: string[] = [];
    const recorder: RecorderService = {
      getState: () => "idle",
      subscribe: () => () => undefined,
      start: async () => {
        order.push("recorder.start");
      },
      stop: async () => undefined,
      cancel: async () => undefined
    };
    const transcriptionProvider = {
      subscribe: () => () => undefined,
      start: async () => {
        order.push("provider.start");
      },
      sendAudio: () => undefined,
      stop: async () => undefined,
      cancel: async () => undefined
    };
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");

    expect(order).toEqual(["recorder.start", "provider.start"]);
  });
  it("cancels the started recorder when provider.start fails", async () => {
    let recorderCancelCount = 0;
    const recorder: RecorderService = {
      getState: () => "idle",
      subscribe: () => () => undefined,
      start: async () => undefined,
      stop: async () => undefined,
      cancel: async () => {
        recorderCancelCount += 1;
      }
    };
    const transcriptionProvider = {
      subscribe: () => () => undefined,
      start: async () => {
        throw new Error("WS CONNECT FAILED");
      },
      sendAudio: () => undefined,
      stop: async () => undefined,
      cancel: async () => undefined
    };
    const controller = createVoiceOperationController({
      recorder,
      transcriptionProvider,
      postProcessService: createPostProcessService({
        action: "insert",
        finalText: "",
        confidence: 0,
        usedDictionaryTermIds: [],
        warnings: []
      }),
      textTarget: createTextTarget(),
      settings: createSettings(),
      getAppContext: async () => ({
        platform: "windows",
        appName: "notepad.exe",
        windowTitle: "notes.txt"
      })
    });

    await controller.handleToggle("direct");

    expect(recorderCancelCount).toBe(1);
    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "transcription"
    });
  });
});
