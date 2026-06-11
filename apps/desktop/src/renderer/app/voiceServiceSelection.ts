export type VoiceServiceSelection =
  {
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

