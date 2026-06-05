import {
  encodePcm16ToBase64,
  type PostProcessInput,
  type PostProcessOutput,
  type PostProcessService,
  type TranscriptionEvent,
  type TranscriptionProvider,
  type TranscriptionStartInput,
} from "@voice/ai";
import { JAVA_VOICE_WS_URL, type AudioFrame } from "@voice/shared";

type JavaVoiceAction = "insert" | "replace_selection" | "show_result";

interface JavaVoiceFinalResult {
  type: "final_result";
  sessionId?: string;
  mode?: string;
  transcript?: string;
  action?: JavaVoiceAction;
  text?: string;
  warnings?: string[];
}

interface JavaVoicePartialTranscript {
  type: "partial_transcript";
  text?: string;
}

interface JavaVoiceError {
  type: "error";
  code?: string;
  message?: string;
}

type JavaVoiceMessage =
  | { type: "session_started"; sessionId?: string }
  | JavaVoicePartialTranscript
  | JavaVoiceFinalResult
  | JavaVoiceError;

export interface CreateJavaVoiceSessionProviderOptions {
  url?: string;
  WebSocketConstructor?: typeof WebSocket;
}

export interface JavaVoicePostprocessBridge extends PostProcessService {
  takeResult(): PostProcessOutput | undefined;
}

export function createJavaVoiceSessionProvider(
  options: CreateJavaVoiceSessionProviderOptions = {},
): {
  transcriptionProvider: TranscriptionProvider;
  postProcessService: JavaVoicePostprocessBridge;
} {
  let lastResult: PostProcessOutput | undefined;

  const setLastResult = (result: PostProcessOutput): void => {
    lastResult = result;
  };

  const clearLastResult = (): void => {
    lastResult = undefined;
  };

  return {
    transcriptionProvider: createJavaVoiceTranscriptionProvider({
      ...options,
      onStart: clearLastResult,
      onResult: setLastResult,
    }),
    postProcessService: {
      takeResult: () => lastResult,
      process: async (input) => {
        const result = lastResult ?? createFallbackPostprocessResult(input);
        lastResult = undefined;
        return result;
      },
    },
  };
}

function createJavaVoiceTranscriptionProvider(
  options: CreateJavaVoiceSessionProviderOptions & {
    onStart(): void;
    onResult(result: PostProcessOutput): void;
  },
): TranscriptionProvider {
  const listeners = new Set<(event: TranscriptionEvent) => void>();
  const WebSocketConstructor = options.WebSocketConstructor ?? WebSocket;
  const url = options.url ?? JAVA_VOICE_WS_URL;
  let socket: WebSocket | undefined;
  let sessionId = "";
  let sequence = 0;
  let finalResult: JavaVoiceFinalResult | undefined;
  let sessionError: Error | undefined;
  let stopResolver: (() => void) | undefined;

  const emit = (event: TranscriptionEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const sendJson = (payload: unknown): void => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Java voice WebSocket is not open");
    }
    socket.send(JSON.stringify(payload));
  };

  const cleanup = (): void => {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    socket = undefined;
    stopResolver = undefined;
  };

  const resolveStopWaiter = (): void => {
    stopResolver?.();
    stopResolver = undefined;
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input) => {
      if (socket) {
        throw new Error("Java voice session is already active");
      }
      sessionId = createSessionId();
      sequence = 0;
      finalResult = undefined;
      sessionError = undefined;
      options.onStart();

      console.log(
        `[java-voice] connecting url=${url} sessionId=${sessionId} mode=${input.mode ?? "direct"}`,
      );
      const activeSocket = new WebSocketConstructor(url);
      socket = activeSocket;

      activeSocket.addEventListener("message", (event) => {
        const message = parseJavaVoiceMessage(event.data);
        if (!message) {
          return;
        }
        if (message.type === "partial_transcript") {
          emit({ type: "partial", text: message.text ?? "" });
          return;
        }
        if (message.type === "final_result") {
          console.log(
            `[java-voice] final_result sessionId=${message.sessionId ?? sessionId} action=${message.action ?? "insert"} transcriptLength=${message.transcript?.length ?? 0} textLength=${message.text?.length ?? 0}`,
          );
          finalResult = message;
          options.onResult(toPostprocessOutput(message));
          emit({ type: "final", text: getFinalTranscriptText(message) });
          resolveStopWaiter();
          return;
        }
        if (message.type === "error") {
          sessionError = new Error(
            message.message ?? message.code ?? "Java voice error",
          );
          console.error(
            `[java-voice] server error sessionId=${sessionId} code=${message.code ?? ""} message=${message.message ?? ""}`,
          );
          emit({ type: "error", error: sessionError });
          resolveStopWaiter();
        }
      });

      activeSocket.addEventListener("close", () => {
        console.log(`[java-voice] closed sessionId=${sessionId}`);
        socket = undefined;
        resolveStopWaiter();
      });

      activeSocket.addEventListener("error", () => {
        sessionError = new Error("Java voice WebSocket error");
        console.error(`[java-voice] websocket error sessionId=${sessionId}`);
        emit({ type: "error", error: sessionError });
        resolveStopWaiter();
      });

      try {
        await waitForOpen(activeSocket);
        console.log(`[java-voice] connected sessionId=${sessionId}`);
        const sessionStartPayload = buildSessionStart(sessionId, input);
        console.log(
          `[java-voice] session_start payload=${JSON.stringify(sessionStartPayload)}`,
        );
        sendJson(sessionStartPayload);
        console.log(
          `[java-voice] session_start sent sessionId=${sessionId} mode=${input.mode ?? "direct"} language=${input.language}`,
        );
        emit({ type: "started" });
      } catch (error) {
        console.error(
          `[java-voice] connect failed sessionId=${sessionId} url=${url}`,
          error,
        );
        cleanup();
        throw error;
      }
    },
    sendAudio: (frame: AudioFrame) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      sequence += 1;
      const pcm = encodePcm16ToBase64(frame.pcm);
      if (sequence <= 3) {
        console.log(
          `[java-voice] audio_frame sent sessionId=${sessionId} seq=${sequence} pcmLength=${pcm.length}`,
        );
      }
      socket.send(
        JSON.stringify({
          type: "audio_frame",
          sessionId,
          seq: sequence,
          pcm,
        }),
      );
    },
    stop: async () => {
      if (!socket) {
        return;
      }
      try {
        console.log(`[java-voice] audio_end sent sessionId=${sessionId}`);
        sendJson({ type: "audio_end", sessionId });
        await waitForSessionEnd(
          () => finalResult !== undefined || sessionError !== undefined,
          (resolve) => {
            stopResolver = resolve;
          },
        );
        if (sessionError && !finalResult) {
          throw sessionError;
        }
        emit({ type: "stopped" });
      } finally {
        cleanup();
      }
    },
    cancel: async () => {
      if (!socket) {
        return;
      }
      try {
        console.log(`[java-voice] cancel sent sessionId=${sessionId}`);
        sendJson({ type: "cancel", sessionId, reason: "user_cancelled" });
      } catch {
        // Ignore cancel send failures; the socket is being torn down anyway.
      }
      cleanup();
    },
  };
}

