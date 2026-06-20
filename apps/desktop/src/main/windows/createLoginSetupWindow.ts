import { join } from "node:path";
import { BrowserWindow } from "electron";
import { resolveRuntimeAppIconPath } from "./appIcon";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export function createLoginSetupWindow(
  options: { route?: "loginSetup" | "postInstallLogin" } = {},
): BrowserWindow {
  const window = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 900,
    minHeight: 600,
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

  const hash =
    options.route === "postInstallLogin" ? "post-install-login" : "login-setup";

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/${hash}`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      hash,
    });
  }

  return window;
}
