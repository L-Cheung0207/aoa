import { existsSync, readFileSync } from "node:fs";

export function applyLocalEnvFiles(
  paths: readonly string[],
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const loadedKeys: string[] = [];
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }
    const content = readFileSync(path, "utf8");
    for (const [key, value] of parseEnvContent(content)) {
      if (env[key] !== undefined) {
        continue;
      }
      env[key] = value;
      loadedKeys.push(key);
    }
  }
  return loadedKeys;
}

function parseEnvContent(content: string): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unwrapEnvValue(trimmed.slice(separatorIndex + 1).trim());
    if (!key) {
      continue;
    }
    entries.push([key, value]);
  }
  return entries;
}

function unwrapEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
