import { join } from "node:path";
import { app } from "electron";

export function resolveRuntimeAppIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "app-icon.ico")
    : join(app.getAppPath(), "resources", "app-icon.ico");
}
