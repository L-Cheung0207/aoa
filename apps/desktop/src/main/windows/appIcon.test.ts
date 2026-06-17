import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAppIconPath } from "./appIcon";

describe("resolveAppIconPath", () => {
  it("uses packaged resources when the icon exists there", () => {
    const resourcesIcon = join("D:/app/resources", "app-icon.ico");

    expect(
      resolveAppIconPath({
        appPath: "D:/repo/apps/desktop",
        existsSync: (path) => path === resourcesIcon,
        isPackaged: true,
        resourcesPath: "D:/app/resources",
      }),
    ).toBe(resourcesIcon);
  });

  it("falls back to the app resources icon for packaged-like development runs", () => {
    const appResourcesIcon = join("D:/repo/apps/desktop", "resources", "app-icon.ico");

    expect(
      resolveAppIconPath({
        appPath: "D:/repo/apps/desktop",
        existsSync: (path) => path === appResourcesIcon,
        isPackaged: true,
        resourcesPath: "D:/repo/apps/desktop/.dev-electron/electron-dist/resources",
      }),
    ).toBe(appResourcesIcon);
  });
});
