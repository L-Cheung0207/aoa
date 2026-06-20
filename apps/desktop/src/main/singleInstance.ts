export interface SingleInstanceApp {
  requestSingleInstanceLock(): boolean;
  quit(): void;
  on(event: "second-instance", listener: () => void): unknown;
}

export interface FocusableWindow {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  isVisible(): boolean;
  restore(): void;
  show(): void;
  focus(): void;
}

export interface SingleInstanceBrowserWindow {
  getAllWindows(): FocusableWindow[];
}

export interface SingleInstanceLogger {
  log(message: string): void;
}

const SINGLE_INSTANCE_EXEMPT_ARGS = new Set([
  "--installer-shell",
  "/installer-shell",
  "--silent-update",
  "/silent-update",
  "--uninstall",
  "/uninstall",
]);

export function shouldInstallSingleInstanceGuard(argv: readonly string[]): boolean {
  return !argv.some((arg) => SINGLE_INSTANCE_EXEMPT_ARGS.has(arg.toLowerCase()));
}

export function focusExistingApplicationWindow(
  browserWindow: SingleInstanceBrowserWindow,
): boolean {
  const windows = browserWindow
    .getAllWindows()
    .filter((window) => !window.isDestroyed());
  const target = windows.find((window) => window.isVisible()) ?? windows[0];
  if (!target) {
    return false;
  }

  if (target.isMinimized()) {
    target.restore();
  }
  if (!target.isVisible()) {
    target.show();
  }
  target.focus();
  return true;
}

export function installSingleInstanceGuard(options: {
  app: SingleInstanceApp;
  browserWindow: SingleInstanceBrowserWindow;
  argv?: readonly string[];
  logger?: SingleInstanceLogger;
}): boolean {
  if (!shouldInstallSingleInstanceGuard(options.argv ?? [])) {
    options.logger?.log("[single-instance] skipped for special launch mode");
    return true;
  }

  if (!options.app.requestSingleInstanceLock()) {
    options.logger?.log(
      "[single-instance] lock not acquired; quitting duplicate process",
    );
    options.app.quit();
    return false;
  }

  options.app.on("second-instance", () => {
    const focused = focusExistingApplicationWindow(options.browserWindow);
    options.logger?.log(
      `[single-instance] duplicate launch focusedExistingWindow=${focused}`,
    );
  });
  return true;
}
