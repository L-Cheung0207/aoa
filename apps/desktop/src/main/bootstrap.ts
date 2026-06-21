import os, { homedir } from "node:os";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { spawn, type SpawnOptions } from "node:child_process";
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  nativeTheme,
  safeStorage,
  session,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from "electron";
import ElectronStore from "electron-store";
import electronUpdater from "electron-updater";
import {
  createDefaultSettings,
  type AppSettings,
  type InterfaceLanguage,
  type RecordingMode,
} from "@voice/shared";
import * as backendClientModule from "@voice/backend-client";
import type { BackendClient } from "@voice/backend-client";
import { createAuthHttpClient } from "./auth/authHttpClient";
import { createAuthService, type AuthService } from "./auth/authService";
import { createAuthSessionStore } from "./auth/authSessionStore";
import type { AuthSessionSnapshot } from "./auth/authTypes";
import { encryptLdapPassword } from "./auth/ldapCrypto";
import {
  configureKeyboardShortcuts,
  copySelectionToClipboard,
  focusWindow,
  getForegroundWindowHandle,
  muteOtherAppsForRecording,
  isEditableTargetFocused,
  pasteFromClipboard,
  restoreOtherAppsAudio,
  startKeyboardHook,
  typeText,
} from "@voice/native-helper";
import { createAudioDuckingService } from "./audio/audioDuckingService";
import { createClipboardService } from "./clipboard/clipboardService";
import {
  createConfigStore,
  type ConfigStorageAdapter,
} from "./config/configStore";
import {
  readAppConfig,
  readMainAppConfig,
  resolveAppConfigPath,
} from "./config/appConfig";
import { createElectronStoreAdapter } from "./config/electronStoreAdapter";
import { applyLocalEnvFiles } from "./config/localEnv";
import { APP_PRODUCT_NAME } from "./appIdentity";
import { getOrCreateInstallationId } from "./installation/installationId";
import { createFileHistoryStore } from "./history/historyStore";
import {
  applyPendingInstallOptions,
  resolvePendingInstallOptionsPath,
} from "./installer/installOptions";
import {
  createInstallerService,
  resolveInstallerModeMarkerPath,
  shouldOpenInstallerShell,
  type InstallerService,
  type InstallerShellInstallInput,
} from "./installer/installerService";
import { createInsertService } from "./insertion/insertService";
import { registerIpcRoutes, type IpcMainAdapter } from "./ipc/ipcRoutes";
import {
  configureLogSanitizer,
  formatLogFields,
  sanitizeUrlForLog,
} from "./log/logSanitizer";
import { createNativeBridge } from "./native/nativeBridge";
import { createSelectionService } from "./selection/selectionService";
import {
  createEscCancelController,
  shouldEnableEscCancelForState,
} from "./shortcuts/escCancelController";
import { createNativeShortcutRegistrar } from "./shortcuts/nativeShortcutRegistrar";
import { createShortcutCaptureSession } from "./shortcuts/shortcutCaptureSession";
import {
  createShortcutManager,
  type ShortcutConfigureResult,
} from "./shortcuts/shortcutManager";
import { createMainTranscriptionService } from "./transcription/mainTranscriptionService";
import { createTray } from "./tray/createTray";
import {
  createUpdateService,
  type UpdateDownloadProgressPayload,
  type UpdateService,
} from "./update/updateService";
import {
  createHttpVersionCheckClient,
  type VersionPhase,
  type VersionPlatform,
} from "./update/versionCheckClient";
import { installMediaPermissionHandlers } from "./permissions/mediaPermission";
import {
  createUninstallService,
  type UninstallService,
} from "./uninstall/uninstallService";
import {
  applyOverlayWindowLayout,
  createOverlayWindowFollower,
  createOverlayWindow,
  type OverlayWindowLayout,
} from "./windows/createOverlayWindow";
import { createHomeWindow } from "./windows/createHomeWindow";
import { createInstallerWindow } from "./windows/createInstallerWindow";
import { createLoginSetupWindow } from "./windows/createLoginSetupWindow";
import { createUninstallWindow } from "./windows/createUninstallWindow";
import { resolveRuntimeAppIconPath } from "./windows/appIcon";
import {
  blockHomeWindowAltSpaceMenu,
  ensureLoginSetupShortcutCaptureWindowGuards,
  ensureShortcutCaptureWindowGuards,
  wireLoginSetupShortcutCaptureWindowGuard,
  wireShortcutCaptureWindowGuard,
} from "./windows/shortcutCaptureWindowGuard";
import { registerWindowControlIpc } from "./windows/windowControlIpc";

declare const __AOA_VERSION_PHASE__: string | undefined;

const createHttpBackendClient = (
  backendClientModule as typeof backendClientModule & {
    createHttpBackendClient(options: {
      baseUrl: string;
      getAccessToken(): Promise<string>;
    }): BackendClient;
  }
).createHttpBackendClient;

const TRAY_TOOLTIP_TEXT: Record<
  InterfaceLanguage,
  { idle: string; listening: string; result: string }
> = {
  "zh-CN": {
    idle: "Voice AI · 空闲",
    listening: "Voice AI · 录音中",
    result: "Voice AI · 结果",
  },
  "zh-TW": {
    idle: "Voice AI · 空閒",
    listening: "Voice AI · 錄音中",
    result: "Voice AI · 結果",
  },
  "en-US": {
    idle: "Voice AI · Idle",
    listening: "Voice AI · Recording",
    result: "Voice AI · Result",
  },
};

/** 錄音狀態 → 托盤 tooltip 文案（僅「開啟/關閉」兩態）。 */
export function formatTrayTooltip(
  state: string,
  language: InterfaceLanguage = "zh-TW",
): string {
  const text = TRAY_TOOLTIP_TEXT[language] ?? TRAY_TOOLTIP_TEXT["zh-TW"];
  if (state === "result") {
    return text.result;
  }
  return state === "listening" ? text.listening : text.idle;
}

/**
 * 錄音狀態 → 懸浮窗顯隱決策。
 * - listening：正在錄音 → 顯示（音量條/狀態點可見）
 * - processing/inserting：第二次 Right ALT 後的轉寫/插入階段 → 顯示 Thinking loading
 * - success/idle：Thinking 完成後的收尾態 → 立即隱藏，不再展示帶按鈕的膠囊面板
 * - error：保留顯示，讓使用者看到錯誤提示
 */
export type OverlayVisibility = "show" | "hide" | "keep";
export function resolveOverlayVisibility(
  state: string,
  reason?: string,
): OverlayVisibility {
  switch (state) {
    case "listening":
    case "canceled":
    case "processing":
    case "inserting":
    case "result":
    case "shortcutHelp":
      return "show";
    case "success":
    case "idle":
      return "hide";
    case "error":
      return reason === "mic" || reason === "no_selection" ? "show" : "keep";
    default:
      return "keep";
  }
}

export function shouldRunScheduledOverlayHide(
  currentState: string,
  currentReason?: string,
): boolean {
  return resolveOverlayVisibility(currentState, currentReason) === "hide";
}

export function resolveOverlayWindowLayout(
  state: string,
  _mode: RecordingMode | undefined,
  options: {
    recordingLimitWarning?: boolean;
    busyHintVisible?: boolean;
    reason?: string;
  } = {},
): OverlayWindowLayout {
  if (state === "result") {
    return "result";
  }
  if (state === "shortcutHelp") {
    return "shortcutHelp";
  }
  if (state === "canceled") {
    return "canceledPill";
  }
  if (state === "listening") {
    if (options.recordingLimitWarning) {
      return "recordingLimitWarning";
    }
    return "translatePill";
  }
  if (state === "error" && options.reason === "mic") {
    return "micError";
  }
  if (state === "error" && options.reason === "no_selection") {
    return "selectionError";
  }
  if (
    (state === "processing" || state === "inserting") &&
    !options.busyHintVisible
  ) {
    return "translatePill";
  }
  if (
    (state === "processing" || state === "inserting") &&
    options.busyHintVisible
  ) {
    return "busyHint";
  }
  if (state === "processing" || state === "inserting") {
    return "thinkingPill";
  }
  if (state === "error" && options.reason === "transcription") {
    return "busyHint";
  }
  if (state === "error") {
    return "thinkingPill";
  }
  return "pill";
}

/** 隱藏延遲：success/idle 直接 0ms 即時隱藏，避免短暫閃現 Thinking 後的預設膠囊面板。 */
export type ShortcutTriggerOverlayAction = "defer" | "show";

export function resolveShortcutTriggerOverlayAction(
  mode?: RecordingMode,
  lastState?: string,
): ShortcutTriggerOverlayAction {
  if (mode === "direct" && (lastState === "idle" || lastState === "success")) {
    return "defer";
  }
  if (
    mode === "processSelection" &&
    (lastState === "idle" || lastState === "success" || lastState === "error")
  ) {
    return "defer";
  }
  return "show";
}

export function shouldReplayMicErrorOverlay(
  state: string,
  reason?: string,
): boolean {
  return state === "error" && reason === "mic";
}

export function resolveShortcutTriggerOverlayLayout(
  lastState: string,
  mode: RecordingMode,
  options: {
    activeMode?: RecordingMode;
    reason?: string;
  } = {},
): OverlayWindowLayout {
  const state =
    lastState === "processing" ||
    lastState === "inserting" ||
    lastState === "error"
      ? lastState
      : "listening";

  return resolveOverlayWindowLayout(state, mode, {
    ...(lastState === "error" && options.reason !== undefined
      ? { reason: options.reason }
      : {}),
  });
}

export interface ElectronNativeWindowHandleSource {
  isDestroyed(): boolean;
  getNativeWindowHandle(): Buffer;
}

