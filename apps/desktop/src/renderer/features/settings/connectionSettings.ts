import {
  AOSO_HTTP_BASE_URL,
  BUNDLED_ASR_WS_URL,
  type AppSettings,
  type LlmModelConfig,
  type WsServerConfig
} from "@voice/shared";

export interface EditableConnectionSettings {
  wsUrl: string;
  wsProxy: string;
  wsProxyUsername: string;
  wsProxyPassword: string;
  llmBaseUrl: string;
  llmModelName: string;
  llmProxy: string;
  llmProxyUsername: string;
  llmProxyPassword: string;
}

export function readConnectionSettings(settings: AppSettings): EditableConnectionSettings {
  const ws = getPrimaryWsServer(settings);
  const llm = getPrimaryLlmModel(settings);

  return {
    wsUrl: ws?.url ?? BUNDLED_ASR_WS_URL,
    wsProxy: ws?.proxy ?? "",
    wsProxyUsername: ws?.proxyUsername ?? "",
    wsProxyPassword: ws?.proxyPassword ?? "",
    llmBaseUrl: llm?.baseUrl ?? AOSO_HTTP_BASE_URL,
    llmModelName: llm?.modelName ?? "AOSO API",
    llmProxy: llm?.proxy ?? "",
    llmProxyUsername: llm?.proxyUsername ?? "",
    llmProxyPassword: llm?.proxyPassword ?? ""
  };
}

export function patchConnectionSettings(
  settings: AppSettings,
  patch: Partial<EditableConnectionSettings>
): AppSettings {
  return applyConnectionSettings(settings, {
    ...readConnectionSettings(settings),
    ...patch
  });
}

export function applyConnectionSettings(
  settings: AppSettings,
  connection: EditableConnectionSettings
): AppSettings {
  return {
    ...settings,
    ws: {
      servers: [buildWsServer(connection)],
      selectedIndex: 0
    },
    llm: {
      models: [buildLlmModel(connection)],
      selectedIndex: 0
    }
  };
}

export function normalizeConnectionSettings(settings: AppSettings): AppSettings {
  return applyConnectionSettings(settings, readConnectionSettings(settings));
}

export function getPrimaryWsServer(settings: AppSettings): WsServerConfig | undefined {
  if (settings.ws.servers.length === 0) {
    return undefined;
  }
  const index = clampIndex(settings.ws.selectedIndex, settings.ws.servers.length);
  return settings.ws.servers[index];
}

export function getPrimaryLlmModel(settings: AppSettings): LlmModelConfig | undefined {
  if (settings.llm.models.length === 0) {
    return undefined;
  }
  const index = clampIndex(settings.llm.selectedIndex, settings.llm.models.length);
  return settings.llm.models[index];
}

export function validateConnectionSettings(settings: AppSettings): string | undefined {
  const connection = readConnectionSettings(settings);
  if (!connection.wsUrl.trim()) {
    return "WebSocket 地址不能為空";
  }
  if (!connection.llmBaseUrl.trim()) {
    return "後處理 API 地址不能為空";
  }
  return undefined;
}

function buildWsServer(connection: EditableConnectionSettings): WsServerConfig {
  const config: WsServerConfig = { url: connection.wsUrl.trim() };
  applyOptionalProxyFields(config, connection.wsProxy, connection.wsProxyUsername, connection.wsProxyPassword);
  return config;
}

function buildLlmModel(connection: EditableConnectionSettings): LlmModelConfig {
  const config: LlmModelConfig = {
    baseUrl: connection.llmBaseUrl.trim(),
    apiKey: "unused",
    modelName: connection.llmModelName.trim() || "AOSO API"
  };
  applyOptionalProxyFields(
    config,
    connection.llmProxy,
    connection.llmProxyUsername,
    connection.llmProxyPassword
  );
  return config;
}

function applyOptionalProxyFields(
  config: WsServerConfig | LlmModelConfig,
  proxy: string,
  proxyUsername: string,
  proxyPassword: string
): void {
  const trimmedProxy = proxy.trim();
  if (trimmedProxy) {
    config.proxy = trimmedProxy;
  }
  const trimmedUsername = proxyUsername.trim();
  if (trimmedUsername) {
    config.proxyUsername = trimmedUsername;
  }
  const trimmedPassword = proxyPassword.trim();
  if (trimmedPassword) {
    config.proxyPassword = trimmedPassword;
  }
}

function clampIndex(value: number, length: number): number {
  if (length === 0) {
    return -1;
  }
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value >= length) {
    return length - 1;
  }
  return Math.floor(value);
}
