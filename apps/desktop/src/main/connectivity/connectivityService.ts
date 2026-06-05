import WebSocket from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ProxyAgent, Agent, fetch as undiciFetch } from "undici";
import type { LlmModelConfig, WsServerConfig } from "@voice/shared";
import { logHttpRequest } from "../log/requestLog";

/**
 * 連通性測試結果。對齊 old SettingsDialog 的「成功 / 失敗 + 文案」返回形態。
 * - ok=true  時 message 用於成功提示
 * - ok=false 時 message 帶上根因（超時 / 4xx / 網路錯誤 等）
 */
export interface ConnectivityTestResult {
  ok: boolean;
  message: string;
  /** 可選的耗時（毫秒），便於在 UI 上展示「連線成功 120ms」。 */
  elapsedMs?: number;
}

const WS_TEST_TIMEOUT_MS = 5_000;
const LLM_TEST_TIMEOUT_MS = 30_000;
const AOSO_VOICE_PATH = "/aoa_api/voice";

/**
 * 將 old/main.py 裡 `_get_ws_proxy_kwargs` 的行為對齊到 Node：
 * 代理字串自動補 http:// 字首，可選使用者名稱密碼合併進 URL 做 Basic Auth。
 * 返回規範化後的代理 URL；若未配置代理返回 undefined。
 */
function buildProxyUrl(cfg: {
  proxy?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}): string | undefined {
  const raw = (cfg.proxy ?? "").trim();
  if (!raw) {
    return undefined;
  }
  const prefixed = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
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
    // URL 解析失敗時降級直接返回（讓底層庫自己報錯）
    return prefixed;
  }
}

/**
 * WS 連通性測試：對齊 old/main.py `_sync_test`。
 * 開啟 WebSocket，拿到 open 事件即算成功；5 秒超時判失敗。支援 HTTP 代理 + Basic Auth。
 */
export async function testWebSocket(config: WsServerConfig): Promise<ConnectivityTestResult> {
  const url = (config.url ?? "").trim();
  if (!url) {
    return { ok: false, message: "WS URL 為空" };
  }

  const proxyUrl = buildProxyUrl(config);
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  const startedAt = Date.now();
  return await new Promise<ConnectivityTestResult>((resolve) => {
    let settled = false;
    const finish = (result: ConnectivityTestResult): void => {
      if (settled) return;
      settled = true;
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, {
        agent,
        // 與 old 的 httpx verify=False 對齊，允許自簽名 TLS
        rejectUnauthorized: false,
        handshakeTimeout: WS_TEST_TIMEOUT_MS
      } as WebSocket.ClientOptions);
    } catch (error) {
      resolve({
        ok: false,
        message: `WS 初始化失敗：${error instanceof Error ? error.message : String(error)}`
      });
      return;
    }

    const timer = setTimeout(() => {
      finish({ ok: false, message: "連線超時（>5s）" });
    }, WS_TEST_TIMEOUT_MS);

    ws.once("open", () => {
      clearTimeout(timer);
      finish({ ok: true, message: "WS 連線成功", elapsedMs: Date.now() - startedAt });
    });

    ws.once("error", (error: Error) => {
      clearTimeout(timer);
      finish({ ok: false, message: error.message || "WS 連線錯誤" });
    });
  });
}

function buildAosoUrl(baseUrl: string, path: string): string {
  let base = baseUrl.trim();
  if (base.endsWith("/")) base = base.slice(0, -1);
  return `${base}${path}`;
}

/**
 * 後處理 API 連通性測試：按 AOSO 文件向 /aoa_api/voice 傳送最小請求，
 * 拿到 rewritten_text 即判定成功。支援 HTTP 代理 + Basic Auth + 忽略自籤 TLS。
 */
export async function testLlm(config: LlmModelConfig): Promise<ConnectivityTestResult> {
  const baseUrl = (config.baseUrl ?? "").trim();
  const modelName = (config.modelName ?? "").trim() || "AOSO API";
  if (!baseUrl) {
    return { ok: false, message: "後處理 API 配置不完整：baseUrl 必填" };
  }

  const url = buildAosoUrl(baseUrl, AOSO_VOICE_PATH);
  const body = {
    text: "連線測試",
    stream: false
  };
  const proxyUrl = buildProxyUrl(config);
  // undici 允許通過 dispatcher 同時指定代理 + 忽略 TLS 校驗
  const dispatcher = proxyUrl
    ? new ProxyAgent({
        uri: proxyUrl,
        requestTls: { rejectUnauthorized: false }
      })
    : new Agent({ connect: { rejectUnauthorized: false } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    logHttpRequest(url, body);
    const response = await undiciFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      dispatcher
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      return {
        ok: false,
        message: `後處理 API HTTP ${response.status}: ${truncate(text, 200)}`
      };
    }
    // 解析 JSON 以確認確實是 AOSO rewrite 介面。
    try {
      const payload = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        typeof (payload as { rewritten_text?: unknown }).rewritten_text !== "string"
      ) {
        return { ok: false, message: "後處理 API 響應缺少 rewritten_text 欄位" };
      }
    } catch (error) {
      return {
        ok: false,
        message: `後處理 API 響應解析失敗：${error instanceof Error ? error.message : String(error)}`
      };
    }
    return {
      ok: true,
      message: `後處理 API (${modelName}) 連線成功`,
      elapsedMs: Date.now() - startedAt
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, message: `後處理 API 請求超時（>${LLM_TEST_TIMEOUT_MS / 1000}s）` };
    }
    return {
      ok: false,
      message: `後處理 API 請求異常：${error instanceof Error ? error.message : String(error)}`
    };
  } finally {
    clearTimeout(timer);
  }
}

async function safeReadText(response: { text: () => Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