export function normalizeNativeWindowHandleToken(
  windowHandle: string | undefined,
): string | undefined {
  const trimmed = windowHandle?.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  try {
    if (/^\d+$/.test(trimmed)) {
      return BigInt(trimmed).toString(10);
    }
    if (/^0x[0-9a-f]+$/.test(trimmed)) {
      return BigInt(trimmed).toString(10);
    }
    if (/^[0-9a-f]+$/.test(trimmed)) {
      return BigInt(`0x${trimmed}`).toString(10);
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function createElectronNativeWindowHandleCandidates(
  nativeWindowHandle: Buffer,
): Set<string> {
  const candidates = new Set<string>();
  const addNumericCandidate = (value: bigint): void => {
    candidates.add(value.toString(10));
    candidates.add(value.toString(16));
    candidates.add(`0x${value.toString(16)}`);
  };
  const addTokenCandidate = (token: string): void => {
    const normalized = normalizeNativeWindowHandleToken(token);
    if (normalized) {
      candidates.add(normalized);
    }
    candidates.add(token.toLowerCase());
  };

  if (nativeWindowHandle.length === 0) {
    return candidates;
  }

  addTokenCandidate(nativeWindowHandle.toString("hex"));
  addTokenCandidate(Buffer.from(nativeWindowHandle).reverse().toString("hex"));

  if (nativeWindowHandle.length >= 4) {
    addNumericCandidate(BigInt(nativeWindowHandle.readUInt32LE(0)));
    addNumericCandidate(BigInt(nativeWindowHandle.readUInt32BE(0)));
  }
  if (nativeWindowHandle.length >= 8) {
    addNumericCandidate(nativeWindowHandle.readBigUInt64LE(0));
    addNumericCandidate(nativeWindowHandle.readBigUInt64BE(0));
  }

  return candidates;
}

export function isCurrentAppWindowHandle(
  windowHandle: string | undefined,
  options: {
    windows?: ElectronNativeWindowHandleSource[];
    processIds?: number[];
    matchProcessIds?: boolean;
  } = {},
): boolean {
  const normalizedHandle = normalizeNativeWindowHandleToken(windowHandle);
  if (!normalizedHandle) {
    return false;
  }

  if (options.matchProcessIds ?? process.platform === "darwin") {
    const processIds = options.processIds ?? getCurrentAppProcessIds();
    if (processIds.some((processId) => `${processId}` === normalizedHandle)) {
      return true;
    }
  }

  const windows = options.windows ?? BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window.isDestroyed()) {
      continue;
    }
    if (
      createElectronNativeWindowHandleCandidates(
        window.getNativeWindowHandle(),
      ).has(normalizedHandle)
    ) {
      return true;
    }
  }

  return false;
}

export function formatShortcutHelpLabel(shortcut: string): string {
  const shortcutParts = shortcut.split("+").map((part) => part.trim());
  const usesRightCommand = shortcutParts.includes("MetaRight");
  return shortcut
    .split("+")
    .map((part) => {
      switch (part.trim()) {
        case "RightAlt":
        case "LeftAlt":
        case "Alt":
          return "Alt";
        case "MetaRight":
          return "Right Cmd";
        case "RightShift":
          return usesRightCommand ? "Right Shift" : "Shift";
        case "LeftShift":
        case "Shift":
          return "Shift";
        default:
          return part.trim();
      }
    })
    .filter(Boolean)
    .join("+");
}

export function shouldShowShortcutHelpForState(state: string): boolean {
  return state === "idle" || state === "success";
}

export function handleOpenMicrophoneHelpRequest({
  overlayWindow,
  overlayWindowFollower,
  cancelPendingOverlayHide,
  openHomeWindow,
}: {
  overlayWindow: Pick<BrowserWindow, "hide" | "isDestroyed" | "isVisible">;
  overlayWindowFollower: { stop(): void };
  cancelPendingOverlayHide(): void;
  openHomeWindow(options: { section: "home"; showMicrophoneHelp: true }): void;
}): void {
  cancelPendingOverlayHide();
  overlayWindowFollower.stop();
  if (!overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.hide();
  }
  openHomeWindow({ section: "home", showMicrophoneHelp: true });
}

export function applyNativeTheme(theme: AppSettings["ui"]["theme"]): void {
  nativeTheme.themeSource = theme;
}

export function applyLaunchAtLogin(launchAtLogin: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: launchAtLogin,
    openAsHidden: true,
  });
}

const OVERLAY_HIDE_DELAY_MS = 0;
const SELECTION_COPY_DELAY_MS = 80;
const INSTALL_TARGET_PRODUCT_NAME = APP_PRODUCT_NAME;
const WINDOWS_APP_USER_MODEL_ID = "com.ctm.voice-assistant";
const OPEN_HOME_ON_LAUNCH_ARGS = new Set(["--open-home", "/open-home"]);
const POST_INSTALL_LOGIN_ARGS = new Set([
  "--post-install-login",
  "/post-install-login",
]);
const SILENT_UPDATE_ARGS = new Set(["--silent-update", "/silent-update"]);

export interface AppLaunchTarget {
  executablePath: string;
  args: string[];
}

export function configureAppIdentity(
  platform: NodeJS.Platform = process.platform,
): void {
  app.setName(INSTALL_TARGET_PRODUCT_NAME);
  if (platform === "win32") {
    app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
  }
}

export function resolveDevelopmentRuntime({
  isPackaged,
  electronRendererUrl,
}: {
  isPackaged: boolean;
  electronRendererUrl?: string | undefined;
}): boolean {
  return !isPackaged || Boolean(electronRendererUrl);
}

export function resolvePackagedResourceRuntime({
  isDevelopmentRuntime,
}: {
  isDevelopmentRuntime: boolean;
}): boolean {
  return !isDevelopmentRuntime;
}

export function createDevelopmentAwareBackendClient({
  backendClient,
  isDevelopmentRuntime,
  getAuthSessionSnapshot,
}: {
  backendClient: BackendClient;
  isDevelopmentRuntime: boolean;
  getAuthSessionSnapshot(): AuthSessionSnapshot;
}): BackendClient {
  return {
    ...backendClient,
    bootstrap: async (request) => {
      const snapshot = getAuthSessionSnapshot();
      if (
        isDevelopmentRuntime &&
        snapshot.status === "authenticated" &&
        snapshot.featureFlags?.developmentAuthBypass === true
      ) {
        return {
          clientId: `dev-${request.installationId}`,
          serviceStatus: "ok",
          featureFlags: {
            realtimeTranscription: true,
            history: true,
          },
          anonymousQuota: {
            transcriptionSecondsRemaining: 3600,
          },
        };
      }
      return backendClient.bootstrap(request);
    },
  };
}

export function shouldOpenHomeOnLaunch(argv: readonly string[]): boolean {
  return argv.some((arg) => OPEN_HOME_ON_LAUNCH_ARGS.has(arg.toLowerCase()));
}

export function shouldOpenPostInstallLoginOnLaunch(
  argv: readonly string[],
): boolean {
  return argv.some((arg) => POST_INSTALL_LOGIN_ARGS.has(arg.toLowerCase()));
}

export function parseSilentUpdateInstallDir(
  argv: readonly string[],
): string | undefined {
  if (!argv.some((arg) => SILENT_UPDATE_ARGS.has(arg.toLowerCase()))) {
    return undefined;
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    const lowerArg = arg.toLowerCase();
    if (lowerArg.startsWith("--install-dir=")) {
      return arg.slice("--install-dir=".length).trim() || undefined;
    }
    if (lowerArg === "--install-dir") {
      return argv[index + 1]?.trim() || undefined;
    }
    if (lowerArg.startsWith("/d=")) {
      return arg.slice("/D=".length).trim() || undefined;
    }
  }
  return undefined;
}

export function resolveInstalledAppLaunchTarget(input: {
  installDir: string;
  platform?: NodeJS.Platform;
  productName?: string;
}): AppLaunchTarget {
  const productName = input.productName ?? INSTALL_TARGET_PRODUCT_NAME;
  if ((input.platform ?? process.platform) === "darwin") {
    const appBundlePath = input.installDir.endsWith(".app")
      ? input.installDir
      : join(input.installDir, `${productName}.app`);
    return {
      executablePath: join(appBundlePath, "Contents", "MacOS", productName),
      args: ["--open-home"],
    };
  }

  return {
    executablePath: join(input.installDir, `${productName}.exe`),
    args: ["--open-home"],
  };
}

export function resolvePostInstallLaunchTarget(input: {
  installDir: string;
  isDevelopmentRuntime: boolean;
  platform: NodeJS.Platform;
  appPath: string;
  execPath: string;
  productName?: string;
}): AppLaunchTarget {
  if (input.isDevelopmentRuntime && input.platform !== "win32") {
    return {
      executablePath: input.execPath,
      args: [input.appPath, "--open-home"],
    };
  }

  const launchTargetInput: {
    installDir: string;
    platform: NodeJS.Platform;
    productName?: string;
  } = {
    installDir: input.installDir,
    platform: input.platform,
  };
  if (input.productName !== undefined) {
    launchTargetInput.productName = input.productName;
  }
  return resolveInstalledAppLaunchTarget(launchTargetInput);
}

export function launchInstalledAppHome(input: {
  target: AppLaunchTarget;
  spawnProcess?: typeof spawn;
  existsSync?: typeof existsSync;
}): void {
  const spawnProcess = input.spawnProcess ?? spawn;
  const fileExists = input.existsSync ?? existsSync;
  const executablePath = input.target.executablePath;
  if (!fileExists(executablePath)) {
    throw new Error(`Installed app executable not found: ${executablePath}`);
  }

  const child = spawnProcess(
    executablePath,
    input.target.args,
    {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    } satisfies SpawnOptions,
  );
  child.once?.("error", (error) => {
    console.warn("[installer] installed app launch failed", error);
  });
  child.unref();
}

interface InstallerLaunchWindow {
  isDestroyed(): boolean;
  hide(): void;
  destroy(): void;
}

export function handoffInstallerLaunch(input: {
  installerWindow?: InstallerLaunchWindow | null;
  installDir: string;
  isDevelopmentRuntime?: boolean;
  platform?: NodeJS.Platform;
  appPath?: string;
  execPath?: string;
  launch?: (input: { target: AppLaunchTarget }) => void;
  exitApp?: (exitCode: number) => void;
}): void {
  const launch = input.launch ?? launchInstalledAppHome;
  const exitApp = input.exitApp ?? ((exitCode: number) => app.exit(exitCode));
  const target = resolvePostInstallLaunchTarget({
    installDir: input.installDir,
    isDevelopmentRuntime: input.isDevelopmentRuntime ?? false,
    platform: input.platform ?? process.platform,
    appPath: input.appPath ?? app.getAppPath(),
    execPath: input.execPath ?? process.execPath,
  });
  launch({ target });
  const installerWindow = input.installerWindow;
  if (installerWindow && !installerWindow.isDestroyed()) {
    installerWindow.hide();
    installerWindow.destroy();
  }
  exitApp(0);
}

const AUTH_IPC_CHANNELS = new Set([
  "voice:get-app-info",
  "voice:auth:get-session",
  "voice:auth:send-email-code",
  "voice:auth:login-email-code",
  "voice:auth:login-ldap",
  "voice:auth:complete-login-setup",
  "voice:set-login-setup-shortcut-capture-active",
  // Logout is idempotent in AuthService and safe before authentication.
  "voice:auth:logout",
]);

export function createAuthenticatedIpcMainAdapter(
  ipcMainAdapter: IpcMainAdapter,
  authService: Pick<AuthService, "getAccessTokenForRequest">,
): IpcMainAdapter {
  return {
    handle: (channel, listener) => {
      ipcMainAdapter.handle(channel, async (event, input) => {
        if (!AUTH_IPC_CHANNELS.has(channel)) {
          await authService.getAccessTokenForRequest();
        }
        return listener(event, input);
      });
    },
  };
}

export async function runAuthenticatedDirectIpc<T>(
  authService: Pick<AuthService, "getAccessTokenForRequest">,
  listener: () => T | Promise<T>,
): Promise<T> {
  await authService.getAccessTokenForRequest();
  return listener();
}

export function createLazyUpdateService(
  factory: () => UpdateService,
  options: {
    isDisabled?: () => boolean;
  } = {},
): UpdateService {
  let service: UpdateService | undefined;
  const getService = (): UpdateService => {
    service ??= factory();
    return service;
  };
  return {
    checkForUpdates: (checkOptions) => {
      if (options.isDisabled?.() ?? false) {
        console.log("[update] check disabled by runtime guard");
        return Promise.resolve({ status: "disabled" });
      }
      return getService().checkForUpdates(checkOptions);
    },
    restartToUpdate: () => {
      getService().restartToUpdate();
    },
    dispose: () => {
      service?.dispose?.();
      service = undefined;
    },
  };
}

