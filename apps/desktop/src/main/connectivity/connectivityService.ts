import WebSocket from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { WsServerConfig } from "@voice/shared";
import { formatLogFields, sanitizeUrlForLog } from "../log/logSanitizer";

export interface ConnectivityTestResult {
  ok: boolean;
  message: string;
  elapsedMs?: number;
}

const WS_TEST_TIMEOUT_MS = 5_000;

interface ConnectivityLogger {
  log(message: string): void;
  warn(message: string): void;
}

interface ConnectivitySocket {
  once(event: "open", listener: () => void): unknown;
  once(event: "error", listener: (error: Error) => void): unknown;
  terminate(): void;
}

export interface TestWebSocketOptions {
  logger?: ConnectivityLogger;
  createWebSocket?: (
    url: string,
    options: WebSocket.ClientOptions,
  ) => ConnectivitySocket;
}

function buildProxyUrl(cfg: {
  proxy?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}): string | undefined {
  const raw = (cfg.proxy ?? "").trim();
  if (!raw) {
    return undefined;
  }

  const prefixed =
    raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `http://${raw}`;
  const user = (cfg.proxyUsername ?? "").trim();
  const pass = (cfg.proxyPassword ?? "").trim();
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

export async function testWebSocket(
  config: WsServerConfig,
  options: TestWebSocketOptions = {},
): Promise<ConnectivityTestResult> {
  const logger = options.logger ?? console;
  const createWebSocket =
    options.createWebSocket ??
    ((targetUrl: string, socketOptions: WebSocket.ClientOptions) =>
      new WebSocket(targetUrl, socketOptions));
  const url = (config.url ?? "").trim();
  if (!url) {
    return finishConnectivityTest(logger, {
      ok: false,
      message: "WS URL is empty",
    });
  }

  const proxyUrl = buildProxyUrl(config);
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  logger.log(
    `[connectivity] websocket test start ${formatLogFields({
      url,
      proxy: proxyUrl ? redactProxyUrlForLog(proxyUrl) : "none",
      agent: agent ? "enabled" : "disabled",
    })}`,
  );

  const startedAt = Date.now();
  return await new Promise<ConnectivityTestResult>((resolve) => {
    let ws: ConnectivitySocket;
    let settled = false;
    const finish = (result: ConnectivityTestResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
      logConnectivityTestResult(logger, result);
      resolve(result);
    };

    try {
      ws = createWebSocket(url, {
        agent,
        rejectUnauthorized: false,
        handshakeTimeout: WS_TEST_TIMEOUT_MS,
      });
    } catch (error) {
      const result = {
        ok: false,
        message: `WS initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      };
      logConnectivityTestResult(logger, result);
      resolve(result);
      return;
    }

    const timer = setTimeout(() => {
      finish({ ok: false, message: "WS connection timed out after 5s" });
    }, WS_TEST_TIMEOUT_MS);

    ws.once("open", () => {
      finish({
        ok: true,
        message: "WS connection succeeded",
        elapsedMs: Date.now() - startedAt,
      });
    });

    ws.once("error", (error: Error) => {
      finish({ ok: false, message: error.message || "WS connection error" });
    });
  });
}

function finishConnectivityTest(
  logger: ConnectivityLogger,
  result: ConnectivityTestResult,
): ConnectivityTestResult {
  logConnectivityTestResult(logger, result);
  return result;
}

function logConnectivityTestResult(
  logger: ConnectivityLogger,
  result: ConnectivityTestResult,
): void {
  if (result.ok) {
    logger.log(
      `[connectivity] websocket test result ${formatLogFields({
        status: "ok",
        elapsedMs: result.elapsedMs,
      })}`,
    );
    return;
  }
  logger.warn(
    `[connectivity] websocket test result ${formatLogFields({
      status: "error",
      error: result.message,
    })}`,
  );
}

function redactProxyUrlForLog(input: string): string {
  try {
    const parsed = new URL(input);
    if (parsed.password) {
      parsed.password = "***";
    }
    return sanitizeUrlForLog(parsed.toString());
  } catch {
    return sanitizeUrlForLog(input).replace(/(:)[^:@\s]+(@)/, "$1***$2");
  }
}
