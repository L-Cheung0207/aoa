import { join } from "node:path";
import { BrowserWindow } from "electron";
import type { AppSettings } from "@voice/shared";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export interface CreateHomeWindowOptions {
  section?: "home" | "history" | "settings" | "about";
  theme?: AppSettings["ui"]["theme"];
  onboardingStep?: number;
}

function appendThemeQuery(
  url: string,
  theme: AppSettings["ui"]["theme"] | undefined,
): string {
  if (!theme) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}theme=${encodeURIComponent(theme)}`;
}

export function createHomeWindow(
  options: CreateHomeWindowOptions = {},
): BrowserWindow {
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
      preload: join(__dirname, "../preload/index.mjs"),
    },
  });

  blockHomeWindowAltSpaceMenu(window);

  const baseHash =
    options.section && options.section !== "home"
      ? `home-${options.section}`
      : "home";
  const hash =
    options.onboardingStep !== undefined
      ? `${baseHash}-onboarding-${options.onboardingStep}`
      : baseHash;
  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(
      `${appendThemeQuery(process.env.ELECTRON_RENDERER_URL, options.theme)}#/${hash}`,
    );
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      hash,
      ...(options.theme ? { query: { theme: options.theme } } : {}),
    });
  }

  return window;
}
