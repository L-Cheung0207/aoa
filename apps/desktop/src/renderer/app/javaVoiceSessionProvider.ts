import {
  encodePcm16ToBase64,
  type TranscriptionEvent,
  type TranscriptionProvider,
  type TranscriptionStartInput,
} from "@voice/ai";
import type { PostprocessResult } from "@voice/backend-client";
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

const JAVA_VOICE_STOP_TIMEOUT_MS = 10000;
const JAVA_VOICE_SESSION_START_TIMEOUT_MS = 10000;

export interface CreateJavaVoiceSessionProviderOptions {
  url?: string;
  revealSensitiveLogs?: boolean | undefined;
  WebSocketConstructor?: typeof WebSocket;
}

export function createJavaVoiceSessionProvider(
  options: CreateJavaVoiceSessionProviderOptions = {},
): TranscriptionProvider {
  return createJavaVoiceTranscriptionProvider(options);
}

function createJavaVoiceTranscriptionProvider(
  options: CreateJavaVoiceSessionProviderOptions,
): TranscriptionProvider {
  const listeners = new Set<(event: TranscriptionEvent) => void>();
  const WebSocketConstructor = options.WebSocketConstructor ?? WebSocket;
  const url = options.url ?? JAVA_VOICE_WS_URL;
  const revealSensitiveLogs = options.revealSensitiveLogs === true;
  let socket: WebSocket | undefined;
  let sessionId = "";
  let sequence = 0;
  let finalResult: JavaVoiceFinalResult | undefined;
  let sessionError: Error | undefined;
  let stopResolver: (() => void) | undefined;
  let startResolver: (() => void) | undefined;
  let startRejecter: ((error: Error) => void) | undefined;
  let sessionStarted = false;

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

  const rejectStartWaiter = (error: Error): void => {
    startRejecter?.(error);
    startResolver = undefined;
    startRejecter = undefined;
  };

  const cleanup = (error?: Error): void => {
    if (error) {
      rejectStartWaiter(error);
    }
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    socket = undefined;
    stopResolver = undefined;
    startResolver = undefined;
    startRejecter = undefined;
    sessionStarted = false;
  };

  const resolveStopWaiter = (): void => {
    stopResolver?.();
    stopResolver = undefined;
  };

  const resolveStartWaiter = (): void => {
    startResolver?.();
    startResolver = undefined;
    startRejecter = undefined;
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
      sessionStarted = false;

      console.log(
        `[java-voice] connecting url=${redactUrlForLog(url, revealSensitiveLogs)} sessionId=${sessionId} mode=${input.mode ?? "direct"}`,
      );
      const activeSocket = new WebSocketConstructor(url);
      socket = activeSocket;

      activeSocket.addEventListener("message", (event) => {
        const message = parseJavaVoiceMessage(event.data);
        if (!message) {
          return;
        }
        if (message.type === "session_started") {
          sessionId = message.sessionId ?? sessionId;
          sessionStarted = true;
          console.log(`[java-voice] session_started sessionId=${sessionId}`);
          emit({ type: "started" });
          resolveStartWaiter();
          return;
        }
        if (message.type === "partial_transcript") {
          emit({ type: "partial", text: message.text ?? "" });
          return;
        }
        if (message.type === "final_result") {
          const result = toPostprocessOutput(message);
          console.log(
            `[java-voice] final_result sessionId=${message.sessionId ?? sessionId} action=${message.action ?? "insert"} transcriptLength=${message.transcript?.length ?? 0} textLength=${message.text?.length ?? 0}`,
          );
          finalResult = message;
          emit({
            type: "final",
            text: getFinalTranscriptText(message),
            result,
          });
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
          rejectStartWaiter(sessionError);
          resolveStopWaiter();
        }
      });

      activeSocket.addEventListener("close", () => {
        console.log(`[java-voice] closed sessionId=${sessionId}`);
        socket = undefined;
        if (!sessionStarted) {
          rejectStartWaiter(
            new Error("Java voice WebSocket closed before session started"),
          );
        }
        resolveStopWaiter();
      });

      activeSocket.addEventListener("error", () => {
        sessionError = new Error("Java voice WebSocket error");
        console.error(`[java-voice] websocket error sessionId=${sessionId}`);
        emit({ type: "error", error: sessionError });
        rejectStartWaiter(sessionError);
        resolveStopWaiter();
      });

      try {
        await waitForOpen(activeSocket);
        console.log(`[java-voice] connected sessionId=${sessionId}`);
        const sessionStartPayload = buildSessionStart(sessionId, input);
        console.log(
          `[java-voice] session_start summary ${formatSessionStartForLog(sessionStartPayload, revealSensitiveLogs)}`,
        );
        sendJson(sessionStartPayload);
        console.log(
          `[java-voice] session_start sent sessionId=${sessionId} mode=${input.mode ?? "direct"} language=${input.language}`,
        );
        await waitForSessionStarted(
          () => sessionStarted,
          (resolve, reject) => {
            startResolver = resolve;
            startRejecter = reject;
          },
          JAVA_VOICE_SESSION_START_TIMEOUT_MS,
        );
      } catch (error) {
        console.error(
          `[java-voice] connect failed sessionId=${sessionId} url=${redactUrlForLog(url, revealSensitiveLogs)}`,
          error,
        );
        cleanup(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    sendAudio: (frame: AudioFrame) => {
      if (!socket || socket.readyState !== WebSocket.OPEN || !sessionStarted) {
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
          JAVA_VOICE_STOP_TIMEOUT_MS,
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
      cleanup(new Error("Java voice session cancelled"));
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
    ...(input.mode === "translate" && input.targetLanguage
      ? { targetLanguage: input.targetLanguage }
      : {}),
    ...(input.appContext ? { appContext: input.appContext } : {}),
  };
}

function formatSessionStartForLog(
  payload: Record<string, unknown>,
  revealSensitive: boolean,
): string {
  const selectedText =
    typeof payload.selectedText === "string" ? payload.selectedText : "";
  const parts = [
    `sessionId=${payload.sessionId ?? ""}`,
    `mode=${payload.mode ?? ""}`,
    `language=${payload.language ?? ""}`,
    `sampleRate=${payload.sampleRate ?? ""}`,
    `postprocessMode=${payload.postprocessMode ?? ""}`,
    `selectedTextLength=${selectedText.length}`,
    `hasAppContext=${payload.appContext !== undefined}`,
  ];
  if (payload.targetLanguage !== undefined) {
    parts.push(`targetLanguage=${payload.targetLanguage ?? ""}`);
  }
  if (revealSensitive) {
    parts.push(`selectedText=${selectedText}`);
    if (isRecord(payload.appContext)) {
      const appContext = payload.appContext;
      parts.push(`appName=${String(appContext.appName ?? "")}`);
      parts.push(`windowTitle=${String(appContext.windowTitle ?? "")}`);
    }
  }
  return parts.join(" ");
}

function redactUrlForLog(input: string, revealSensitive = false): string {
  if (revealSensitive) {
    try {
      return new URL(input).toString();
    } catch {
      return input;
    }
  }
  try {
    const parsed = new URL(input);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(?:AccessCode|accessCode|token|apiKey|password|secret)$/i.test(key)) {
        parsed.searchParams.set(key, "***");
      }
    }
    return parsed.toString();
  } catch {
    return input.replace(
      /([?&](?:AccessCode|accessCode|token|apiKey|password|secret)=)[^&\s]+/gi,
      "$1***",
    );
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function toPostprocessOutput(message: JavaVoiceFinalResult): PostprocessResult {
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
  timeoutMs: number,
): Promise<void> {
  if (isEnded()) {
    return Promise.resolve();
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return new Promise<void>((resolve, reject) => {
    timeout = globalThis.setTimeout(() => {
      reject(new Error("Java voice session timed out waiting for final result"));
    }, timeoutMs);
    registerResolver(resolve);
  }).finally(() => {
    if (timeout !== undefined) {
      globalThis.clearTimeout(timeout);
    }
  });
}

function waitForSessionStarted(
  isStarted: () => boolean,
  registerWaiter: (
    resolve: () => void,
    reject: (error: Error) => void,
  ) => void,
  timeoutMs: number,
): Promise<void> {
  if (isStarted()) {
    return Promise.resolve();
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return new Promise<void>((resolve, reject) => {
    timeout = globalThis.setTimeout(() => {
      reject(new Error("Java voice session timed out waiting for session_started"));
    }, timeoutMs);
    registerWaiter(resolve, reject);
  }).finally(() => {
    if (timeout !== undefined) {
      globalThis.clearTimeout(timeout);
    }
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
