import type { AudioFrame, RecordingLanguage } from "@voice/shared";
import {
  encodePcm16ToBase64,
  type TranscriptionEvent,
  type TranscriptionProvider,
  type TranscriptionStartInput
} from "./transcriptionTypes";

/**
 * Default WebSocket ASR 协议适配器。
 *
 * 协议（参见 old/main.py send_audio 函数）：
 * - URL：wss://newswriter.teleone.com.cn/ws/transcribe（或 settings 中配置的云端备选）
 * - 发送实时帧：{ voice_id, pcm: base64(pcm16), flag: "real_time", language }
 * - 发送结束帧：{ voice_id, pcm: "", flag: "finished", language }
 * - 接收：{ voice_id, code: "0"|"1"|"2", result: { voice_text_str } }
 *   code="1" → partial，code="0"|"2" → final
 */

export interface TranscriptionSocket {
  send(message: string): void;
  close(): void;
  onOpen(handler: () => void): void;
  onMessage(handler: (message: string) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: (event: TranscriptionSocketCloseEvent) => void): void;
  /** 测试辅助：手工触发 open。 */
  emitOpen?(): void;
  /** 测试辅助：手工触发 message。 */
  emitMessage?(message: string): void;
  /** 测试辅助：手工触发 error。 */
  emitError?(error: Error): void;
  /** 测试辅助：手工触发 close。 */
  emitClose?(event?: TranscriptionSocketCloseEvent): void;
}

