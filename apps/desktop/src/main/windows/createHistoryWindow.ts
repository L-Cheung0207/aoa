import { join } from "node:path";
import { BrowserWindow } from "electron";
import { resolveRuntimeAppIconPath } from "./appIcon";

export function createHistoryWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 920,
    height: 680,
    show: false,
    icon: resolveRuntimeAppIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "../preload/index.mjs")
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/history`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), { hash: "history" });
  }

  return window;
}
