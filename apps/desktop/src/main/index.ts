import { join } from "node:path";
import { app } from "electron";
import { bootstrap } from "./bootstrap";
import { installConsoleRedirect } from "./log/redirectConsole";

app.setAppLogsPath();

installConsoleRedirect({
  logFilePath: join(app.getPath("logs"), "main.log")
});

process.stderr.write(
  `[diag] platform=${process.platform} stdout.isTTY=${Boolean(process.stdout.isTTY)} stderr.isTTY=${Boolean(process.stderr.isTTY)} argv0=${process.argv0}\n`
);

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
