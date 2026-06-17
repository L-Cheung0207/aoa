import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface MainAppConfig {
  backendBaseUrl?: string | undefined;
  javaVoiceWsUrl?: string | undefined;
  versionCheckUrl?: string | undefined;
}

export interface ResolveAppConfigPathOptions {
  isPackaged: boolean;
  appPath: string;
  resourcesPath: string;
}

export function resolveAppConfigPath(options: ResolveAppConfigPathOptions): string {
  if (options.isPackaged) {
    return join(options.resourcesPath, "config.json");
  }

  return join(options.appPath, "src", "renderer", "public", "config.json");
}

export async function readAppConfig(configPath: string): Promise<unknown> {
  return JSON.parse(await readFile(configPath, "utf8"));
}

export async function readMainAppConfig(
  configPath: string,
  logger: Pick<Console, "warn"> = console
): Promise<MainAppConfig> {
  try {
    return normalizeMainAppConfig(await readAppConfig(configPath));
  } catch (error) {
    logger.warn("[config] app config load failed; using defaults", error);
    return {};
  }
}

export function normalizeMainAppConfig(input: unknown): MainAppConfig {
  if (!isRecord(input)) {
    return {};
  }

  const config: MainAppConfig = {};
  setOptionalConfigString(config, "backendBaseUrl", input.backendBaseUrl);
  setOptionalConfigString(config, "javaVoiceWsUrl", input.javaVoiceWsUrl);
  setOptionalConfigString(config, "versionCheckUrl", input.versionCheckUrl);
  return config;
}

function setOptionalConfigString<Key extends keyof MainAppConfig>(
  config: MainAppConfig,
  key: Key,
  value: unknown
): void {
  if (typeof value !== "string") {
    return;
  }
  const normalized = value.trim();
  if (normalized) {
    config[key] = normalized;
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
