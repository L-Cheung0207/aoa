import { BrowserWindow, type WebContents } from "electron";

export interface IpcWindowControlAdapter {
  on(channel: string, listener: (event: { sender: WebContents }, action: unknown) => void): void;
}

export function registerWindowControlIpc(ipcMain: IpcWindowControlAdapter): void {
  ipcMain.on("voice:home-window-control", (event, action: unknown) => {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (
      !sourceWindow ||
      sourceWindow.isDestroyed() ||
      typeof action !== "string"
    ) {
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
    }
  });
}
