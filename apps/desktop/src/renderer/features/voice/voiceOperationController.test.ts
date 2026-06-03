import { describe, expect, it } from "vitest";
import type { PostProcessInput, PostProcessService } from "@voice/ai";
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
  type VoiceOperationSettings,
  type VoiceTextTarget
} from "./voiceOperationController";

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
  private listeners = new Set<(event: { type: string; text?: string }) => void>();
  public startInputs: unknown[] = [];
  public frames: AudioFrame[] = [];
  public stopCount = 0;
  public cancelCount = 0;

  constructor(private readonly finalText: string) {}

  subscribe(listener: (event: { type: string; text?: string }) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(input: unknown): Promise<void> {
    this.startInputs.push(input);
    this.emit({ type: "started" });
  }

  sendAudio(frame: AudioFrame): void {
    this.frames.push(frame);
  }

  async stop(): Promise<void> {
    this.stopCount += 1;
    this.emit({ type: "final", text: this.finalText });
    this.emit({ type: "stopped" });
  }

  async cancel(): Promise<void> {
    this.cancelCount += 1;
    this.emit({ type: "stopped" });
  }

  private emit(event: { type: string; text?: string }): void {
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

    expect(transcriptionProvider.startInputs).toEqual([
      {
        installationId: "inst_test",
        language: "en-US",
        sampleRate: 16000
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

    expect(transcriptionProvider.startInputs).toEqual([
      {
        installationId: "inst_test",
        language: "cantonese",
        sampleRate: 16000
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
    const transcriptionProvider = new FakeTranscriptionProvider("make this shorter");
    const displayedResults: PostprocessResult[] = [];
    const postProcessService = createPostProcessService({
      action: "replace_selection",
      finalText: "Shorter text.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    });
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

    expect(postProcessService.requests).toEqual([
      {
        installationId: "inst_test",
        rawText: "make this shorter",
        selectedText: "This is the old selected text.",
        appContext: {
          platform: "windows",
          appName: "chrome.exe",
          windowTitle: "Docs"
        },
        mode: "clean",
        language: "en-US",
        style: "natural",
        targetLanguage: "zh-CN",
        dictionaryTerms: []
      }
    ]);
    expect(displayedResults).toEqual([
      {
        action: "replace_selection",
        finalText: "Shorter text.",
        confidence: 0.9,
        usedDictionaryTermIds: [],
        warnings: []
      }
    ]);
    expect(textTarget.replacements).toEqual([]);
    expect(textTarget.inserted).toEqual([]);
  });

  it("uses Right Alt + Right Shift to translate ASR text through LLM and insert it", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("meeting tomorrow at 3");
    const postProcessService = createPostProcessService({
      action: "insert",
      finalText: "明天下午三点开会。",
      confidence: 0.9,
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
        appName: "wechat.exe",
        windowTitle: "Chat"
      })
    });

    await controller.handleToggle("translate");
    await controller.handleToggle("direct");

    expect(postProcessService.requests.map((request) => request.mode)).toEqual(["translate"]);
    expect(postProcessService.requests.map((request) => request.targetLanguage)).toEqual([
      "zh-CN"
    ]);
    expect(textTarget.inserted).toEqual(["明天下午三点开会。"]);
  });

  it("translates Chinese ASR to English for Right Alt + Right Shift", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("明天下午三点开会");
    const postProcessService = createPostProcessService({
      action: "insert",
      finalText: "Meeting tomorrow at 3 PM.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    });
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

    expect(postProcessService.requests).toMatchObject([
      {
        rawText: "明天下午三点开会",
        selectedText: "",
        mode: "translate",
        language: "zh-CN",
        targetLanguage: "en-US"
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
    expect(controller.getSnapshot()).toEqual({ state: "listening", mode: "direct" });
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

  it("uses Right Alt + Space without selected text by sending only ASR text to the LLM", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("summarize today's plan");
    const displayedResults: PostprocessResult[] = [];
    const postProcessService = createPostProcessService({
      action: "insert",
      finalText: "Today: finish the release plan.",
      confidence: 0.9,
      usedDictionaryTermIds: [],
      warnings: []
    });
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
    await controller.handleToggle("direct");

    expect(postProcessService.requests).toEqual([
      {
        installationId: "inst_test",
        rawText: "summarize today's plan",
        selectedText: "",
        appContext: {
          platform: "windows",
          appName: "notepad.exe",
          windowTitle: "notes.txt"
        },
        mode: "clean",
        language: "en-US",
        style: "natural",
        targetLanguage: "zh-CN",
        dictionaryTerms: []
      }
    ]);
    expect(displayedResults.map((result) => result.finalText)).toEqual([
      "Today: finish the release plan."
    ]);
    expect(textTarget.inserted).toEqual([]);
    expect(textTarget.replacements).toEqual([]);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
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
      mode: "processSelection"
    });
    expect(recorder.stopCount).toBe(0);
    expect(transcriptionProvider.stopCount).toBe(0);

    await controller.handleToggle("direct");
    expect(controller.getSnapshot().state).toBe("success");
    expect(recorder.stopCount).toBe(1);
    expect(transcriptionProvider.stopCount).toBe(1);
  });

  it("marks the error reason as transcription when the ASR provider reports an error", async () => {
    const recorder = new FakeRecorderService();
    class ErroringProvider extends FakeTranscriptionProvider {
      emitError(): void {
        for (const listener of (this as unknown as {
          listeners: Set<(event: { type: string }) => void>;
        }).listeners) {
          listener({ type: "error" });
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
    transcriptionProvider.emitError();
    await Promise.resolve();

    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "transcription"
    });
    expect(recorder.cancelCount).toBe(1);
    expect(transcriptionProvider.cancelCount).toBe(1);
  });

  it("marks the error reason as postprocess when LLM fails during processSelection", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("shorten this");
    const postProcessService: PostProcessService = {
      process: async () => {
        throw new Error("LLM_FAILED");
      }
    };
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
      })
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

  it("forces the controller back to idle when Right ALT is pressed while stuck in processing", async () => {
    const recorder = new FakeRecorderService();
    const transcriptionProvider = new FakeTranscriptionProvider("never");
    let resolveStop: (() => void) | undefined;
    let stopStarted = 0;
    // 模拟 ASR stop 永久挂起（网络卡、后端无响应等），制造 processing 阶段的"关不掉"场景。
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

    // 第一次触发 stop，但 transcription.stop 会挂起 → 状态机停留在 processing。
    const stuckPromise = controller.handleToggle("direct");
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
    expect(stopStarted).toBe(1);
    expect(controller.getSnapshot().state).toBe("processing");

    // 用户再次按 Right ALT（direct），必须能把状态机强制推回 idle。
    await controller.handleToggle("direct");
    expect(controller.getSnapshot()).toEqual({ state: "idle", mode: undefined });

    // 清理挂起的 Promise，避免 vitest 泄漏告警。
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
    // 触发停止链路，走到 inserting 阶段后卡住。
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
    // transcription provider 在服务端下发 code=0 且 voice_text_str="" 时会如实 emit final:""。
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

    // 空文本不应触发 insert-text（否则会触发 "Insert text is required"）。
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

    // 空 raw 不应调用 postprocess（浪费 LLM），也不应触发 replace/insert。
    expect(postProcessService.requests).toEqual([]);
    expect(textTarget.replacements).toEqual([]);
    expect(textTarget.inserted).toEqual([]);
    expect(controller.getSnapshot()).toEqual({ state: "success", mode: undefined });
  });

  it("启动进行中（provider.start 未完成）再次 toggle 不会启动麦克风或踩入 stop/cancel 竞态", async () => {
    const recorder = new FakeRecorderService();
    // provider.start 人为挂起，模拟 WS 还在 connecting。
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

    // 第一次 toggle：开始启动，provider.start 还在 await。不等它完成。
    const firstToggle = controller.handleToggle("direct");
    // 微任务没有同步 flush，显式 await 一次让 startSession 的 machine.send 跑到 listening。
    await Promise.resolve();
    expect(controller.getSnapshot().state).toBe("listening");

    // 第二次 toggle：此时 starting 标记仍为 true，应重置 UI，但 provider ready 前麦克风尚未启动。
    const secondToggle = controller.handleToggle("direct");
    await secondToggle;
    expect(recorder.cancelCount).toBe(0);
    expect(recorder.getState()).toBe("idle");
    expect(controller.getSnapshot()).toEqual({ state: "idle", mode: undefined });
    // provider 侧仍等启动收尾后再 cancel，避免 WS 未 open 就 send finished 帧。
    expect(stopCount).toBe(0);
    expect(cancelCount).toBe(0);

    // 让 provider.start resolve，启动收尾 finally 里会触发 cancelSession。
    releaseStart?.();
    await firstToggle;

    expect(startCount).toBe(1);
    // 收尾时走 cancelSession → provider.cancel 必被调一次，recorder 仍不需要 cancel。
    expect(cancelCount).toBe(1);
    expect(recorder.cancelCount).toBe(0);
    // 全程不应发生 stopSession（避免「WS 未 open 就 send finished 帧」）。
    expect(stopCount).toBe(0);
    // 状态机应回到 idle。
    expect(controller.getSnapshot().state).toBe("idle");
  });

  it("启动会话时先调 transcriptionProvider.start 再调 recorder.start，避免 WS 未 ready 时丢帧", async () => {
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

    expect(order).toEqual(["provider.start", "recorder.start"]);
  });

  it("provider.start 失败时不会取消尚未启动的 recorder，错误计为 transcription", async () => {
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

    // handleToggle 自身会吞掉 startSession 抛出的异常（避免 unhandled rejection），
    // 这里直接等它正常 resolve，然后查 snapshot 即可。
    await controller.handleToggle("direct");

    expect(recorderCancelCount).toBe(0);
    expect(controller.getSnapshot()).toEqual({
      state: "error",
      mode: undefined,
      reason: "transcription"
    });
  });
});