export interface StartupGateOptions {
  authService: Pick<AuthService, "restoreSession" | "subscribe">;
  startAuthenticatedRuntime(): void | Promise<void>;
  stopAuthenticatedRuntime(): void;
  showLoginSetupWindow(snapshot: AuthSessionSnapshot): void;
  hideLoginSetupWindow?(): void;
  openHomeWindowAfterLoginSetup?(): void;
  openHomeWindowOnAuthenticatedRestore?: boolean;
  forceLoginSetupOnAuthenticatedRestore?: boolean;
  onLoginSetupReady?(complete: () => Promise<void>): void;
}

export interface LoginSetupWindowVisibilityTarget {
  once(event: "ready-to-show", listener: () => void): unknown;
  webContents: {
    once(
      event: "did-finish-load" | "did-fail-load",
      listener: () => void,
    ): unknown;
  };
}

export function wireLoginSetupWindowVisibility(
  window: LoginSetupWindowVisibilityTarget,
  showWindow: () => void,
  options: {
    setTimeoutFn?: typeof setTimeout;
    clearTimeoutFn?: typeof clearTimeout;
    timeoutMs?: number;
  } = {},
): void {
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  const timeoutMs = options.timeoutMs ?? 1200;
  let shown = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

  const showOnce = (): void => {
    if (shown) {
      return;
    }
    shown = true;
    if (fallbackTimer) {
      clearTimeoutFn(fallbackTimer);
      fallbackTimer = undefined;
    }
    showWindow();
  };

  window.once("ready-to-show", showOnce);
  window.webContents.once("did-finish-load", showOnce);
  window.webContents.once("did-fail-load", showOnce);
  fallbackTimer = setTimeoutFn(showOnce, timeoutMs);
}

export interface LoginSetupShortcutCaptureController {
  setActive(active: boolean): void;
  clear(): void;
  isActive(): boolean;
}

interface LoginSetupShortcutCaptureControllerOptions {
  getShortcutCaptureDepth(): number;
  suspendGlobalShortcuts(): void;
  resumeGlobalShortcuts(options: { broadcastConflicts: boolean }): void;
  ensureWindowGuards(): void;
  startShortcutCaptureSession(): void;
  stopShortcutCaptureSession(): void;
}

export function createLoginSetupShortcutCaptureController(
  options: LoginSetupShortcutCaptureControllerOptions,
): LoginSetupShortcutCaptureController {
  let depth = 0;
  let suspendedGlobalShortcuts = false;

  const resumeIfNeeded = (): void => {
    if (
      depth === 0 &&
      options.getShortcutCaptureDepth() === 0 &&
      suspendedGlobalShortcuts
    ) {
      suspendedGlobalShortcuts = false;
      options.resumeGlobalShortcuts({ broadcastConflicts: false });
    }
  };

  return {
    setActive: (active) => {
      if (active) {
        if (depth === 0 && options.getShortcutCaptureDepth() === 0) {
          options.suspendGlobalShortcuts();
          suspendedGlobalShortcuts = true;
        }
        try {
          options.ensureWindowGuards();
          options.startShortcutCaptureSession();
        } catch (error) {
          resumeIfNeeded();
          throw error;
        }
        depth += 1;
        console.log("[bootstrap] 安裝向導快捷鍵試用：已暫停全域性快捷鍵");
        return;
      }

      if (depth === 0) {
        return;
      }

      depth -= 1;
      if (depth === 0) {
        options.stopShortcutCaptureSession();
        resumeIfNeeded();
      }
    },
    clear: () => {
      if (depth === 0) {
        return;
      }
      depth = 0;
      options.stopShortcutCaptureSession();
      resumeIfNeeded();
    },
    isActive: () => depth > 0,
  };
}

export async function runStartupGate(
  options: StartupGateOptions,
): Promise<void> {
  let runtimeStarted = false;
  let runtimeStarting = false;
  let runtimeResetRequired = false;
  let desiredAuthenticated = false;
  let loginSetupVisible = false;
  let loginSetupCanComplete = false;
  let forceLoginSetupOnAuthenticatedRestore =
    options.forceLoginSetupOnAuthenticatedRestore === true;
  let transition = Promise.resolve();

  const reconcileRuntime = async (): Promise<void> => {
    const stopRuntime = (): void => {
      options.stopAuthenticatedRuntime();
      runtimeStarted = false;
      runtimeResetRequired = false;
    };

    if (runtimeResetRequired && runtimeStarted) {
      stopRuntime();
    }

    if (desiredAuthenticated && !runtimeStarted) {
      runtimeStarting = true;
      await options.startAuthenticatedRuntime();
      runtimeStarting = false;
      runtimeStarted = true;
      if (runtimeResetRequired) {
        stopRuntime();
        return;
      }
      if (desiredAuthenticated) {
        if (loginSetupVisible && !loginSetupCanComplete) {
          options.hideLoginSetupWindow?.();
          loginSetupVisible = false;
        }
      } else {
        stopRuntime();
      }
      return;
    }

    if (!desiredAuthenticated && runtimeStarted) {
      stopRuntime();
    }
  };

  const scheduleTransition = (): Promise<void> => {
    transition = transition.then(reconcileRuntime, reconcileRuntime);
    return transition;
  };

  const completeLoginSetup = (): Promise<void> => {
    if (!loginSetupCanComplete) {
      return Promise.resolve();
    }
    desiredAuthenticated = true;
    return scheduleTransition().then(() => {
      if (desiredAuthenticated && runtimeStarted) {
        if (loginSetupVisible) {
          options.hideLoginSetupWindow?.();
          loginSetupVisible = false;
        }
        loginSetupCanComplete = false;
        options.openHomeWindowAfterLoginSetup?.();
      }
    });
  };

  options.onLoginSetupReady?.(completeLoginSetup);

  const handleSnapshot = (
    snapshot: AuthSessionSnapshot,
  ): Promise<void> | void => {
    if (snapshot.status === "authenticated") {
      if (loginSetupVisible || forceLoginSetupOnAuthenticatedRestore) {
        forceLoginSetupOnAuthenticatedRestore = false;
        loginSetupCanComplete = true;
        loginSetupVisible = true;
        desiredAuthenticated = true;
        options.showLoginSetupWindow(snapshot);
        return scheduleTransition();
      }
      loginSetupCanComplete = false;
      desiredAuthenticated = true;
      return scheduleTransition().then(() => {
        if (
          options.openHomeWindowOnAuthenticatedRestore === true &&
          runtimeStarted
        ) {
          options.openHomeWindowAfterLoginSetup?.();
        }
      });
    }
    loginSetupCanComplete = false;
    if (runtimeStarted || runtimeStarting || desiredAuthenticated) {
      runtimeResetRequired = true;
    }
    desiredAuthenticated = false;
    loginSetupVisible = true;
    options.showLoginSetupWindow(snapshot);
    return scheduleTransition();
  };

  options.authService.subscribe((snapshot) => {
    void handleSnapshot(snapshot);
  });
  await handleSnapshot(await options.authService.restoreSession());
}

