import { JAVA_VOICE_WS_URL } from "@voice/shared";

export interface RendererAppConfig {
  javaVoiceWsUrl: string;
}

export async function loadRendererAppConfig(
  fetchConfig: typeof fetch = fetch,
  loadExternalConfig: () => Promise<unknown> = () => window.voiceAI.getAppConfig(),
): Promise<RendererAppConfig> {
  try {
    return normalizeRendererAppConfig(await loadExternalConfig());
  } catch (error) {
    console.warn("[config] external config.json load failed; trying bundled config", error);
  }

  try {
    const response = await fetchConfig("/config.json", { cache: "no-store" });
    if (!response.ok) {
      console.warn(
        `[config] config.json load failed status=${response.status}; using defaults`,
      );
      return createDefaultRendererAppConfig();
    }

    return normalizeRendererAppConfig(await response.json());
  } catch (error) {
    console.warn("[config] config.json load failed; using defaults", error);
    return createDefaultRendererAppConfig();
  }
}

export function createDefaultRendererAppConfig(): RendererAppConfig {
  return {
    javaVoiceWsUrl: JAVA_VOICE_WS_URL,
  };
}

function normalizeRendererAppConfig(input: unknown): RendererAppConfig {
  if (!isRecord(input)) {
    return createDefaultRendererAppConfig();
  }

  return {
    javaVoiceWsUrl:
      typeof input.javaVoiceWsUrl === "string" && input.javaVoiceWsUrl.trim()
        ? input.javaVoiceWsUrl.trim()
        : JAVA_VOICE_WS_URL,
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
