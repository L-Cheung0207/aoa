import { join } from "node:path";
import { BrowserWindow } from "electron";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export function createUninstallWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 553,
    height: 412,
    resizable: false,
    maximizable: false,
    show: false,
    backgroundColor: "#292929",
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
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/uninstall`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "uninstall",
    });
  }

  return window;
}