export async function bootstrap(): Promise<void> {
  const isDevelopmentRuntime = resolveDevelopmentRuntime({
    isPackaged: app.isPackaged,
    electronRendererUrl: process.env.ELECTRON_RENDERER_URL,
  });
  configureAppIdentity();
  configureLogSanitizer({ revealSensitive: isDevelopmentRuntime });
  registerWindowControlIpc(ipcMain);
  if (isDevelopmentRuntime) {
    const loadedEnvKeys = applyLocalEnvFiles([
      join(app.getAppPath(), "..", "..", ".env"),
      join(app.getAppPath(), ".env"),
    ]);
    if (loadedEnvKeys.length > 0) {
      console.log(
        `[bootstrap] loaded local env keys=${loadedEnvKeys.join(",")}`,
      );
    }
  }
  if (
    shouldOpenInstallerShell(
      process.argv,
      existsSync(resolveInstallerModeMarkerPath(process.resourcesPath)),
    )
  ) {
    const installerService = createAppInstallerService();
    const silentUpdateInstallDir = parseSilentUpdateInstallDir(process.argv);
    if (silentUpdateInstallDir) {
      try {
        await installerService.install({
          installDir: silentUpdateInstallDir,
          createDesktopShortcut: false,
          launchAtLogin: false,
          updated: true,
        });
        launchInstalledAppHome({
          target: resolveInstalledAppLaunchTarget({
            installDir: silentUpdateInstallDir,
          }),
        });
        app.exit(0);
      } catch (error) {
        console.warn("[bootstrap] silent update install failed", error);
        app.exit(1);
      }
      return;
    }
    registerInstallerOnlyIpc(installerService);
    openInstallerWindow();
    return;
  }
  if (shouldOpenUninstallWindow(process.argv)) {
    console.log(
      `[bootstrap] opening uninstall window ${formatLogFields({
        argv: summarizeArgvForLog(process.argv),
      })}`,
    );
    let uninstallConfirmed = false;
    registerUninstallOnlyIpc(createAppUninstallService(), {
      onFinish: () => {
        uninstallConfirmed = true;
        app.exit(0);
      },
    });
    openUninstallWindow({
      onClosed: () => {
        if (!uninstallConfirmed) {
          app.exit(1);
        }
      },
    });
    return;
  }
  installMediaPermissionHandlers(session.defaultSession);
  console.log("[bootstrap] 啟動中…");
  const electronStore = new ElectronStore();
  const storeAdapter = createElectronStoreAdapter(electronStore);
  const isPackagedResourceRuntime = resolvePackagedResourceRuntime({
    isDevelopmentRuntime,
  });
  const appConfigPath = resolveAppConfigPath({
    isPackaged: isPackagedResourceRuntime,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
  });
  console.log(
    `[bootstrap] runtime packaged=${app.isPackaged} development=${isDevelopmentRuntime} appPath=${app.getAppPath()} resourcesPath=${process.resourcesPath} appConfigPath=${appConfigPath}`,
  );
  const mainAppConfig = await readMainAppConfig(appConfigPath);
  const configStore = createConfigStore({
    adapter: storeAdapter,
    defaults: createDefaultSettings({
      isPackaged: app.isPackaged,
      platform: process.platform,
    }),
    platform: process.platform,
  });
  applyPendingInstallOptions({
    installOptionsPath: resolvePendingInstallOptionsPath({
      isPackaged: isPackagedResourceRuntime,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
    }),
    configStore,
  });
  const initialSettings = configStore.get();
  console.log(
    `[bootstrap] settings developer.enabled=${
      initialSettings.developer.enabled
    } wsUrl=${redactUrlForLog(
      initialSettings.ws.servers[initialSettings.ws.selectedIndex]?.url ?? "",
    )}`,
  );
  applyNativeTheme(initialSettings.ui.theme);
  applyLaunchAtLogin(initialSettings.appBehavior.launchAtLogin);
  const installationId = getOrCreateInstallationId({ adapter: storeAdapter });
  const resolveAuthBaseUrl = (): string =>
    firstConfiguredValue(
      process.env.AOA_BACKEND_BASE_URL,
      mainAppConfig.backendBaseUrl,
      configStore.get().backend.baseUrl,
    ) ?? configStore.get().backend.baseUrl;
  const authService = createAuthService({
    client: createAuthHttpClient({ baseUrl: resolveAuthBaseUrl() }),
    store: createAuthSessionStore({ adapter: storeAdapter, safeStorage }),
    device: {
      installationId,
      deviceName: os.hostname(),
      platform: resolveAuthDevicePlatform(process.platform),
      appVersion: app.getVersion(),
      locale: configStore.get().ui.language,
    },
    allowDevelopmentBypass: isDevelopmentRuntime,
    encryptLdapPassword,
  });
  const backendClient = createDevelopmentAwareBackendClient({
    backendClient: createHttpBackendClient({
      baseUrl: resolveAuthBaseUrl(),
      getAccessToken: () => authService.getAccessTokenForRequest(),
    }),
    isDevelopmentRuntime,
    getAuthSessionSnapshot: () => authService.getSessionSnapshot(),
  });
  const nativeBridge = createNativeBridge({
    loadHelper: () => ({
      copySelectionToClipboard,
      pasteFromClipboard,
      typeText,
      getForegroundWindowHandle,
      focusWindow,
      isEditableTargetFocused,
      muteOtherAppsForRecording,
      restoreOtherAppsAudio,
    }),
  });
  const clipboardService = createClipboardService({ clipboard });
  const insertService = createInsertService({
    clipboard: clipboardService,
    nativeBridge,
    restoreClipboardDelayMs:
      configStore.get().insertion.restoreClipboardDelayMs,
  });
  const selectionService = createSelectionService({
    clipboard: clipboardService,
    nativeBridge,
    copyDelayMs: SELECTION_COPY_DELAY_MS,
  });
  const audioDuckingService = createAudioDuckingService({
    bridge: nativeBridge,
    getSettings: () => configStore.get(),
    getExcludedProcessIds: () => getCurrentAppProcessIds(),
  });
  let insertTargetWindowHandle: string | undefined;
  let lastRecordingState = "idle";
  let lastRecordingMode: RecordingMode | undefined;
  let lastRecordingReason: string | undefined;
  let pendingHideTimer: NodeJS.Timeout | undefined;
  let refreshTrayTooltip = (_state: string): void => {};
  let configureShortcuts = (
    _shortcuts: AppSettings["shortcuts"],
  ): ShortcutConfigureResult => ({
    ok: true as const,
    registered: [],
  });
  let openHomeWindowForUpdateReady = (_payload: {
    version?: string;
  }): void => {};
  let openHomeWindowAfterLoginSetup = (): void => {};
  let loginSetupActive = false;
  let loginSetupNativeShortcutReleaseTimer: NodeJS.Timeout | undefined;
  const historyStore = createFileHistoryStore({
    rootDir: join(app.getPath("userData"), "history"),
    audioEncryptionKey: getOrCreateHistoryAudioEncryptionKey({
      adapter: storeAdapter,
      safeStorage,
    }),
  });

  function broadcastSettingsChanged(settings: AppSettings): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:settings-changed", settings);
      }
    }
  }

  function broadcastHistoryRecordCreated(
    record: Awaited<ReturnType<typeof historyStore.create>>,
  ): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:history-record-created", record);
      }
    }
  }

  function broadcastHistoryRecordDeleted(id: string): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:history-record-deleted", { id });
      }
    }
  }

  function broadcastUpdateReady(payload: { version?: string }): void {
    openHomeWindowForUpdateReady(payload);
  }

  function broadcastUpdateDownloadProgress(
    payload: UpdateDownloadProgressPayload,
  ): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:update-download-progress", payload);
      }
    }
  }

  // ASR 即時轉寫服務（主程序走 node ws + https-proxy-agent，避免瀏覽器原生 WS 不支援 proxy 的問題）。
  const transcriptionService = createMainTranscriptionService({
    getSettings: () => configStore.get(),
  });
  const uninstallService = createAppUninstallService();
  const versionCheckEndpoint = resolveVersionCheckEndpoint({
    backendBaseUrl: firstConfiguredValue(
      process.env.AOA_BACKEND_BASE_URL,
      mainAppConfig.backendBaseUrl,
    ),
    versionCheckUrl: firstConfiguredValue(
      process.env.AOA_VERSION_CHECK_URL,
      mainAppConfig.versionCheckUrl,
    ),
  });
  const versionPhase = resolvePackagedVersionPhase(__AOA_VERSION_PHASE__);
  const allowDevelopmentBackendUpdateCheck =
    process.env.AOA_DEV_BACKEND_UPDATE_CHECK === "1";
  console.log(
    `[bootstrap] update versionCheckEndpoint=${
      versionCheckEndpoint ? redactUrlForLog(versionCheckEndpoint) : "disabled"
    } phase=${versionPhase} devBackendCheck=${allowDevelopmentBackendUpdateCheck}`,
  );
  const updateService = createLazyUpdateService(
    () =>
      createUpdateService({
        allowDevelopmentBackendCheck:
          allowDevelopmentBackendUpdateCheck && Boolean(versionCheckEndpoint),
        autoUpdater: electronUpdater.autoUpdater,
        currentInstallDir: dirname(app.getPath("exe")),
        currentVersion: app.getVersion(),
        isPackaged: app.isPackaged,
        platform: resolveVersionPlatform(process.platform),
        quitApp: () => app.quit(),
        updateFeedUrl: process.env.AOA_UPDATE_FEED_URL,
        versionCheckClient: createHttpVersionCheckClient({
          endpoint: versionCheckEndpoint,
          phase: versionPhase,
        }),
        onUpdateReady: (payload) => {
          broadcastUpdateReady(payload);
        },
        onDownloadProgress: (payload) => {
          broadcastUpdateDownloadProgress(payload);
        },
        onError: (error) => {
          console.warn("[bootstrap] update check failed", error);
        },
      }),
    {
      isDisabled: () => loginSetupActive,
    },
  );

  registerIpcRoutes(createAuthenticatedIpcMainAdapter(ipcMain, authService), {
    authService,
    configStore,
    clipboard: clipboardService,
    insertService,
    selectionService,
    backendClient,
    transcriptionService,
    uninstallService,
    updateService,
    quitApp: () => app.quit(),
    historyStore,
    installationId,
    appInfo: {
      deviceName: os.hostname(),
      appVersion: app.getVersion(),
      isPackaged: !isDevelopmentRuntime,
    },
    getAppConfig: () => readAppConfig(appConfigPath),
    getInsertTargetWindowHandle: () => insertTargetWindowHandle,
    onSettingsUpdated: (settings) => {
      applyNativeTheme(settings.ui.theme);
      applyLaunchAtLogin(settings.appBehavior.launchAtLogin);
      configureShortcuts(settings.shortcuts);
      refreshTrayTooltip(lastRecordingState);
      audioDuckingService.handleSettingsChanged(settings);
      broadcastSettingsChanged(settings);
    },
    onHistoryRecordCreated: (record) => {
      broadcastHistoryRecordCreated(record);
    },
    onHistoryRecordDeleted: (id) => {
      broadcastHistoryRecordDeleted(id);
    },
  });
  console.log("[bootstrap] IPC 路由已註冊");
  let completeLoginSetup: (() => Promise<void>) | undefined;
  let releaseLoginSetupShortcutCapture = (): void => {};
  createAuthenticatedIpcMainAdapter(ipcMain, authService).handle(
    "voice:auth:complete-login-setup",
    async () => {
      releaseLoginSetupShortcutCapture();
      await completeLoginSetup?.();
      loginSetupActive = false;
    },
  );

  const broadcastAuthSessionChanged = (snapshot: AuthSessionSnapshot): void => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:auth:session-changed", snapshot);
      }
    }
  };
  authService.subscribe(broadcastAuthSessionChanged);

  let loginSetupWindow: BrowserWindow | undefined;
  let isLoginSetupShortcutCaptureActive = (): boolean => false;
  let latestLoginSetupSnapshot: AuthSessionSnapshot = {
    status: "unauthenticated",
  };
  const openPostInstallLoginOnLaunch =
    shouldOpenPostInstallLoginOnLaunch(process.argv);
  const showLoginSetupWindowWithLatestSnapshot = (): void => {
    if (!loginSetupWindow || loginSetupWindow.isDestroyed()) {
      return;
    }
    loginSetupWindow.show();
    loginSetupWindow.focus();
    loginSetupWindow.webContents.send(
      "voice:auth:session-changed",
      latestLoginSetupSnapshot,
    );
  };
  const openLoginSetupWindow = (snapshot: AuthSessionSnapshot): void => {
    loginSetupActive = true;
    latestLoginSetupSnapshot = snapshot;
    if (loginSetupWindow && !loginSetupWindow.isDestroyed()) {
      showLoginSetupWindowWithLatestSnapshot();
      return;
    }

    loginSetupWindow = createLoginSetupWindow({
      route: openPostInstallLoginOnLaunch ? "postInstallLogin" : "loginSetup",
    });
    wireLoginSetupShortcutCaptureWindowGuard(
      loginSetupWindow,
      () => isLoginSetupShortcutCaptureActive(),
      () => loginSetupWindow,
    );
    wireLoginSetupWindowVisibility(
      loginSetupWindow,
      showLoginSetupWindowWithLatestSnapshot,
    );
    loginSetupWindow.on("closed", () => {
      loginSetupWindow = undefined;
      loginSetupActive = false;
    });
  };
  const hideLoginSetupWindow = (): void => {
    loginSetupActive = false;
    if (loginSetupWindow && !loginSetupWindow.isDestroyed()) {
      loginSetupWindow.close();
    }
  };

  let stopAuthenticatedRuntime: (() => void) | undefined;

  async function startAuthenticatedRuntime(): Promise<void> {
    if (stopAuthenticatedRuntime) {
      return;
    }

    const overlayWindow = createOverlayWindow({
      theme: initialSettings.ui.theme,
    });
    blockHomeWindowAltSpaceMenu(overlayWindow);
    const overlayWindowFollower = createOverlayWindowFollower(overlayWindow);
    let homeWindow: import("electron").BrowserWindow | undefined;
    console.log("[bootstrap] 懸浮窗已建立");

    const cancelPendingOverlayHide = (): void => {
      if (!pendingHideTimer) {
        return;
      }
      clearTimeout(pendingHideTimer);
      pendingHideTimer = undefined;
    };

    const hideHomeWindowDuringExternalOverlay = (): void => {
      if (
        !insertTargetWindowHandle ||
        isCurrentAppWindowHandle(insertTargetWindowHandle) ||
        !homeWindow ||
        homeWindow.isDestroyed() ||
        !homeWindow.isVisible()
      ) {
        return;
      }
      homeWindow.hide();
    };

    const showOverlayWithLayout = (layout: OverlayWindowLayout): void => {
      cancelPendingOverlayHide();
      hideHomeWindowDuringExternalOverlay();
      applyOverlayWindowLayout(overlayWindow, layout);
      overlayWindow.setFocusable(false);
      if (!overlayWindow.isVisible()) {
        overlayWindow.showInactive();
      }
      overlayWindowFollower.start(layout);
    };

    const restoreInsertTargetFocusForOverlayInteraction = (): void => {
      const targetWindowHandle = insertTargetWindowHandle;
      if (
        !targetWindowHandle ||
        isCurrentAppWindowHandle(targetWindowHandle)
      ) {
        return;
      }
      void nativeBridge.focusWindow(targetWindowHandle).catch((error) => {
        console.warn(
          `[bootstrap] 懸浮窗點擊後恢復目標焦點失敗 handle=${targetWindowHandle}`,
          error,
        );
      });
    };

    const scheduleOverlayHide = (state: string): void => {
      cancelPendingOverlayHide();
      pendingHideTimer = setTimeout(() => {
        pendingHideTimer = undefined;
        if (overlayWindow.isDestroyed()) {
          return;
        }
        if (
          !shouldRunScheduledOverlayHide(
            lastRecordingState,
            lastRecordingReason,
          )
        ) {
          console.log(
            `[bootstrap] 跳過過期懸浮窗隱藏（scheduled=${state}, current=${lastRecordingState}）`,
          );
          return;
        }
        if (overlayWindow.isVisible()) {
          console.log(
            `[bootstrap] 延遲 ${OVERLAY_HIDE_DELAY_MS}ms 後隱藏懸浮窗（state=${state}）`,
          );
          overlayWindowFollower.stop();
          overlayWindow.hide();
        }
      }, OVERLAY_HIDE_DELAY_MS);
    };

    // 訂閱主程序 ASR 轉寫事件，序列化後轉發給 renderer，ipcTranscriptionProvider 會反序列化。
    const unsubscribeTranscriptionEvents = transcriptionService.subscribe(
      (event) => {
        if (
          overlayWindow.isDestroyed() ||
          overlayWindow.webContents.isDestroyed()
        ) {
          return;
        }
        const payload =
          event.type === "error"
            ? { type: "error" as const, message: event.error.message }
            : event;
        overlayWindow.webContents.send("voice:transcription-event", payload);
      },
    );

    // 將 renderer 程序的 console.log/warn/error 轉發到主程序終端，
    // 方便在 `pnpm dev` 終端裡直接看到 transcription provider / voiceController 等 renderer 側日誌，
    // 否則它們只會出現在 DevTools Console。level: 0=verbose 1=info 2=warning 3=error。
    overlayWindow.webContents.on(
      "console-message",
      (
        _event,
        level: number,
        message: string,
        line: number,
        sourceId: string,
      ) => {
        const location = sourceId ? ` (${sourceId}:${line})` : "";
        if (level >= 3) {
          console.error(`[renderer]${location} ${message}`);
        } else if (level === 2) {
          console.warn(`[renderer]${location} ${message}`);
        } else {
          console.log(`[renderer] ${message}`);
        }
      },
    );
    const shortcutManager = createShortcutManager(
      createNativeShortcutRegistrar(
        { configureKeyboardShortcuts, startKeyboardHook },
        {
          register: (accelerator, callback) =>
            globalShortcut.register(accelerator, callback),
          unregister: (accelerator) => globalShortcut.unregister(accelerator),
        },
        {
          isActive: () => loginSetupShortcutCaptureController.isActive(),
          onAccelerator: (accelerator) => {
            if (
              !loginSetupWindow ||
              loginSetupWindow.isDestroyed() ||
              loginSetupWindow.webContents.isDestroyed()
            ) {
              return;
            }
            if (loginSetupNativeShortcutReleaseTimer) {
              clearTimeout(loginSetupNativeShortcutReleaseTimer);
              loginSetupNativeShortcutReleaseTimer = undefined;
            }
            loginSetupWindow.webContents.send(
              "voice:login-setup-shortcut-capture-accelerator",
              { accelerator, state: "down" },
            );
            loginSetupNativeShortcutReleaseTimer = setTimeout(() => {
              loginSetupNativeShortcutReleaseTimer = undefined;
              if (
                !loginSetupWindow ||
                loginSetupWindow.isDestroyed() ||
                loginSetupWindow.webContents.isDestroyed()
              ) {
                return;
              }
              loginSetupWindow.webContents.send(
                "voice:login-setup-shortcut-capture-accelerator",
                { accelerator, state: "up" },
              );
            }, 160);
          },
        },
      ),
    );
    const shortcutCaptureSession = createShortcutCaptureSession();
    let currentShortcuts = configStore.get().shortcuts;
    let shortcutHelpVisible = false;

    const escCancelController = createEscCancelController({
      onTrigger: () => {
        if (
          overlayWindow.isDestroyed() ||
          overlayWindow.webContents.isDestroyed()
        ) {
          return;
        }
        overlayWindow.webContents.send("voice:cancel-requested");
      },
    });
    const willQuitHandler = () => {
      cancelPendingOverlayHide();
      if (loginSetupNativeShortcutReleaseTimer) {
        clearTimeout(loginSetupNativeShortcutReleaseTimer);
        loginSetupNativeShortcutReleaseTimer = undefined;
      }
      void audioDuckingService.restore();
      overlayWindowFollower.stop();
      shortcutCaptureSession.stop();
      escCancelController.dispose();
    };
    app.on("will-quit", willQuitHandler);

    const handleToggle = (
      mode: RecordingMode,
      options: {
        allowDuringShortcutCapture?: boolean;
        selectedText?: string;
        previewSelectedText?: string;
      } = {},
    ): void => {
      if (
        shortcutCaptureDepth > 0 &&
        options.allowDuringShortcutCapture !== true
      ) {
        console.log(`[bootstrap] 快捷鍵錄入中，忽略 toggle mode=${mode}`);
        return;
      }
      if (
        loginSetupActive &&
        options.allowDuringShortcutCapture !== true
      ) {
        console.log(`[bootstrap] 安裝向導中，忽略全域錄音快捷鍵 mode=${mode}`);
        return;
      }
      cancelPendingOverlayHide();
      console.log(`[bootstrap] handleToggle 觸發，mode=${mode}`);
      void (async () => {
        if (
          shouldReplayMicErrorOverlay(lastRecordingState, lastRecordingReason)
        ) {
          const layout = resolveShortcutTriggerOverlayLayout(
            lastRecordingState,
            mode,
            {
              ...(lastRecordingMode !== undefined
                ? { activeMode: lastRecordingMode }
                : {}),
              ...(lastRecordingReason ? { reason: lastRecordingReason } : {}),
            },
          );
          showOverlayWithLayout(layout);
          console.log(
            "[bootstrap] microphone error overlay already active; replay only",
          );
          return;
        }

        if (
          lastRecordingState === "idle" ||
          lastRecordingState === "success" ||
          lastRecordingState === "error"
        ) {
          try {
            const foregroundWindowHandle =
              await nativeBridge.getForegroundWindowHandle();
            insertTargetWindowHandle = isCurrentAppWindowHandle(
              foregroundWindowHandle,
            )
              ? undefined
              : foregroundWindowHandle;
            console.log(
              `[bootstrap] 已記錄插入目標視窗 handle=${insertTargetWindowHandle ?? "none"}` +
                (foregroundWindowHandle && !insertTargetWindowHandle
                  ? "（已忽略本應用視窗）"
                  : ""),
            );
          } catch (error) {
            insertTargetWindowHandle = undefined;
            console.warn("[bootstrap] 記錄插入目標視窗失敗", error);
          }
        }

        // 使用 showInactive 而非 show，避免搶走前臺焦點：
        // 否則 Ctrl+V 貼上會打到懸浮窗 WebContents，而不是使用者原本的游標位置。
        const layout = resolveShortcutTriggerOverlayLayout(
          lastRecordingState,
          mode,
          {
            ...(lastRecordingMode !== undefined
              ? { activeMode: lastRecordingMode }
              : {}),
            ...(lastRecordingReason !== undefined
              ? { reason: lastRecordingReason }
              : {}),
          },
        );
        if (
          resolveShortcutTriggerOverlayAction(mode, lastRecordingState) ===
          "show"
        ) {
          showOverlayWithLayout(layout);
        } else {
          applyOverlayWindowLayout(overlayWindow, layout);
        }
        overlayWindow.webContents.send("voice:toggle-recording", {
          mode,
          ...(options.selectedText !== undefined
            ? { selectedText: options.selectedText }
            : {}),
          ...(options.previewSelectedText !== undefined
            ? { previewSelectedText: options.previewSelectedText }
            : {}),
        });
        console.log(`[bootstrap] 已傳送 voice:toggle-recording，mode=${mode}`);
      })();
    };

    const handleShortcutHelp = (): void => {
      if (
        shortcutCaptureDepth > 0 ||
        !shouldShowShortcutHelpForState(lastRecordingState)
      ) {
        return;
      }
      const layout = resolveOverlayWindowLayout("shortcutHelp", undefined);
      showOverlayWithLayout(layout);
      shortcutHelpVisible = true;
      overlayWindow.webContents.send("voice:shortcut-help", {
        direct: formatShortcutHelpLabel(currentShortcuts.toggleRecording),
        processSelection: formatShortcutHelpLabel(
          currentShortcuts.processSelection,
        ),
        translate: formatShortcutHelpLabel(currentShortcuts.translateDictation),
      });
    };

    const handleShortcutHelpDismiss = (): void => {
      if (!shortcutHelpVisible) {
        return;
      }
      shortcutHelpVisible = false;
      overlayWindow.webContents.send("voice:shortcut-help-dismiss");
    };

    configureShortcuts = (shortcuts: AppSettings["shortcuts"]) => {
      currentShortcuts = shortcuts;
      console.log("[bootstrap] 配置快捷鍵：", shortcuts);
      const shortcutResult = shortcutManager.configure(shortcuts, {
        onToggle: handleToggle,
        onShortcutHelp: handleShortcutHelp,
        onShortcutHelpDismiss: handleShortcutHelpDismiss,
      });
      console.log(
        `[bootstrap] 快捷鍵註冊結果：ok=${shortcutResult.ok}` +
          (shortcutResult.ok
            ? ""
            : ` 衝突=${shortcutResult.conflicts.map((c) => c.accelerator).join(",")}` +
              (shortcutResult.failureReason
                ? ` reason=${shortcutResult.failureReason}`
                : "")),
      );
      if (!shortcutResult.ok) {
        broadcastShortcutConflict(
          shortcutResult.conflicts.map((c) => c.accelerator),
          shortcutResult.failureReason,
        );
      }
      return shortcutResult;
    };

    let shortcutCaptureDepth = 0;
    let shortcutCaptureTargetWindow: BrowserWindow | undefined;

    const resumeSuspendedShortcuts = (options: {
      broadcastConflicts: boolean;
    }): void => {
      const resumeResult = shortcutManager.resume();
      console.log(
        `[bootstrap] 已恢復全域性快捷鍵 ok=${resumeResult?.ok ?? false}`,
      );
      if (options.broadcastConflicts && resumeResult && !resumeResult.ok) {
        broadcastShortcutConflict(
          resumeResult.conflicts.map((c) => c.accelerator),
          resumeResult.failureReason,
        );
      } else if (!options.broadcastConflicts && resumeResult && !resumeResult.ok) {
        console.warn(
          `[bootstrap] 安裝向導恢復全域性快捷鍵失敗，已忽略設定頁衝突廣播 conflicts=${resumeResult.conflicts
            .map((c) => c.accelerator)
            .join(",")}`,
        );
      }
    };

    function setShortcutCaptureActive(
      active: boolean,
      targetWindow: BrowserWindow | undefined,
    ): void {
      if (active) {
        if (
          shortcutCaptureDepth === 0 &&
          !loginSetupShortcutCaptureController.isActive()
        ) {
          shortcutManager.suspend();
        }
        if (shortcutCaptureDepth === 0) {
          shortcutCaptureTargetWindow = targetWindow;
          ensureShortcutCaptureWindowGuards(
            BrowserWindow.getAllWindows(),
            () => shortcutCaptureDepth > 0,
            () => shortcutCaptureTargetWindow,
          );
          try {
            shortcutCaptureSession.start();
            shortcutCaptureDepth = 1;
          } catch (error) {
            shortcutCaptureSession.stop();
            if (!loginSetupShortcutCaptureController.isActive()) {
              resumeSuspendedShortcuts({ broadcastConflicts: true });
            }
            throw error;
          }
          console.log("[bootstrap] 快捷鍵錄入模式：已暫停全域性快捷鍵");
        } else {
          shortcutCaptureTargetWindow =
            targetWindow ?? shortcutCaptureTargetWindow;
          shortcutCaptureDepth += 1;
        }
        return;
      }

      if (shortcutCaptureDepth === 0) {
        return;
      }

      shortcutCaptureDepth -= 1;
      if (shortcutCaptureDepth === 0) {
        shortcutCaptureTargetWindow = undefined;
        shortcutCaptureSession.stop();
        if (!loginSetupShortcutCaptureController.isActive()) {
          resumeSuspendedShortcuts({ broadcastConflicts: true });
        }
      }
    }

    const loginSetupShortcutCaptureController =
      createLoginSetupShortcutCaptureController({
        getShortcutCaptureDepth: () => shortcutCaptureDepth,
        suspendGlobalShortcuts: () => shortcutManager.suspend(),
        resumeGlobalShortcuts: resumeSuspendedShortcuts,
        ensureWindowGuards: () => {
          ensureLoginSetupShortcutCaptureWindowGuards(
            BrowserWindow.getAllWindows(),
            () => loginSetupShortcutCaptureController.isActive(),
            () => loginSetupWindow,
          );
        },
        startShortcutCaptureSession: () => {
          shortcutCaptureSession.start();
        },
        stopShortcutCaptureSession: () => {
          if (shortcutCaptureDepth === 0) {
            shortcutCaptureSession.stop();
          }
        },
      });
    isLoginSetupShortcutCaptureActive = () =>
      loginSetupShortcutCaptureController.isActive();

    function setLoginSetupShortcutCaptureActive(active: boolean): void {
      loginSetupShortcutCaptureController.setActive(active);
    }

    releaseLoginSetupShortcutCapture = loginSetupShortcutCaptureController.clear;

    function broadcastShortcutConflict(
      conflicts: string[],
      reason?: string,
    ): void {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send("voice:shortcut-conflict", {
            conflicts,
            ...(reason ? { reason } : {}),
          });
        }
      }
    }

    function broadcastRecordingStateChanged(update: {
      state: string;
      mode?: RecordingMode | undefined;
      reason?: string | undefined;
      recordingLimitWarning?: boolean;
      busyHintVisible?: boolean;
    }): void {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send("voice:recording-state-changed", update);
        }
      }
    }

    const initialShortcutResult = configureShortcuts(
      configStore.get().shortcuts,
    );
    void updateService.checkForUpdates();

    // 托盤圖示：開發態從 app.getAppPath()/resources 讀取；打包後從 process.resourcesPath 讀取，
    // 需要在 electron-builder 的 extraResources 中把 resources/app-icon.ico 投放到 resources 目錄。
    const trayIconPath = resolveRuntimeAppIconPath();
    const tray = createTray({
      onOpenHome: () =>
        runLoggedTrayAction(
          console,
          "open-home",
          undefined,
          () => openHomeWindow(),
          { revealSensitive: !app.isPackaged },
        ),
      onOpenHistory: () =>
        runLoggedTrayAction(
          console,
          "open-history",
          { section: "history" },
          () => openHomeWindow({ section: "history" }),
          { revealSensitive: !app.isPackaged },
        ),
      onOpenSettings: () =>
        runLoggedTrayAction(
          console,
          "open-settings",
          { section: "settings" },
          () => openHomeWindow({ section: "settings" }),
          { revealSensitive: !app.isPackaged },
        ),
      onCheckUpdates: () =>
        runLoggedTrayAction(
          console,
          "check-updates",
          { section: "about", showUpdates: true },
          () => openHomeWindow({ section: "about", showUpdates: true }),
          { revealSensitive: !app.isPackaged },
        ),
      onOpenAbout: () =>
        runLoggedTrayAction(
          console,
          "open-about",
          { section: "about" },
          () => openHomeWindow({ section: "about" }),
          { revealSensitive: !app.isPackaged },
        ),
      onQuit: () =>
        runLoggedTrayAction(
          console,
          "quit",
          undefined,
          () => app.quit(),
          { revealSensitive: !app.isPackaged },
        ),
      iconPath: trayIconPath,
    });
    refreshTrayTooltip = (state) => {
      tray.setToolTip(formatTrayTooltip(state, configStore.get().ui.language));
    };
    refreshTrayTooltip("idle");

    // 首頁視窗採用單例模式：托盤雙擊開啟首頁；托盤選單「設定」開啟首頁並喚起設定彈層。
    function openHomeWindow(
      options: {
        section?: "home" | "history" | "settings" | "about";
        showUpdates?: boolean;
        showMicrophoneHelp?: boolean;
        updateReady?: { version?: string };
        onboardingStep?: number;
      } = {},
    ): void {
      if (homeWindow && !homeWindow.isDestroyed()) {
        blockHomeWindowAltSpaceMenu(homeWindow);
        if (homeWindow.isMinimized()) homeWindow.restore();
        homeWindow.show();
        homeWindow.focus();
        homeWindow.webContents.send(
          "voice:open-home-section",
          options.section ?? "home",
        );
        if (options.section === "settings") {
          homeWindow.webContents.send("voice:open-settings-panel");
        }
        if (options.showUpdates) {
          homeWindow.webContents.send("voice:open-update-dialog");
        }
        if (options.showMicrophoneHelp) {
          homeWindow.webContents.send("voice:open-microphone-help");
        }
        if (options.onboardingStep !== undefined) {
          homeWindow.webContents.send(
            "voice:open-onboarding-step",
            options.onboardingStep,
          );
        }
        if (options.updateReady) {
          homeWindow.webContents.send(
            "voice:update-ready",
            options.updateReady,
          );
        }
        return;
      }
      homeWindow = createHomeWindow({
        ...(options.section ? { section: options.section } : {}),
        ...(options.onboardingStep !== undefined
          ? { onboardingStep: options.onboardingStep }
          : {}),
        theme: configStore.get().ui.theme,
      });
      wireShortcutCaptureWindowGuard(
        homeWindow,
        () => shortcutCaptureDepth > 0,
      );
      wireLoginSetupShortcutCaptureWindowGuard(
        homeWindow,
        () => loginSetupShortcutCaptureController.isActive(),
        () => loginSetupWindow,
      );
      homeWindow.once("ready-to-show", () => {
        homeWindow?.show();
        homeWindow?.focus();
        if (options.showUpdates) {
          homeWindow?.webContents.send("voice:open-update-dialog");
        }
        if (options.showMicrophoneHelp) {
          homeWindow?.webContents.send("voice:open-microphone-help");
        }
        if (options.onboardingStep !== undefined) {
          homeWindow?.webContents.send(
            "voice:open-onboarding-step",
            options.onboardingStep,
          );
        }
        if (options.updateReady) {
          homeWindow?.webContents.send(
            "voice:update-ready",
            options.updateReady,
          );
        }
      });
      homeWindow.on("closed", () => {
        homeWindow = undefined;
      });
    }
    openHomeWindowForUpdateReady = (payload) => {
      openHomeWindow({ section: "about", updateReady: payload });
    };
    openHomeWindowAfterLoginSetup = () => {
      openHomeWindow();
    };

    const runAuthenticatedDirectIpcRequest = (
      channel: string,
      action: () => void,
    ): void => {
      void runAuthenticatedDirectIpc(authService, action).catch((error) => {
        logDirectIpcError(console, channel, error);
      });
    };

    const openHomeSectionRequestHandler = (
      _event: IpcMainEvent,
      input: unknown,
    ) => {
      runAuthenticatedDirectIpcRequest(
        "voice:open-home-section-request",
        () => {
          withDirectIpcLogging("voice:open-home-section-request", input, () => {
            const request =
              typeof input === "object" && input !== null
                ? (input as {
                    section?: unknown;
                    onboardingStep?: unknown;
                  })
                : {};
            const section =
              request.section === "history" ||
              request.section === "settings" ||
              request.section === "about" ||
              request.section === "home"
                ? request.section
                : "home";
            const onboardingStep =
              typeof request.onboardingStep === "number" &&
              Number.isInteger(request.onboardingStep) &&
              request.onboardingStep >= 0
                ? request.onboardingStep
                : undefined;
            openHomeWindow({
              section,
              ...(onboardingStep !== undefined ? { onboardingStep } : {}),
            });
          });
        },
      );
    };
    ipcMain.on(
      "voice:open-home-section-request",
      openHomeSectionRequestHandler,
    );

    const openMicrophoneHelpRequestHandler = () => {
      runAuthenticatedDirectIpcRequest(
        "voice:open-microphone-help-request",
        () => {
          withDirectIpcLogging(
            "voice:open-microphone-help-request",
            undefined,
            () => {
              handleOpenMicrophoneHelpRequest({
                overlayWindow,
                overlayWindowFollower,
                cancelPendingOverlayHide,
                openHomeWindow,
              });
            },
          );
        },
      );
    };
    ipcMain.on(
      "voice:open-microphone-help-request",
      openMicrophoneHelpRequestHandler,
    );
    const overlayInteractionHandler = (): void => {
      restoreInsertTargetFocusForOverlayInteraction();
    };
    ipcMain.on("voice:overlay-interaction", overlayInteractionHandler);

    if (shouldOpenHomeOnLaunch(process.argv)) {
      runLoggedBootstrapAction(
        console,
        "open-home-on-launch",
        { argv: summarizeArgvForLog(process.argv) },
        () => openHomeWindow(),
        { revealSensitive: !app.isPackaged },
      );
    }

    // 監聽 renderer 上報的錄音狀態，更新托盤 tooltip（僅開啟/關閉兩態），並控制懸浮窗顯隱。
    // 用定時器控制代碼保證"快速切換"場景下最終顯隱意圖以最後一次 state 為準，不會出現閃爍或延遲隱藏。
    const reportRecordingStateHandler = (
      _event: IpcMainEvent,
      update:
        | {
            state: string;
            mode?: RecordingMode | undefined;
            reason?: string | undefined;
            recordingLimitWarning?: boolean;
            busyHintVisible?: boolean;
          }
        | undefined,
    ) => {
      runAuthenticatedDirectIpcRequest("voice:report-recording-state", () => {
        withDirectIpcLogging("voice:report-recording-state", update, () => {
          const state =
            typeof update?.state === "string" ? update.state : "idle";
          const recordingStateUpdate = {
            state,
            ...(update?.mode !== undefined ? { mode: update.mode } : {}),
            ...(update?.reason !== undefined ? { reason: update.reason } : {}),
            ...(update?.recordingLimitWarning !== undefined
              ? { recordingLimitWarning: update.recordingLimitWarning }
              : {}),
            ...(update?.busyHintVisible !== undefined
              ? { busyHintVisible: update.busyHintVisible }
              : {}),
          };
          lastRecordingState = state;
          lastRecordingMode =
            state === "idle" || state === "success" ? undefined : update?.mode;
          lastRecordingReason = state === "error" ? update?.reason : undefined;
          audioDuckingService.handleRecordingState({
            state,
            mode: update?.mode,
          });
          broadcastRecordingStateChanged(recordingStateUpdate);
          if (state !== "idle" && state !== "shortcutHelp") {
            shortcutHelpVisible = false;
          }
          const tooltip = formatTrayTooltip(
            state,
            configStore.get().ui.language,
          );
          const visibility = resolveOverlayVisibility(state, update?.reason);
          console.log(
            `[bootstrap] 收到錄音狀態 state=${state} mode=${update?.mode ?? "無"} → tooltip="${tooltip}" overlay=${visibility}`,
          );
          tray.setToolTip(tooltip);

          const layout = resolveOverlayWindowLayout(state, update?.mode, {
            ...(update?.reason !== undefined ? { reason: update.reason } : {}),
            recordingLimitWarning: update?.recordingLimitWarning === true,
            busyHintVisible: update?.busyHintVisible === true,
          });
          if (shouldEnableEscCancelForState(state)) {
            escCancelController.enable();
          } else {
            escCancelController.disable();
          }

          if (visibility === "show") {
            showOverlayWithLayout(layout);
          } else if (visibility === "hide") {
            scheduleOverlayHide(state);
          } else {
            cancelPendingOverlayHide();
            if (overlayWindow.isVisible()) {
              applyOverlayWindowLayout(overlayWindow, layout);
              overlayWindowFollower.start(layout);
            }
          }
          // visibility === "keep"：error 態，保持當前顯隱不變，讓使用者看到錯誤提示。
        });
      });
    };
    ipcMain.on("voice:report-recording-state", reportRecordingStateHandler);

    const triggerRecordingHandler = (
      _event: IpcMainEvent,
      input:
        | {
            mode?: RecordingMode;
            selectedText?: string;
            previewSelectedText?: string;
            loginSetupTrial?: boolean;
          }
        | undefined,
    ) => {
      runAuthenticatedDirectIpcRequest("voice:trigger-recording", () => {
        withDirectIpcLogging("voice:trigger-recording", input, () => {
          if (loginSetupActive && input?.loginSetupTrial !== true) {
            console.log("[bootstrap] 安裝向導中，忽略非試用頁錄音觸發");
            return;
          }
          const mode =
            input?.mode === "processSelection" || input?.mode === "translate"
              ? input.mode
              : "direct";
          handleToggle(mode, {
            allowDuringShortcutCapture: true,
            ...(typeof input?.selectedText === "string"
              ? { selectedText: input.selectedText }
              : {}),
            ...(typeof input?.previewSelectedText === "string"
              ? { previewSelectedText: input.previewSelectedText }
              : {}),
          });
        });
      });
    };
    ipcMain.on("voice:trigger-recording", triggerRecordingHandler);

    const setShortcutCaptureActiveHandler = (
      event: IpcMainInvokeEvent,
      payload: { active?: boolean } | undefined,
    ) => {
      return runAuthenticatedDirectIpc(authService, () =>
        withDirectIpcLogging(
          "voice:set-shortcut-capture-active",
          payload,
          () => {
            setShortcutCaptureActive(
              payload?.active === true,
              BrowserWindow.fromWebContents(event.sender) ?? undefined,
            );
          },
        ),
      );
    };
    ipcMain.handle(
      "voice:set-shortcut-capture-active",
      setShortcutCaptureActiveHandler,
    );

    const setLoginSetupShortcutCaptureActiveHandler = (
      _event: IpcMainInvokeEvent,
      payload: { active?: boolean } | undefined,
    ) => {
      return withDirectIpcLogging(
        "voice:set-login-setup-shortcut-capture-active",
        payload,
        () => {
          setLoginSetupShortcutCaptureActive(payload?.active === true);
        },
      );
    };
    ipcMain.handle(
      "voice:set-login-setup-shortcut-capture-active",
      setLoginSetupShortcutCaptureActiveHandler,
    );

    if (!initialShortcutResult.ok) {
      overlayWindow.showInactive();
      const payload = {
        conflicts: initialShortcutResult.conflicts.map(
          (entry) => entry.accelerator,
        ),
        ...(initialShortcutResult.failureReason
          ? { reason: initialShortcutResult.failureReason }
          : {}),
      };
      const sendConflict = (): void => {
        if (
          overlayWindow.isDestroyed() ||
          overlayWindow.webContents.isDestroyed()
        ) {
          return;
        }
        console.log("[bootstrap] 傳送 voice:shortcut-conflict", payload);
        overlayWindow.webContents.send("voice:shortcut-conflict", payload);
      };
      // webContents 若尚未載入完成，直接 send 會丟失訊息；等待 did-finish-load 後再發。
      if (overlayWindow.webContents.isLoading()) {
        console.log("[bootstrap] 懸浮窗仍在載入，延遲傳送 shortcut-conflict");
        overlayWindow.webContents.once("did-finish-load", sendConflict);
      } else {
        sendConflict();
      }
    }

    stopAuthenticatedRuntime = () => {
      cancelPendingOverlayHide();
      void audioDuckingService.restore();
      overlayWindowFollower.stop();
      shortcutCaptureSession.stop();
      escCancelController.dispose();
      shortcutManager.dispose();
      releaseLoginSetupShortcutCapture = (): void => {};
      unsubscribeTranscriptionEvents();
      app.removeListener("will-quit", willQuitHandler);
      ipcMain.removeListener(
        "voice:open-home-section-request",
        openHomeSectionRequestHandler,
      );
      ipcMain.removeListener(
        "voice:open-microphone-help-request",
        openMicrophoneHelpRequestHandler,
      );
      ipcMain.removeListener(
        "voice:overlay-interaction",
        overlayInteractionHandler,
      );
      ipcMain.removeListener(
        "voice:report-recording-state",
        reportRecordingStateHandler,
      );
      ipcMain.removeListener("voice:trigger-recording", triggerRecordingHandler);
      ipcMain.removeHandler("voice:set-shortcut-capture-active");
      ipcMain.removeHandler("voice:set-login-setup-shortcut-capture-active");
      if (homeWindow && !homeWindow.isDestroyed()) {
        homeWindow.close();
      }
      if (!overlayWindow.isDestroyed()) {
        overlayWindow.close();
      }
      tray.destroy();
      refreshTrayTooltip = (_state: string): void => {};
      configureShortcuts = (
        _shortcuts: AppSettings["shortcuts"],
      ): ShortcutConfigureResult => ({
        ok: true as const,
        registered: [],
      });
      openHomeWindowForUpdateReady = (_payload: {
        version?: string;
      }): void => {};
      openHomeWindowAfterLoginSetup = (): void => {};
      updateService.dispose?.();
      lastRecordingState = "idle";
      lastRecordingMode = undefined;
      lastRecordingReason = undefined;
      insertTargetWindowHandle = undefined;
    };

    console.log("[bootstrap] 啟動完成");
  }

  await runStartupGate({
    authService,
    startAuthenticatedRuntime,
    stopAuthenticatedRuntime: () => {
      stopAuthenticatedRuntime?.();
      stopAuthenticatedRuntime = undefined;
    },
    showLoginSetupWindow: openLoginSetupWindow,
    hideLoginSetupWindow,
    openHomeWindowAfterLoginSetup: () => openHomeWindowAfterLoginSetup(),
    forceLoginSetupOnAuthenticatedRestore: openPostInstallLoginOnLaunch,
    openHomeWindowOnAuthenticatedRestore: isDevelopmentRuntime,
    onLoginSetupReady: (complete) => {
      completeLoginSetup = complete;
    },
  });
}

