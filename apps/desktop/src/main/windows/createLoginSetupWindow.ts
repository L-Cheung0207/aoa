import { join } from "node:path";
import { BrowserWindow } from "electron";
import { resolveRuntimeAppIconPath } from "./appIcon";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export function createLoginSetupWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 947,
    height: 670,
    minWidth: 900,
    minHeight: 640,
    show: false,
    icon: resolveRuntimeAppIconPath(),
    backgroundColor: "#efefef",
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
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/login-setup`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "login-setup",
    });
  }

  return window;
}
