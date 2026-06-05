import { readFile } from "node:fs/promises";
import { join } from "node:path";

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
