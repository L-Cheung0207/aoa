export type VoiceServiceSelection =
  | {
      kind: "java";
      url: string;
      reason: "standard" | "developer-unified-endpoint";
    }
  | {
      kind: "developer";
      reason: "developer-legacy-endpoint";
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

  if (isJavaVoiceUnifiedEndpoint(developerWsUrl)) {
    return {
      kind: "java",
      url: developerWsUrl,
      reason: "developer-unified-endpoint",
    };
  }

  return {
    kind: "developer",
    reason: "developer-legacy-endpoint",
  };
}

export function isJavaVoiceUnifiedEndpoint(url: string): boolean {
  const pathname = getNormalizedPathname(url);
  return pathname.endsWith("/voice");
}

function getNormalizedPathname(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return normalizePathname(new URL(trimmed).pathname);
  } catch {
    const withoutQuery = trimmed.split(/[?#]/, 1)[0] ?? "";
    return normalizePathname(withoutQuery);
  }
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, "").toLowerCase();
}
