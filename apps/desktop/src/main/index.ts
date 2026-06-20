import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { bootstrap } from "./bootstrap";
import { installConsoleRedirect } from "./log/redirectConsole";
import { installSingleInstanceGuard } from "./singleInstance";

app.setAppLogsPath();

installConsoleRedirect({
  logFilePath: join(app.getPath("logs"), "main.log")
});

process.stderr.write(
  `[diag] platform=${process.platform} stdout.isTTY=${Boolean(process.stdout.isTTY)} stderr.isTTY=${Boolean(process.stderr.isTTY)} argv0=${process.argv0}\n`
);

const hasSingleInstanceLock = installSingleInstanceGuard({
  app,
  argv: process.argv,
  browserWindow: BrowserWindow,
  logger: console,
});

if (hasSingleInstanceLock) {
  app.whenReady().then(bootstrap);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