function resolveVersionPlatform(platform: NodeJS.Platform): VersionPlatform {
  if (platform === "darwin") {
    return "MAC";
  }
  if (platform === "linux") {
    return "LINUX";
  }
  return "WINDOWS";
}

export function resolveAuthDevicePlatform(
  platform: NodeJS.Platform,
): "windows" | "mac" | "linux" {
  if (platform === "darwin") {
    return "mac";
  }
  if (platform === "linux") {
    return "linux";
  }
  return "windows";
}

export function resolvePackagedVersionPhase(
  phase: string | undefined,
): VersionPhase {
  const normalized = phase?.trim().toUpperCase();
  if (
    normalized === "ALPHA" ||
    normalized === "BETA" ||
    normalized === "RELEASE"
  ) {
    return normalized;
  }
  return "ALPHA";
}

export function resolveVersionCheckEndpoint({
  backendBaseUrl,
  versionCheckUrl,
}: {
  backendBaseUrl?: string | undefined;
  versionCheckUrl?: string | undefined;
}): string | undefined {
  const normalizedVersionCheckUrl = versionCheckUrl?.trim();
  if (normalizedVersionCheckUrl) {
    return normalizedVersionCheckUrl;
  }
  const normalizedBackendBaseUrl = backendBaseUrl?.trim();
  if (!normalizedBackendBaseUrl) {
    return undefined;
  }
  const baseUrl = normalizedBackendBaseUrl.endsWith("/")
    ? normalizedBackendBaseUrl
    : `${normalizedBackendBaseUrl}/`;
  return new URL("appVersion/check", baseUrl).toString();
}