export interface TranscriptionSocketCloseEvent {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

export interface TranscriptionSocketFactory {
  connect(url: string): TranscriptionSocket;
}

export type DefaultTranscriptionLanguage =
  | "auto"
  | "cantonese"
  | "mandarin"
  | "english"
  | "korean"
  | "portuguese"
  | "japanese"
  | "thai"
  | "hindi"
  | "indonesia";

export interface CreateDefaultTranscriptionProviderOptions {
  /** WebSocket URL，默认指向 newswriter 生产环境。 */
  url?: string;
  /** 可选：用 RecordingLanguage（auto/zh-CN/en-US）手工指定协议语言，缺省则按内置表映射 start 入参。 */
  languageOverride?: DefaultTranscriptionLanguage;
  /** stop 后等待最终结果（code=0/2）的最长时间，默认 60 秒。超时后直接关闭并以当前累计 partial 作为 final。 */
  finalTimeoutMs?: number;
  noResponseFinalTimeoutMs?: number;
  /** 自定义 socket 工厂，默认使用 BrowserTranscriptionSocketFactory（依赖全局 WebSocket）。 */
  socketFactory?: TranscriptionSocketFactory;
  /** 自定义 uuid 生成，默认走 crypto.randomUUID，无则退化为时间戳+随机。 */
  generateVoiceId?: () => string;
  /** Development diagnostics: reveal URL/text payloads in logs. Audio frames stay summarized. */
  revealSensitiveLogs?: boolean | undefined;
}

const DEFAULT_URL = "wss://newswriter.teleone.com.cn/ws/transcribe";
const DEFAULT_FINAL_TIMEOUT_MS = 60_000;
const DEFAULT_NO_RESPONSE_FINAL_TIMEOUT_MS = DEFAULT_FINAL_TIMEOUT_MS;
const MAX_PENDING_AUDIO_FRAMES = 30;

export function createDefaultTranscriptionProvider(
  options: CreateDefaultTranscriptionProviderOptions = {}
): TranscriptionProvider {
  const url = options.url ?? DEFAULT_URL;
  const finalTimeoutMs = options.finalTimeoutMs ?? DEFAULT_FINAL_TIMEOUT_MS;
  const noResponseFinalTimeoutMs =
    options.noResponseFinalTimeoutMs ?? DEFAULT_NO_RESPONSE_FINAL_TIMEOUT_MS;
  const socketFactory = options.socketFactory ?? createBrowserTranscriptionSocketFactory();
  const generateVoiceId = options.generateVoiceId ?? defaultGenerateVoiceId;
  const revealSensitiveLogs = options.revealSensitiveLogs === true;

  const listeners = new Set<(event: TranscriptionEvent) => void>();
  const emit = (event: TranscriptionEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  let socket: TranscriptionSocket | undefined;
  /** socket 实例已创建且 WS open 事件已触发；connect 与 open 之间存在竞态窗口。 */
  let socketOpen = false;
  let voiceId = "";
  let language: DefaultTranscriptionLanguage = "auto";
  /** stop() 等待 final 的 resolve；收到 code=0/2 或超时会被调用。 */
  let finalResolver: (() => void) | undefined;
  let finalTimer: ReturnType<typeof setTimeout> | undefined;
  /** 收到的最近一条 partial 文本，超时兜底时作为 final 发射。 */
  let lastPartialText = "";
  /** 是否已经 emit 过 final，用来去重（防止 code=0 和 code=2 都发了导致双 final）。 */
  let finalEmitted = false;
  let stopping = false;
  /** 本次会话已发送的 real_time 音频帧计数（对齐 old/main.py `sent_count`）。 */
  let sentFrameCount = 0;
  /** WS open 前临时缓冲的早期音频帧，避免用户刚开始说话时内容被连接竞态吞掉。 */
  let pendingAudioFrames: AudioFrame[] = [];
  /** 本次会话已接收的服务端消息计数。 */
  let recvMessageCount = 0;
  /** 本会话因尚无 socket 或缓冲区满而丢掉的帧计数，累计供 stop 时诊断。 */
  let droppedFrameCount = 0;
  /** 节流警告计数器：避免每丢一帧都打 warn。 */
  let lastDropWarnAt = 0;
  /** 连续空 partial 的计数：服务端静音期间会高频下发 text=""，用它做心跳式节流日志。 */
  let emptyPartialStreak = 0;
  /** 已打印过的最近一条非空 partial：仅在文本变化时才打日志，避免相同内容反复刷屏。 */
  let lastPrintedPartialText = "";
  /** 最近一条空 partial 的 raw 样本：用于在心跳摘要里带上一条实际消息给排查用。 */
  let lastEmptyPartialRaw = "";

  /** 预览文本：截断到 30 个字符，并转义换行，避免日志刷屏。 */
  const previewText = (value: string, max = 30): string => {
    const compact = value.replace(/\s+/g, " ");
    return compact.length <= max ? compact : `${compact.slice(0, max)}…(${compact.length}字)`;
  };

  const redactUrlForLog = (input: string): string => {
    if (revealSensitiveLogs) {
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
        "$1***"
      );
    }
  };

  const summarizeServerRecordForLog = (record: Record<string, unknown>): string => {
    const parts: string[] = [];
    const code = record["code"];
    if (code !== undefined && code !== null) {
      parts.push(`code=${String(code)}`);
    }
    const result = record["result"];
    if (result && typeof result === "object") {
      const text = (result as Record<string, unknown>)["voice_text_str"];
      if (typeof text === "string") {
        parts.push(
          revealSensitiveLogs
            ? `voiceText=${previewText(text, 120)}`
            : `voiceTextLength=${text.length}`
        );
      }
    }
    for (const key of ["text", "rawText", "transcript", "finalText"]) {
      const value = record[key];
      if (typeof value === "string") {
        parts.push(
          revealSensitiveLogs
            ? `${key}=${previewText(value, 120)}`
            : `${key}Length=${value.length}`
        );
      }
    }
    parts.push(`keys=${Object.keys(record).join(",")}`);
    return parts.join(" ");
  };

  const summarizeServerPayloadForLog = (raw: string): string => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return `rawLength=${raw.length} summary=non-object`;
      }
      return summarizeServerRecordForLog(parsed as Record<string, unknown>);
    } catch {
      return `rawLength=${raw.length} preview=${previewText(raw)}`;
    }
  };

  const formatLogTimestamp = (date = new Date()): string =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);

  const transcriptionLog = (message: string, ...args: unknown[]): void => {
    console.log(`${formatLogTimestamp()} - ${message}`, ...args);
  };

  const transcriptionWarn = (message: string, ...args: unknown[]): void => {
    console.warn(`${formatLogTimestamp()} - ${message}`, ...args);
  };

  const transcriptionError = (message: string, ...args: unknown[]): void => {
    console.error(`${formatLogTimestamp()} - ${message}`, ...args);
  };

  const normalizedReceiveIcon = (raw: string): "🔊" | "🔇" => {
    try {
      const parsed = JSON.parse(raw) as { result?: { voice_text_str?: unknown } };
      const text = parsed.result?.voice_text_str;
      return typeof text === "string" && text.length > 0 ? "🔊" : "🔇";
    } catch {
      return "🔊";
    }
  };

  const clearFinalTimer = (): void => {
    if (finalTimer !== undefined) {
      clearTimeout(finalTimer);
      finalTimer = undefined;
    }
  };

  const resolveFinalWait = (): void => {
    clearFinalTimer();
    if (finalResolver) {
      const resolver = finalResolver;
      finalResolver = undefined;
      resolver();
    }
  };

  const emitFallbackFinal = (reason: string): void => {
    if (finalEmitted) {
      return;
    }
    finalEmitted = true;
    transcriptionWarn(`${reason}，使用最近 partial 兜底 fallbackTextLength=${lastPartialText.length}`);
    emit({ type: "final", text: lastPartialText });
  };

  const teardownSocket = (): void => {
    if (!socket) {
      return;
    }
    const activeSocket = socket;
    socket = undefined;
    socketOpen = false;
    try {
      activeSocket.close();
    } catch (error) {
      transcriptionWarn("⚠️ 关闭 socket 异常（已忽略）", error);
    }
  };

  const handleMessage = (raw: string): void => {
    recvMessageCount += 1;
    transcriptionLog(
      `${normalizedReceiveIcon(raw)} 接收到的信息: [asr] WS ← #${recvMessageCount} ${summarizeServerPayloadForLog(raw)}`
    );
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch (error) {
      transcriptionWarn(
        `⚠️ 解析服务端消息失败（已忽略）#${recvMessageCount} ${summarizeServerPayloadForLog(raw)}`,
        error
      );
      return;
    }
    if (typeof msg !== "object" || msg === null) {
      transcriptionWarn(
        `⚠️ 服务端消息非对象结构（已忽略）#${recvMessageCount} ${summarizeServerPayloadForLog(raw)}`
      );
      return;
    }
    const record = msg as Record<string, unknown>;

    // old python：`if recv_id and recv_id != voice_id: return` —— 仅当显式不匹配时丢弃。
    const recvId = typeof record["voice_id"] === "string" ? (record["voice_id"] as string) : "";
    if (recvId && recvId !== voiceId) {
      transcriptionWarn(
        `⚠️ 丢弃 voice_id 不匹配的消息 #${recvMessageCount}：收到=${recvId} 会话=${voiceId} ${summarizeServerRecordForLog(record)}`
      );
      return;
    }

    const code = record["code"] === undefined || record["code"] === null ? "" : String(record["code"]);
    const resultValue = record["result"];
    const text =
      typeof resultValue === "object" && resultValue !== null
        ? (resultValue as Record<string, unknown>)["voice_text_str"]
        : undefined;
    const normalized = typeof text === "string" ? text : "";

    if (code === "1") {
      // 日志分类节流：
      // - 空文本 partial（静音期服务端刷的心跳）：不逐条打印，每 50 条合并一条摘要（附一条最新 raw 样本）。
      // - 非空 partial 且文本与上次已打印一致：跳过（服务端会重复下发相同快照）。
      // - 非空 partial 且文本变化：正常打印，附 raw。
      if (!normalized) {
        emptyPartialStreak += 1;
        lastEmptyPartialRaw = summarizeServerRecordForLog(record);
        if (emptyPartialStreak % 50 === 0) {
          transcriptionLog(`🔇 空 partial 心跳 累计连续 ${emptyPartialStreak} 条（静音中，已静默） sample=${lastEmptyPartialRaw}`);
        }
        return;
      }
      if (emptyPartialStreak > 0) {
        transcriptionLog(`🔊 空 partial 心跳结束：此前累计 ${emptyPartialStreak} 条 lastSample=${lastEmptyPartialRaw}`);
        emptyPartialStreak = 0;
        lastEmptyPartialRaw = "";
      }
      if (normalized !== lastPrintedPartialText) {
        transcriptionLog(
          `🔊 收到 partial #${recvMessageCount} textLength=${normalized.length} ${summarizeServerRecordForLog(record)}`
        );
        lastPrintedPartialText = normalized;
      }
      lastPartialText = normalized;
      emit({ type: "partial", text: normalized });
      return;
    }

    if (code === "0" || code === "2") {
      transcriptionLog(
        `🔇 收到 final #${recvMessageCount} code=${code} textLength=${normalized.length} ${summarizeServerRecordForLog(record)}`
      );
      if (!finalEmitted) {
        finalEmitted = true;
        // 即便 normalized 为空（old 里会走"未听清或无声音"），也发射空串，
        // 上层 controller 的 finalTranscript 赋值可以反映"静音"这一事实。
        emit({ type: "final", text: normalized });
      } else {
        transcriptionLog("🔇 final 已发射过，忽略重复 final");
      }
      resolveFinalWait();
      return;
    }

    // 其他 code（握手、心跳、未知扩展字段等）也记录一条，便于排查。
    transcriptionLog(
      `🔊 收到其他消息 #${recvMessageCount} code="${code}" ${summarizeServerRecordForLog(record)}`
    );
  };

  const formatCloseEvent = (event: TranscriptionSocketCloseEvent = {}): string => {
    const parts: string[] = [];
    if (event.code !== undefined) {
      parts.push(`code=${event.code}`);
    }
    if (event.reason !== undefined) {
      parts.push(`reason=${event.reason}`);
    }
    if (event.wasClean !== undefined) {
      parts.push(`wasClean=${event.wasClean}`);
    }
    return parts.length > 0 ? ` ${parts.join(" ")}` : "";
  };

  const sendAudioFrame = (activeSocket: TranscriptionSocket, frame: AudioFrame): void => {
    const pcmBase64 = encodePcm16ToBase64(frame.pcm);
    const payload = {
      voice_id: voiceId,
      pcm: pcmBase64,
      flag: "real_time" as const,
      language
    };
    const message = JSON.stringify(payload);
    try {
      activeSocket.send(message);
      sentFrameCount += 1;
      // 对齐 old/main.py：每 10 帧打印一次节流日志，避免每秒 10 条日志刷屏。
      if (sentFrameCount === 1 || sentFrameCount % 10 === 0) {
        transcriptionLog(
          `📤 已发送 ${sentFrameCount} 个音频包 real_time samples=${frame.pcm.length} ` +
            `base64Len=${pcmBase64.length} rms=${frame.rms.toFixed(4)} ts=${frame.timestampMs}ms`
        );
      }
    } catch (error) {
      transcriptionWarn(`⚠️ 发送音频帧 #${sentFrameCount + 1} 失败`, error);
    }
  };

  const bufferAudioFrame = (frame: AudioFrame): void => {
    if (pendingAudioFrames.length >= MAX_PENDING_AUDIO_FRAMES) {
      pendingAudioFrames.shift();
      droppedFrameCount += 1;
    }
    pendingAudioFrames.push(frame);
  };

  const flushPendingAudioFrames = (activeSocket: TranscriptionSocket): void => {
    if (pendingAudioFrames.length === 0) {
      return;
    }
    const frames = pendingAudioFrames;
    pendingAudioFrames = [];
    transcriptionLog(`📤 WS open 后补发缓冲音频帧 ${frames.length} 帧`);
    for (const frame of frames) {
      sendAudioFrame(activeSocket, frame);
    }
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input: TranscriptionStartInput) => {
      if (socket) {
        throw new Error("转写会话已在进行中");
      }
      voiceId = generateVoiceId();
      language = options.languageOverride ?? mapRecordingLanguage(input.language);
      socketOpen = false;
      lastPartialText = "";
      finalEmitted = false;
      stopping = false;
      sentFrameCount = 0;
      pendingAudioFrames = [];
      recvMessageCount = 0;
      droppedFrameCount = 0;
      lastDropWarnAt = 0;
      emptyPartialStreak = 0;
      lastPrintedPartialText = "";
      lastEmptyPartialRaw = "";

      transcriptionLog(`🚀 准备发送音频, voice_id: ${voiceId}, language: ${language}`);
      transcriptionLog(`🌐 准备发起 WS 连接: ${redactUrlForLog(url)} input.language=${input.language} sampleRate=${input.sampleRate}`);

      const activeSocket = socketFactory.connect(url);
      socket = activeSocket;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        activeSocket.onOpen(() => {
          if (settled) {
            return;
          }
          settled = true;
          socketOpen = true;
          transcriptionLog(`✅ WS连接已建立: ${redactUrlForLog(url)}`);
          flushPendingAudioFrames(activeSocket);
          emit({ type: "started" });
          resolve();
        });
        activeSocket.onError((error) => {
          transcriptionError("⚠️ WS 错误", error);
          emit({ type: "error", error });
          if (!settled) {
            settled = true;
            socket = undefined;
            socketOpen = false;
            pendingAudioFrames = [];
            reject(error);
          }
        });
        activeSocket.onMessage((message) => handleMessage(message));
        activeSocket.onClose((event) => {
          transcriptionLog(
            `🕒 WS 已关闭 voice_id=${voiceId} 已发送帧=${sentFrameCount} 已接收消息=${recvMessageCount} stopping=${stopping} finalEmitted=${finalEmitted}${formatCloseEvent(event)}`
          );
          // 非正常关闭（未 stopping，且未收到 final）→ 向上报错。
          if (stopping && socket === activeSocket) {
            emitFallbackFinal("WS 在等待 final 时已关闭");
            resolveFinalWait();
            return;
          }
          if (!stopping && socket === activeSocket) {
            socket = undefined;
            resolveFinalWait();
            if (!finalEmitted) {
              emit({ type: "error", error: new Error("WebSocket 意外关闭") });
            }
          }
        });
      });
    },
    sendAudio: (frame) => {
      if (!socket) {
        // 尚未 start 时仍只能静默丢帧，避免中断 recorder listener 链。
        droppedFrameCount += 1;
        if (droppedFrameCount === 1 || droppedFrameCount - lastDropWarnAt >= 50) {
          transcriptionWarn(`⚠️ sendAudio 调用但 socket 未创建，丢帧 累计 droppedFrameCount=${droppedFrameCount}`);
          lastDropWarnAt = droppedFrameCount;
        }
        return;
      }
      if (!socketOpen) {
        // 启动顺序是“先 recorder 后 provider”，WS 拨号期间麦克风会不断推帧。
        // connect 后、open 前 socket 已存在但底层 ws 仍可能处于 CONNECTING，此时先缓冲。
        // 不能在这里 throw，否则 recorderService 的 listener 链会被中断，造成 App.tsx
        // 里缓存 latestRms 的订阅者收不到 frame，悬浮窗音量条冻死。
        bufferAudioFrame(frame);
        return;
      }
      sendAudioFrame(socket, frame);
    },
    stop: async () => {
      const activeSocket = socket;
      if (!activeSocket) {
        transcriptionLog("🛑 stop 调用：当前无活动 socket，忽略");
        return;
      }
      stopping = true;

      // 0 帧健壮性：连一帧音频都没发过（WS 建连未完 / 录音未启动 / 快速二次 toggle），
      // 再发 finished 帧、等 60s final 完全没意义——服务端没收到任何有效音频，不会回 final。
      // 直接走 cancel 的路径：关掉 socket、emit stopped，让上层快速收尾。
      if (sentFrameCount === 0) {
        transcriptionWarn(`🛑 stop：本会话 0 帧音频（voice_id=${voiceId} recv=${recvMessageCount} dropped=${droppedFrameCount}），跳过 finished 帧与 final 等待，直接收尾`);
        resolveFinalWait();
        teardownSocket();
        emit({ type: "stopped" });
        return;
      }

      transcriptionLog(`📤 音频发送完毕，共发送 ${sentFrameCount} 个包`);

      const endPayload = {
        voice_id: voiceId,
        pcm: "",
        flag: "finished" as const,
        language
      };
      const endMessage = JSON.stringify(endPayload);
      try {
        activeSocket.send(endMessage);
        transcriptionLog("📢 已发送结束信号");
      } catch (error) {
        transcriptionWarn("⚠️ 发送 finished 帧失败（忽略，继续等待 final）", error);
      }

      // 等待服务端下发 code=0/2；超时则兜底把最近一条 partial 作为 final。
      const waitTimeoutMs =
        recvMessageCount === 0 ? noResponseFinalTimeoutMs : finalTimeoutMs;
      transcriptionLog(`⏳ 等待 final（timeout=${waitTimeoutMs}ms）…`);
      transcriptionLog(
        recvMessageCount === 0
          ? `⏳ 本次会话尚未收到任何服务端消息，等待到 ${waitTimeoutMs}ms`
          : `⏳ final 等待超时保持 ${waitTimeoutMs}ms`
      );
      await new Promise<void>((resolve) => {
        finalResolver = resolve;
        finalTimer = setTimeout(() => {
          emitFallbackFinal(`等待 final 超时 ${waitTimeoutMs}ms`);
          finalResolver = undefined;
          finalTimer = undefined;
          resolve();
        }, waitTimeoutMs);
      });

      teardownSocket();
      transcriptionLog(`📝 stop 完成 voice_id=${voiceId} 累计发送=${sentFrameCount} 累计接收=${recvMessageCount} dropped=${droppedFrameCount} finalEmitted=${finalEmitted}`);
      emit({ type: "stopped" });
    },
    cancel: async () => {
      if (!socket) {
        transcriptionLog("🛑 cancel 调用：当前无活动 socket，忽略");
        return;
      }
      transcriptionLog(`🛑 取消会话 voice_id=${voiceId} 累计发送=${sentFrameCount} 累计接收=${recvMessageCount}`);
      stopping = true;
      resolveFinalWait();
      teardownSocket();
      emit({ type: "stopped" });
    }
  };
}

