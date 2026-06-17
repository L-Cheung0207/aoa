import { existsSync as defaultExistsSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

interface ResolveAppIconPathOptions {
  appPath: string;
  existsSync?: (path: string) => boolean;
  isPackaged: boolean;
  resourcesPath?: string;
}

const APP_ICON_FILE_NAME = "app-icon.ico";

export function resolveRuntimeAppIconPath(): string {
  return resolveAppIconPath({
    appPath: app.getAppPath(),
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
  });
}

export function resolveAppIconPath(options: ResolveAppIconPathOptions): string {
  const existsSync = options.existsSync ?? defaultExistsSync;
  const packagedIconPath = options.resourcesPath
    ? join(options.resourcesPath, APP_ICON_FILE_NAME)
    : undefined;
  const appIconPath = join(options.appPath, "resources", APP_ICON_FILE_NAME);

  if (options.isPackaged && packagedIconPath && existsSync(packagedIconPath)) {
    return packagedIconPath;
  }
  if (existsSync(appIconPath)) {
    return appIconPath;
  }
  return options.isPackaged && packagedIconPath ? packagedIconPath : appIconPath;
}
