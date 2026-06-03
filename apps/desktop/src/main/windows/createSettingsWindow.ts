import { join } from "node:path";
import { BrowserWindow } from "electron";

export function createSettingsWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 920,
    height: 680,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "../preload/index.mjs")
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/settings`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), { hash: "settings" });
  }

  return window;
}
