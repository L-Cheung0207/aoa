import {
  JAVA_VOICE_WS_URL,
  type AppSettings,
  type WsServerConfig,
} from "@voice/shared";

export interface EditableConnectionSettings {
  apiUrl: string;
}

export function readConnectionSettings(
  settings: AppSettings,
): EditableConnectionSettings {
  const ws = getPrimaryWsServer(settings);
  const url = ws?.url?.trim();

  return {
    apiUrl: url || JAVA_VOICE_WS_URL,
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
  if (!connection.apiUrl.trim()) {
    return "API地址不能为空";
  }
  return undefined;
}

function buildApiServer(connection: EditableConnectionSettings): WsServerConfig {
  return { url: connection.apiUrl.trim() || JAVA_VOICE_WS_URL };
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
