import WebSocket, { type ClientOptions } from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import {
  createDefaultTranscriptionProvider,
  type TranscriptionSocket,
  type TranscriptionSocketCloseEvent,
  type TranscriptionSocketFactory,
  type TranscriptionEvent,
  type TranscriptionProvider,
  type TranscriptionStartInput
} from "@voice/ai";
import type { AppSettings, AudioFrame, WsServerConfig } from "@voice/shared";

/**
 * stop() 的返回值。带上本次会话收到的最终文本，便于 renderer 在「voice:transcription-event」
 * 事件通道与 invoke reply 通道之间发生竞态时做补偿（renderer 收到 stop reply 但 final event
 * 还未派发的情况）。
 */
export interface TranscriptionStopResult {
  finalText?: string;
}

export interface MainTranscriptionService {
  subscribe(listener: (event: TranscriptionEvent) => void): () => void;
  start(input: TranscriptionStartInput): Promise<void>;
  sendAudio(frame: AudioFrame): void;
  stop(): Promise<TranscriptionStopResult>;
  cancel(): Promise<void>;
}

export interface CreateMainTranscriptionServiceOptions {
  getSettings(): Pick<AppSettings, "ws">;
  createProvider?: (server: WsServerConfig) => TranscriptionProvider;
}

interface ActiveProvider {
  provider: TranscriptionProvider;
  unsubscribe: () => void;
}