export function firstConfiguredValue(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

export function redactUrlForLog(input: string): string {
  return sanitizeUrlForLog(input);
}

export function summarizeArgvForLog(argv: readonly string[]): {
  count: number;
  flags: string[];
} {
  return {
    count: argv.length,
    flags: argv
      .filter((arg) => arg.startsWith("--") || arg.startsWith("/"))
      .map((arg) => arg.split("=", 1)[0] ?? ""),
  };
}

export interface DirectIpcLogger {
  log(message: string): void;
  warn(message: string): void;
}

export function runLoggedTrayAction<T>(
  logger: Pick<DirectIpcLogger, "log" | "warn">,
  action: string,
  input: unknown,
  task: () => T,
  options: { revealSensitive?: boolean } = {},
): T {
  return runLoggedAction(logger, "[tray] action", action, input, task, options);
}

export function runLoggedBootstrapAction<T>(
  logger: Pick<DirectIpcLogger, "log" | "warn">,
  action: string,
  input: unknown,
  task: () => T,
  options: { revealSensitive?: boolean } = {},
): T {
  return runLoggedAction(
    logger,
    "[bootstrap-action]",
    action,
    input,
    task,
    options,
  );
}

function runLoggedAction<T>(
  logger: Pick<DirectIpcLogger, "log" | "warn">,
  prefix: string,
  action: string,
  input: unknown,
  task: () => T,
  options: { revealSensitive?: boolean } = {},
): T {
  const logOptions = { revealSensitive: options.revealSensitive === true };
  logger.log(
    `${prefix} ${formatLogFields({
      action,
      ...(input === undefined ? {} : { input }),
    }, logOptions)}`,
  );
  try {
    const result = task();
    if (isPromiseLike(result)) {
      return result.then(
        (value) => {
          logger.log(
            `${prefix} ${formatLogFields({ action, status: "ok" }, logOptions)}`,
          );
          return value;
        },
        (error: unknown) => {
          logger.warn(
            `${prefix} ${formatLogFields({
              action,
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            }, logOptions)}`,
          );
          throw error;
        },
      ) as T;
    }
    logger.log(`${prefix} ${formatLogFields({ action, status: "ok" }, logOptions)}`);
    return result;
  } catch (error) {
    logger.warn(
      `${prefix} ${formatLogFields({
        action,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      }, logOptions)}`,
    );
    throw error;
  }
}

export function logDirectIpcRequest(
  logger: Pick<DirectIpcLogger, "log">,
  channel: string,
  input?: unknown,
  options: { revealSensitive?: boolean } = {},
): void {
  const logOptions = { revealSensitive: options.revealSensitive === true };
  logger.log(
    `[ipc-direct] request ${formatLogFields({
      channel,
      ...(input === undefined ? {} : { input }),
    }, logOptions)}`,
  );
}

export function logDirectIpcResponse(
  logger: Pick<DirectIpcLogger, "log">,
  channel: string,
  status: "ok",
): void {
  logger.log(`[ipc-direct] response ${formatLogFields({ channel, status })}`);
}

export function logDirectIpcError(
  logger: Pick<DirectIpcLogger, "warn">,
  channel: string,
  error: unknown,
): void {
  logger.warn(
    `[ipc-direct] response ${formatLogFields({
      channel,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    })}`,
  );
}

function withDirectIpcLogging<T>(
  channel: string,
  input: unknown,
  action: () => T,
): T {
  logDirectIpcRequest(console, channel, input);
  try {
    const result = action();
    if (isPromiseLike(result)) {
      return result.then(
        (value) => {
          logDirectIpcResponse(console, channel, "ok");
          return value;
        },
        (error: unknown) => {
          logDirectIpcError(console, channel, error);
          throw error;
        },
      ) as T;
    }
    logDirectIpcResponse(console, channel, "ok");
    return result;
  } catch (error) {
    logDirectIpcError(console, channel, error);
    throw error;
  }
}

function isPromiseLike<T>(
  input: T | PromiseLike<Awaited<T>>,
): input is PromiseLike<Awaited<T>> {
  return (
    typeof input === "object" &&
    input !== null &&
    "then" in input &&
    typeof input.then === "function"
  );
}

function shouldOpenUninstallWindow(argv: readonly string[]): boolean {
  return argv.some((arg) => arg === "--uninstall" || arg === "/uninstall");
}

function createAppUninstallService(): UninstallService {
  return createUninstallService({
    app,
    executablePath: process.execPath,
    platform: process.platform,
  });
}

function createAppInstallerService(): InstallerService {
  return createInstallerService({
    productName: INSTALL_TARGET_PRODUCT_NAME,
    resourcesPath: process.resourcesPath,
    localAppData:
      process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
  });
}

function getCurrentAppProcessIds(): number[] {
  const processIds = new Set<number>([process.pid]);
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed() || window.webContents.isDestroyed()) {
      continue;
    }
    const rendererProcessId = window.webContents.getOSProcessId();
    if (rendererProcessId > 0) {
      processIds.add(rendererProcessId);
    }
  }
  return [...processIds];
}

