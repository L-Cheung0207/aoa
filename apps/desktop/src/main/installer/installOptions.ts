import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { AppSettingsPatch } from "@voice/shared";
import type { ConfigStore } from "../config/configStore";

export interface PendingInstallOptionsPathInput {
  isPackaged: boolean;
  appPath: string;
  resourcesPath: string;
}

export interface ApplyPendingInstallOptionsInput {
  installOptionsPath: string;
  configStore: Pick<ConfigStore, "update">;
  existsSync?: (path: string) => boolean;
  readFileSync?: (path: string, encoding: BufferEncoding) => string;
  unlinkSync?: (path: string) => void;
}

export function resolvePendingInstallOptionsPath(
  input: PendingInstallOptionsPathInput,
): string {
  return input.isPackaged
    ? join(input.resourcesPath, "install-options.json")
    : join(input.appPath, "resources", "install-options.json");
}

export function parsePendingInstallOptions(
  text: string,
): AppSettingsPatch | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || !isRecord(parsed.appBehavior)) {
    return undefined;
  }

  const launchAtLogin = parsed.appBehavior.launchAtLogin;
  if (typeof launchAtLogin !== "boolean") {
    return undefined;
  }

  return {
    appBehavior: {
      launchAtLogin,
    },
  };
}

export function applyPendingInstallOptions(
  input: ApplyPendingInstallOptionsInput,
): boolean {
  const fileExists = input.existsSync ?? existsSync;
  const readFile = input.readFileSync ?? readFileSync;
  const unlinkFile = input.unlinkSync ?? unlinkSync;

  if (!fileExists(input.installOptionsPath)) {
    return false;
  }

  const patch = parsePendingInstallOptions(
    readFile(input.installOptionsPath, "utf8"),
  );
  if (!patch) {
    unlinkFile(input.installOptionsPath);
    return false;
  }

  input.configStore.update(patch);
  unlinkFile(input.installOptionsPath);
  return true;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