export function createMainTranscriptionService(
  options: CreateMainTranscriptionServiceOptions
): MainTranscriptionService {
  const listeners = new Set<(event: TranscriptionEvent) => void>();
  let activeProvider: ActiveProvider | undefined;
  /** 本次会话最近一次 final 文本，stop() 会把它作为返回值给 renderer 做竞态兜底。 */
  let lastFinalText: string | undefined;

  const emit = (event: TranscriptionEvent): void => {
    if (event.type === "final") {
      lastFinalText = event.text;
    }
    for (const listener of listeners) {
      listener(event);
    }
  };

  const cleanup = (provider?: TranscriptionProvider): void => {
    if (provider && activeProvider?.provider !== provider) {
      return;
    }
    activeProvider?.unsubscribe();
    activeProvider = undefined;
  };

  return {
    subscribe: (listener: (event: TranscriptionEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input: TranscriptionStartInput) => {
      if (activeProvider) {
        throw new Error("Transcription session is already active");
      }
      lastFinalText = undefined;

      const wsSettings = options.getSettings().ws;
      const selectedServer = resolveSelectedWsServer(wsSettings);
      const selectedUrl = selectedServer?.url.trim();
      if (!selectedServer || !selectedUrl) {
        throw new Error("No WS server configured");
      }
      console.log(
        `[asr-main] request params url=${redactWsUrl(selectedUrl)} ` +
          `language=${input.language} sampleRate=${input.sampleRate} ` +
          `selectedIndex=${wsSettings.selectedIndex} ` +
          `proxy=${describeProxy(selectedServer, buildProxyUrl(selectedServer))}`
      );

      const provider =
        options.createProvider?.(selectedServer) ??
        createDefaultTranscriptionProvider({
          url: selectedUrl,
          socketFactory: createNodeTranscriptionSocketFactory(selectedServer)
        });
      activeProvider = {
        provider,
        unsubscribe: provider.subscribe((event: TranscriptionEvent) => {
          emit(event);
          if (event.type === "stopped") {
            cleanup(provider);
          }
          if (event.type === "error") {
            cleanup(provider);
            void provider.cancel().catch((error) => {
              console.warn("[asr-main] cancel after provider error failed", error);
            });
          }
        })
      };

      try {
        await provider.start(input);
      } catch (error) {
        cleanup(provider);
        throw error;
      }
    },
    sendAudio: (frame: AudioFrame) => {
      activeProvider?.provider.sendAudio(frame);
    },
    stop: async () => {
      const provider = activeProvider?.provider;
      if (!provider) {
        return {};
      }
      try {
        await provider.stop();
      } finally {
        cleanup();
      }
      return lastFinalText !== undefined ? { finalText: lastFinalText } : {};
    },
    cancel: async () => {
      const provider = activeProvider?.provider;
      if (!provider) {
        return;
      }
      try {
        await provider.cancel();
      } finally {
        cleanup();
      }
    }
  };
}

interface NodeWebSocketLike {
  send(message: string): void;
  close(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  once(event: string, handler: (...args: unknown[]) => void): void;
}

type NodeWebSocketConstructor = new (
  url: string,
  options: ClientOptions
) => NodeWebSocketLike;

export interface CreateNodeTranscriptionSocketFactoryOptions {
  WebSocketConstructor?: NodeWebSocketConstructor;
}

export function createNodeTranscriptionSocketFactory(
  server: WsServerConfig,
  options: CreateNodeTranscriptionSocketFactoryOptions = {}
): TranscriptionSocketFactory {
  const WebSocketConstructor =
    options.WebSocketConstructor ?? (WebSocket as unknown as NodeWebSocketConstructor);
  const proxyUrl = buildProxyUrl(server);
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  const proxySummary = describeProxy(server, proxyUrl);

  return {
    connect: (url: string) => {
      const startedAt = Date.now();
      console.log(
        `[asr-main] connect url=${redactWsUrl(url)} proxy=${proxySummary} agent=${agent ? "enabled" : "disabled"}`
      );
      const ws = new WebSocketConstructor(url, {
        ...(agent ? { agent } : {}),
        rejectUnauthorized: false,
        handshakeTimeout: 5_000
      } as ClientOptions);
      return createNodeTranscriptionSocket(ws, { url, proxySummary, startedAt });
    }
  };
}

interface NodeTranscriptionSocketDiagnostics {
  url: string;
  proxySummary: string;
  startedAt: number;
}

function createNodeTranscriptionSocket(
  ws: NodeWebSocketLike,
  diagnostics?: NodeTranscriptionSocketDiagnostics
): TranscriptionSocket {
  return {
    send: (message: string) => ws.send(message),
    close: () => ws.close(),
    onOpen: (handler: () => void) => {
      ws.once("open", () => {
        if (diagnostics) {
          console.log(
            `[asr-main] open url=${redactWsUrl(diagnostics.url)} proxy=${diagnostics.proxySummary} elapsedMs=${Date.now() - diagnostics.startedAt}`
          );
        }
        handler();
      });
    },
    onMessage: (handler: (message: string) => void) => {
      ws.on("message", (data) => {
        if (typeof data === "string") {
          logIncomingMessage(data);
          handler(data);
          return;
        }
        if (data instanceof Buffer) {
          const message = data.toString("utf8");
          logIncomingMessage(message);
          handler(message);
          return;
        }
        const message = String(data);
        logIncomingMessage(message);
        handler(message);
      });
    },
    onError: (handler: (error: Error) => void) => {
      ws.on("error", (error) => {
        const normalized = error instanceof Error ? error : new Error(String(error));
        if (diagnostics) {
          console.warn(
            `[asr-main] error url=${redactWsUrl(diagnostics.url)} proxy=${diagnostics.proxySummary} message=${normalized.message}`
          );
        }
        handler(normalized);
      });
    },
    onClose: (handler: (event: TranscriptionSocketCloseEvent) => void) => {
      ws.once("close", (code, reason) => {
        if (diagnostics) {
          console.log(
            `[asr-main] close url=${redactWsUrl(diagnostics.url)} proxy=${diagnostics.proxySummary} ${formatCloseEventForLog(code, reason)}`
          );
        }
        handler(formatNodeCloseEvent(code, reason));
      });
    }
  };
}

function logIncomingMessage(message: string): void {
  console.log(`[asr-main] raw message len=${message.length} preview=${previewLogText(message, 160)}`);
}

function formatNodeCloseEvent(code: unknown, reason: unknown): TranscriptionSocketCloseEvent {
  const event: TranscriptionSocketCloseEvent = {};
  if (typeof code === "number") {
    event.code = code;
  }
  const formattedReason = formatCloseReason(reason);
  if (formattedReason !== undefined) {
    event.reason = formattedReason;
  }
  return event;
}

function formatCloseReason(reason: unknown): string | undefined {
  if (reason === undefined || reason === null) {
    return undefined;
  }
  if (typeof reason === "string") {
    return reason;
  }
  if (reason instanceof Buffer) {
    return reason.toString("utf8");
  }
  return String(reason);
}

function formatCloseEventForLog(code: unknown, reason: unknown): string {
  const parts: string[] = [];
  if (typeof code === "number") {
    parts.push(`code=${code}`);
  }
  const formattedReason = formatCloseReason(reason);
  if (formattedReason !== undefined) {
    parts.push(`reason=${previewLogText(formattedReason, 80)}`);
  }
  return parts.length > 0 ? parts.join(" ") : "code=unknown";
}

function describeProxy(
  server: Pick<WsServerConfig, "proxy" | "proxyUsername">,
  proxyUrl: string | undefined
): string {
  if (!proxyUrl) {
    return "none";
  }
  try {
    const parsed = new URL(proxyUrl);
    const authSource = (server.proxyUsername ?? "").trim() || parsed.username;
    return `${parsed.protocol}//${parsed.host} auth=${authSource ? "yes" : "no"}`;
  } catch {
    return "configured";
  }
}

function redactWsUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("AccessCode")) {
      parsed.searchParams.set("AccessCode", "***");
    }
    return parsed.toString();
  } catch {
    return url.replace(/(AccessCode=)[^&\s]+/i, "$1***");
  }
}

function previewLogText(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, " ");
  return compact.length <= limit ? compact : `${compact.slice(0, limit)}...`;
}

function resolveSelectedWsServer(
  wsSettings: AppSettings["ws"]
): WsServerConfig | undefined {
  if (wsSettings.servers.length === 0) {
    return undefined;
  }
  const index = clampIndex(wsSettings.selectedIndex, wsSettings.servers.length);
  return wsSettings.servers[index];
}

function buildProxyUrl(config: {
  proxy?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}): string | undefined {
  const raw = (config.proxy ?? "").trim();
  if (!raw) {
    return undefined;
  }
  const prefixed = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  const user = (config.proxyUsername ?? "").trim();
  const pass = (config.proxyPassword ?? "").trim();
  if (!user && !pass) {
    return prefixed;
  }
  try {
    const parsed = new URL(prefixed);
    parsed.username = encodeURIComponent(user);
    parsed.password = encodeURIComponent(pass);
    return parsed.toString();
  } catch {
    return prefixed;
  }
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value >= length) {
    return length - 1;
  }
  return Math.floor(value);
}