function registerUninstallOnlyIpc(
  uninstallService: UninstallService,
  options: { onFinish?: () => void } = {},
): void {
  ipcMain.handle("voice:perform-uninstall", (_event, input) =>
    withDirectIpcLogging("voice:perform-uninstall", input, () =>
      uninstallService.performUninstall(),
    ),
  );
  ipcMain.handle("voice:cancel-uninstall", (_event, input) => {
    return withDirectIpcLogging("voice:cancel-uninstall", input, () => {
      app.exit(1);
      return undefined;
    });
  });
  ipcMain.handle("voice:finish-uninstall", (_event, input) => {
    return withDirectIpcLogging("voice:finish-uninstall", input, () => {
      if (options.onFinish) {
        options.onFinish();
      } else {
        app.quit();
      }
      return undefined;
    });
  });
}

function registerInstallerOnlyIpc(installerService: InstallerService): void {
  ipcMain.handle("voice:installer-get-defaults", (_event, input) =>
    withDirectIpcLogging("voice:installer-get-defaults", input, () =>
      installerService.getDefaults(),
    ),
  );
  ipcMain.handle("voice:installer-select-directory", async (_event, input) => {
    return withDirectIpcLogging(
      "voice:installer-select-directory",
      input,
      async () => {
        const defaultPath =
          typeof input === "object" &&
          input !== null &&
          "defaultPath" in input &&
          typeof input.defaultPath === "string"
            ? input.defaultPath
            : installerService.getDefaults().installDir;
        const result = await dialog.showOpenDialog({
          title: "选择安装位置",
          defaultPath,
          properties: ["openDirectory", "createDirectory"],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true as const };
        }

        return {
          canceled: false as const,
          installDir: installerService.normalizeInstallDir(
            result.filePaths[0] ?? defaultPath,
          ),
        };
      },
    );
  });
  ipcMain.handle("voice:installer-install", (_event, input) => {
    return withDirectIpcLogging("voice:installer-install", input, () =>
      installerService.install(parseInstallerShellInstallInput(input)),
    );
  });
  ipcMain.handle("voice:installer-launch", (event, input) => {
    return withDirectIpcLogging("voice:installer-launch", input, () => {
      const installDir =
        typeof input === "object" &&
        input !== null &&
        "installDir" in input &&
        typeof input.installDir === "string"
          ? input.installDir
          : installerService.getDefaults().installDir;
      return handoffInstallerLaunch({
        installerWindow: BrowserWindow.fromWebContents(event.sender),
        installDir,
        isDevelopmentRuntime: resolveDevelopmentRuntime({
          isPackaged: app.isPackaged,
          electronRendererUrl: process.env.ELECTRON_RENDERER_URL,
        }),
        platform: process.platform,
        appPath: app.getAppPath(),
        execPath: process.execPath,
      });
    });
  });
}

