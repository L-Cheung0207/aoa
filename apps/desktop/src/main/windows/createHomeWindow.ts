import { join } from "node:path";
import { BrowserWindow } from "electron";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export interface CreateHomeWindowOptions {
  section?: "home" | "history" | "settings" | "about";
}

export function createHomeWindow(options: CreateHomeWindowOptions = {}): BrowserWindow {
  const window = new BrowserWindow({
    width: 1080,
    height: 748,
    minWidth: 920,
    minHeight: 640,
    show: false,
    backgroundColor: "#f1f0ed",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "../preload/index.mjs")
    }
  });

  blockHomeWindowAltSpaceMenu(window);

  const hash = options.section && options.section !== "home" ? `home-${options.section}` : "home";
  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/${hash}`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), { hash });
  }

  return window;
}
