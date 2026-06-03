import { randomUUID } from "node:crypto";
import type { ConfigStorageAdapter } from "../config/configStore";

export const INSTALLATION_ID_KEY = "installationId";

export interface GetOrCreateInstallationIdOptions {
  adapter: ConfigStorageAdapter;
  /** 可注入的 id 生成器，便于测试 */
  generate?: () => string;
}

/**
 * 读取或创建匿名安装标识，保证重启后一致。
 */
export function getOrCreateInstallationId(
  options: GetOrCreateInstallationIdOptions
): string {
  const existing = options.adapter.get(INSTALLATION_ID_KEY);
  if (typeof existing === "string" && existing.length > 0) {
    return existing;
  }

  const generate = options.generate ?? randomUUID;
  const generated = generate();
  options.adapter.set(INSTALLATION_ID_KEY, generated);
  return generated;
}
