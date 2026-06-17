import { BrowserWindow, type WebContents } from "electron";
import { formatLogFields } from "../log/logSanitizer";

export interface IpcWindowControlAdapter {
  on(channel: string, listener: (event: { sender: WebContents }, action: unknown) => void): void;
}

export interface WindowControlLogger {
  log(message: string): void;
  warn(message: string): void;
}

export function registerWindowControlIpc(
  ipcMain: IpcWindowControlAdapter,
  options: { logger?: WindowControlLogger } = {}
): void {
  const logger = options.logger ?? console;
  const channel = "voice:home-window-control";
  ipcMain.on("voice:home-window-control", (event, action: unknown) => {
    logWindowControlRequest(logger, channel, action);
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (
      !sourceWindow ||
      sourceWindow.isDestroyed()
    ) {
      logWindowControlIgnored(logger, channel, "no-window");
      return;
    }
    if (typeof action !== "string") {
      logWindowControlIgnored(logger, channel, "invalid-action");
      return;
    }
    switch (action) {
      case "minimize":
        sourceWindow.minimize();
        break;
      case "toggleMaximize":
        if (sourceWindow.isMaximized()) {
          sourceWindow.unmaximize();
        } else {
          sourceWindow.maximize();
        }
        break;
      case "close":
        sourceWindow.close();
        break;
      default:
        logWindowControlIgnored(logger, channel, "invalid-action");
        return;
    }
    logWindowControlResponse(logger, channel, action);
  });
}

function logWindowControlRequest(
  logger: Pick<WindowControlLogger, "log">,
  channel: string,
  action: unknown
): void {
  logger.log(
    `[ipc-direct] request ${formatLogFields({
      channel,
      input: { action },
    })}`
  );
}

function logWindowControlResponse(
  logger: Pick<WindowControlLogger, "log">,
  channel: string,
  action: string
): void {
  logger.log(
    `[ipc-direct] response ${formatLogFields({
      channel,
      status: "ok",
      action,
    })}`
  );
}

function logWindowControlIgnored(
  logger: Pick<WindowControlLogger, "warn">,
  channel: string,
  reason: string
): void {
  logger.warn(
    `[ipc-direct] response ${formatLogFields({
      channel,
      status: "ignored",
      reason,
    })}`
  );
}