function mapRecordingLanguage(lang: RecordingLanguage): DefaultTranscriptionLanguage {
  switch (lang) {
    case "auto":
    case "cantonese":
    case "mandarin":
    case "english":
    case "korean":
    case "portuguese":
    case "japanese":
    case "thai":
    case "hindi":
    case "indonesia":
      return lang;
    case "zh-CN":
      return "mandarin";
    case "en-US":
      return "english";
  }
}

function defaultGenerateVoiceId(): string {
  if (typeof globalThis !== "undefined") {
    const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }
  }
  // 退化方案：时间戳 + 随机，足够在会话级别避免冲突。
  return `asr-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * 浏览器原生 WebSocket 的 TranscriptionSocket 适配器工厂。
 * 主进程/Node 环境若要用，需另外传入基于 ws 库的 factory。
 */
export function createBrowserTranscriptionSocketFactory(
  WebSocketCtor: typeof WebSocket = WebSocket
): TranscriptionSocketFactory {
  return {
    connect: (url) => {
      const ws = new WebSocketCtor(url);
      return {
        send: (message) => ws.send(message),
        close: () => ws.close(),
        onOpen: (handler) => {
          ws.addEventListener("open", () => handler(), { once: true });
        },
        onMessage: (handler) => {
          ws.addEventListener("message", (event: MessageEvent) => {
            if (typeof event.data === "string") {
              handler(event.data);
            }
          });
        },
        onError: (handler) => {
          ws.addEventListener("error", () => {
            handler(new Error("WebSocket error"));
          });
        },
        onClose: (handler) => {
          ws.addEventListener(
            "close",
            (event: CloseEvent) =>
              handler({
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
              }),
            { once: true }
          );
        }
      };
    }
  };
}