function parseInstallerShellInstallInput(
  input: unknown,
): InstallerShellInstallInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Installer input must be an object");
  }
  const candidate = input as Partial<InstallerShellInstallInput>;
  if (
    typeof candidate.installDir !== "string" ||
    !candidate.installDir.trim()
  ) {
    throw new Error("Installer input requires installDir");
  }
  return {
    installDir: candidate.installDir,
    createDesktopShortcut: candidate.createDesktopShortcut !== false,
    launchAtLogin: candidate.launchAtLogin !== false,
    updated: candidate.updated === true,
  };
}

function openInstallerWindow(): void {
  const installerWindow = createInstallerWindow();
  installerWindow.once("ready-to-show", () => {
    installerWindow.show();
    installerWindow.focus();
  });
}

function openUninstallWindow(options: { onClosed?: () => void } = {}): void {
  const uninstallWindow = createUninstallWindow();
  const showUninstallWindow = (): void => {
    if (uninstallWindow.isDestroyed()) {
      return;
    }
    uninstallWindow.show();
    uninstallWindow.focus();
  };
  if (options.onClosed) {
    uninstallWindow.once("closed", options.onClosed);
  }
  uninstallWindow.once("ready-to-show", showUninstallWindow);
  uninstallWindow.webContents.once("did-finish-load", showUninstallWindow);
  uninstallWindow.webContents.once(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      console.error(
        `[bootstrap] uninstall window failed to load code=${errorCode} description=${errorDescription}`,
      );
      showUninstallWindow();
    },
  );
}

const HISTORY_AUDIO_ENCRYPTION_KEY_STORAGE_KEY = "history.audioEncryptionKey";
const HISTORY_AUDIO_ENCRYPTION_KEY_BYTES = 32;

interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

interface StoredHistoryAudioEncryptionKey {
  v: 1;
  protection: "safeStorage" | "plain";
  value: string;
}

function getOrCreateHistoryAudioEncryptionKey(options: {
  adapter: ConfigStorageAdapter;
  safeStorage: SafeStorageLike;
}): Buffer {
  const existing = readHistoryAudioEncryptionKey(options);
  if (existing) {
    return existing;
  }

  const generated = randomBytes(HISTORY_AUDIO_ENCRYPTION_KEY_BYTES);
  writeHistoryAudioEncryptionKey(options, generated);
  return generated;
}

function readHistoryAudioEncryptionKey(options: {
  adapter: ConfigStorageAdapter;
  safeStorage: SafeStorageLike;
}): Buffer | undefined {
  const stored = options.adapter.get(HISTORY_AUDIO_ENCRYPTION_KEY_STORAGE_KEY);
  if (!isStoredHistoryAudioEncryptionKey(stored)) {
    return typeof stored === "string"
      ? decodeHistoryAudioEncryptionKey(stored)
      : undefined;
  }

  if (stored.protection === "safeStorage") {
    if (!options.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "History audio encryption key is protected by safeStorage, but safeStorage is unavailable.",
      );
    }
    return decodeHistoryAudioEncryptionKey(
      options.safeStorage.decryptString(Buffer.from(stored.value, "base64")),
    );
  }

  return decodeHistoryAudioEncryptionKey(stored.value);
}

function writeHistoryAudioEncryptionKey(
  options: {
    adapter: ConfigStorageAdapter;
    safeStorage: SafeStorageLike;
  },
  key: Buffer,
): void {
  const base64Key = key.toString("base64");
  const stored: StoredHistoryAudioEncryptionKey =
    options.safeStorage.isEncryptionAvailable()
      ? {
          v: 1,
          protection: "safeStorage",
          value: options.safeStorage
            .encryptString(base64Key)
            .toString("base64"),
        }
      : {
          v: 1,
          protection: "plain",
          value: base64Key,
        };
  options.adapter.set(HISTORY_AUDIO_ENCRYPTION_KEY_STORAGE_KEY, stored);
}

function decodeHistoryAudioEncryptionKey(value: string): Buffer | undefined {
  try {
    const key = Buffer.from(value, "base64");
    return key.byteLength === HISTORY_AUDIO_ENCRYPTION_KEY_BYTES
      ? key
      : undefined;
  } catch {
    return undefined;
  }
}

function isStoredHistoryAudioEncryptionKey(
  value: unknown,
): value is StoredHistoryAudioEncryptionKey {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<StoredHistoryAudioEncryptionKey>;
  return (
    candidate.v === 1 &&
    (candidate.protection === "safeStorage" ||
      candidate.protection === "plain") &&
    typeof candidate.value === "string"
  );
}
