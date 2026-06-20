export type VoiceServiceSelection =
  | {
      kind: "developer";
      reason: "developer-legacy-endpoint";
    }
  | {
      kind: "java";
      url: string;
      reason: "standard" | "developer-unified-endpoint";
    };

export interface SelectVoiceServiceInput {
  developerEnabled: boolean;
  javaVoiceWsUrl: string;
  developerWsUrl: string | undefined;
}

export function selectVoiceService(
  input: SelectVoiceServiceInput,
): VoiceServiceSelection {
  const javaVoiceWsUrl = input.javaVoiceWsUrl.trim();
  const developerWsUrl = input.developerWsUrl?.trim() ?? "";

  if (!input.developerEnabled) {
    return {
      kind: "java",
      url: javaVoiceWsUrl,
      reason: "standard",
    };
  }

  if (developerWsUrl) {
    if (!isJavaVoiceUnifiedEndpoint(developerWsUrl)) {
      return {
        kind: "developer",
        reason: "developer-legacy-endpoint",
      };
    }
    return {
      kind: "java",
      url: developerWsUrl,
      reason: "developer-unified-endpoint",
    };
  }

  return {
    kind: "java",
    url: javaVoiceWsUrl,
    reason: "standard",
  };
}

export function isJavaVoiceUnifiedEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.pathname.replace(/\/+$/, "").endsWith("/aoa_api/voice");
  } catch {
    return false;
  }
}
