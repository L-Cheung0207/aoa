import WebSocket from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { WsServerConfig } from "@voice/shared";

export interface ConnectivityTestResult {
  ok: boolean;
  message: string;
  elapsedMs?: number;
}

const WS_TEST_TIMEOUT_MS = 5_000;

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
): Promise<ConnectivityTestResult> {
  const url = (config.url ?? "").trim();
  if (!url) {
    return { ok: false, message: "WS URL is empty" };
  }

  const proxyUrl = buildProxyUrl(config);
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  const startedAt = Date.now();
  return await new Promise<ConnectivityTestResult>((resolve) => {
    let ws: WebSocket;
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
      resolve(result);
    };

    try {
      ws = new WebSocket(url, {
        agent,
        rejectUnauthorized: false,
        handshakeTimeout: WS_TEST_TIMEOUT_MS,
      } as WebSocket.ClientOptions);
    } catch (error) {
      resolve({
        ok: false,
        message: `WS initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      });
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
