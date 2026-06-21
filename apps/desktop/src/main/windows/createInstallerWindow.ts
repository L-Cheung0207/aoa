import { join } from "node:path";
import { BrowserWindow } from "electron";
import { APP_PRODUCT_NAME } from "../appIdentity";
import { resolveRuntimeAppIconPath } from "./appIcon";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export function createInstallerWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: APP_PRODUCT_NAME,
    width: 663,
    height: 491,
    resizable: false,
    maximizable: false,
    show: false,
    icon: resolveRuntimeAppIconPath(),
    backgroundColor: "#f2f3f5",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "../preload/index.mjs"),
    },
  });

  blockHomeWindowAltSpaceMenu(window);

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/installer`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "installer",
    });
  }

  return window;
}