function buildSessionStart(
  sessionId: string,
  input: TranscriptionStartInput,
): Record<string, unknown> {
  return {
    type: "session_start",
    sessionId,
    mode: input.mode ?? "direct",
    language: input.language,
    sampleRate: input.sampleRate,
    audioFormat: "pcm16",
    selectedText: input.selectedText ?? "",
    postprocessMode: input.postprocessMode ?? "clean",
    targetLanguage: input.targetLanguage ?? "en-US",
    ...(input.appContext ? { appContext: input.appContext } : {}),
  };
}

function toPostprocessOutput(message: JavaVoiceFinalResult): PostProcessOutput {
  return {
    action: message.action ?? "insert",
    finalText: getFinalResultText(message),
    confidence: 0.85,
    usedDictionaryTermIds: [],
    warnings: message.warnings ?? [],
  };
}

function getFinalResultText(message: JavaVoiceFinalResult): string {
  return firstNonBlank(message.text, message.transcript);
}

function getFinalTranscriptText(message: JavaVoiceFinalResult): string {
  return firstNonBlank(message.transcript, message.text);
}

function firstNonBlank(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value?.trim()) {
      return value;
    }
  }
  return values.find((value) => value !== undefined) ?? "";
}

function createFallbackPostprocessResult(
  input: PostProcessInput,
): PostProcessOutput {
  return {
    action: input.selectedText ? "replace_selection" : "insert",
    finalText: input.rawText,
    confidence: 0,
    usedDictionaryTermIds: [],
    warnings: ["Java voice service did not return a postprocess result"],
  };
}

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("Java voice WebSocket connection failed")),
      {
        once: true,
      },
    );
    socket.addEventListener(
      "close",
      () => reject(new Error("Java voice WebSocket closed before opening")),
      {
        once: true,
      },
    );
  });
}

function waitForSessionEnd(
  isEnded: () => boolean,
  registerResolver: (resolve: () => void) => void,
): Promise<void> {
  if (isEnded()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    registerResolver(resolve);
  });
}

function parseJavaVoiceMessage(data: unknown): JavaVoiceMessage | undefined {
  if (typeof data !== "string") {
    return undefined;
  }
  try {
    const parsed = JSON.parse(data) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return undefined;
    }
    const record = parsed as { type?: unknown };
    return typeof record.type === "string"
      ? (parsed as JavaVoiceMessage)
      : undefined;
  } catch {
    return undefined;
  }
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `voice-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
