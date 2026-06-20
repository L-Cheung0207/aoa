import {
  BUNDLED_ASR_WS_URL,
  type AppSettings,
  type WsServerConfig,
} from "@voice/shared";

export interface EditableConnectionSettings {
  wsUrl: string;
  wsProxy: string;
  wsProxyUsername: string;
  wsProxyPassword: string;
}

export function readConnectionSettings(
  settings: AppSettings,
): EditableConnectionSettings {
  const ws = getPrimaryWsServer(settings);

  return {
    wsUrl: ws?.url ?? BUNDLED_ASR_WS_URL,
    wsProxy: ws?.proxy ?? "",
    wsProxyUsername: ws?.proxyUsername ?? "",
    wsProxyPassword: ws?.proxyPassword ?? "",
  };
}

export function patchConnectionSettings(
  settings: AppSettings,
  patch: Partial<EditableConnectionSettings>,
): AppSettings {
  return applyConnectionSettings(settings, {
    ...readConnectionSettings(settings),
    ...patch,
  });
}

export function applyConnectionSettings(
  settings: AppSettings,
  connection: EditableConnectionSettings,
): AppSettings {
  return {
    ...settings,
    ws: {
      servers: [buildApiServer(connection)],
      selectedIndex: 0,
    },
  };
}

export function normalizeConnectionSettings(
  settings: AppSettings,
): AppSettings {
  return applyConnectionSettings(settings, readConnectionSettings(settings));
}

export function getPrimaryWsServer(
  settings: AppSettings,
): WsServerConfig | undefined {
  if (settings.ws.servers.length === 0) {
    return undefined;
  }
  const index = clampIndex(
    settings.ws.selectedIndex,
    settings.ws.servers.length,
  );
  return settings.ws.servers[index];
}

export function validateConnectionSettings(
  settings: AppSettings,
): string | undefined {
  if (!settings.developer.enabled) {
    return undefined;
  }
  const connection = readConnectionSettings(settings);
  if (!connection.wsUrl.trim()) {
    return "WebSocket 地址不能为空";
  }
  return undefined;
}

function buildApiServer(connection: EditableConnectionSettings): WsServerConfig {
  const server: WsServerConfig = {
    url: connection.wsUrl.trim(),
  };
  addOptionalString(server, "proxy", connection.wsProxy);
  addOptionalString(server, "proxyUsername", connection.wsProxyUsername);
  addOptionalString(server, "proxyPassword", connection.wsProxyPassword);
  return server;
}

function addOptionalString(
  target: {
    proxy?: string;
    proxyUsername?: string;
    proxyPassword?: string;
  },
  key: "proxy" | "proxyUsername" | "proxyPassword",
  value: string,
): void {
  const trimmed = value.trim();
  if (trimmed) {
    target[key] = trimmed;
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
