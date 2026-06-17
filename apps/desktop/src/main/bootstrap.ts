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
} from "electron";
import ElectronStore from "electron-store";
import electronUpdater from "electron-updater";
import {
  createDefaultSettings,
  type AppSettings,
  type InterfaceLanguage,
  type RecordingMode,
} from "@voice/shared";
import { createMockBackendClient } from "@voice/backend-client";
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
import { getOrCreateInstallationId } from "./installation/installationId";
import { createFileHistoryStore } from "./history/historyStore";
import { applyPendingInstallOptions, resolvePendingInstallOptionsPath } from "./installer/installOptions";
import {
  createInstallerService,
  resolveInstallerModeMarkerPath,
  shouldOpenInstallerShell,
  type InstallerService,
  type InstallerShellInstallInput,
} from "./installer/installerService";
import { createInsertService } from "./insertion/insertService";
import { registerIpcRoutes } from "./ipc/ipcRoutes";
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
import { createShortcutManager } from "./shortcuts/shortcutManager";
import { createMainTranscriptionService } from "./transcription/mainTranscriptionService";
import { createTray } from "./tray/createTray";
import {
  createUpdateService,
  type UpdateDownloadProgressPayload,
} from "./update/updateService";
import {
  createHttpVersionCheckClient,
  type VersionPhase,
  type VersionPlatform
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
import { resolveRuntimeAppIconPath } from "./windows/appIcon";
import { createHomeWindow } from "./windows/createHomeWindow";
import { createInstallerWindow } from "./windows/createInstallerWindow";
import { createUninstallWindow } from "./windows/createUninstallWindow";
import {
  blockHomeWindowAltSpaceMenu,
  ensureShortcutCaptureWindowGuards,
  wireShortcutCaptureWindowGuard,
} from "./windows/shortcutCaptureWindowGuard";
import { registerWindowControlIpc } from "./windows/windowControlIpc";

declare const __AOA_VERSION_PHASE__: string | undefined;

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
  if (
    mode === "direct" &&
    (lastState === "idle" || lastState === "success")
  ) {
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

export function formatShortcutHelpLabel(shortcut: string): string {
  return shortcut
    .split("+")
    .map((part) => {
      switch (part.trim()) {
        case "RightAlt":
        case "LeftAlt":
        case "Alt":
          return "Alt";
        case "RightShift":
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
  openHomeWindow(options: {
    section: "home";
    showMicrophoneHelp: true;
  }): void;
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
const INSTALL_TARGET_PRODUCT_NAME = "Voice Assistant";
const WINDOWS_APP_USER_MODEL_ID = "com.ctm.voice-assistant";
const OPEN_HOME_ON_LAUNCH_ARGS = new Set(["--open-home", "/open-home"]);
const SILENT_UPDATE_ARGS = new Set(["--silent-update", "/silent-update"]);

export function configureAppIdentity(platform: NodeJS.Platform = process.platform): void {
  app.setName(INSTALL_TARGET_PRODUCT_NAME);
  if (platform === "win32") {
    app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
  }
}

export function shouldOpenHomeOnLaunch(argv: readonly string[]): boolean {
  return argv.some((arg) => OPEN_HOME_ON_LAUNCH_ARGS.has(arg.toLowerCase()));
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

export function launchInstalledAppHome(input: {
  installDir: string;
  productName?: string;
  spawnProcess?: typeof spawn;
}): void {
  const spawnProcess = input.spawnProcess ?? spawn;
  const productName = input.productName ?? INSTALL_TARGET_PRODUCT_NAME;
  const child = spawnProcess(
    join(input.installDir, `${productName}.exe`),
    ["--open-home"],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    } satisfies SpawnOptions,
  );
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
  launch?: (input: { installDir: string }) => void;
  exitApp?: (exitCode: number) => void;
}): void {
  const installerWindow = input.installerWindow;
  if (installerWindow && !installerWindow.isDestroyed()) {
    installerWindow.hide();
    installerWindow.destroy();
  }

  const launch = input.launch ?? launchInstalledAppHome;
  const exitApp = input.exitApp ?? ((exitCode: number) => app.exit(exitCode));
  setTimeout(() => {
    launch({ installDir: input.installDir });
    exitApp(0);
  }, 0);
}

export async function bootstrap(): Promise<void> {
  configureAppIdentity();
  configureLogSanitizer({ revealSensitive: !app.isPackaged });
  registerWindowControlIpc(ipcMain);
  if (!app.isPackaged) {
    const loadedEnvKeys = applyLocalEnvFiles([
      join(app.getAppPath(), "..", "..", ".env"),
      join(app.getAppPath(), ".env"),
    ]);
    if (loadedEnvKeys.length > 0) {
      console.log(`[bootstrap] loaded local env keys=${loadedEnvKeys.join(",")}`);
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
        launchInstalledAppHome({ installDir: silentUpdateInstallDir });
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
  const appConfigPath = resolveAppConfigPath({
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
  });
  console.log(
    `[bootstrap] runtime packaged=${app.isPackaged} appPath=${app.getAppPath()} resourcesPath=${process.resourcesPath} appConfigPath=${appConfigPath}`,
  );
  const mainAppConfig = await readMainAppConfig(appConfigPath);
  const configStore = createConfigStore({
    adapter: storeAdapter,
    defaults: createDefaultSettings({ isPackaged: app.isPackaged }),
  });
  applyPendingInstallOptions({
    installOptionsPath: resolvePendingInstallOptionsPath({
      isPackaged: app.isPackaged,
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
  const backendClient = createMockBackendClient();
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
  const historyStore = createFileHistoryStore({
    rootDir: join(app.getPath("userData"), "history"),
    audioEncryptionKey: getOrCreateHistoryAudioEncryptionKey({
      adapter: storeAdapter,
      safeStorage,
    }),
  });

  // ASR 即時轉寫服務（主程序走 node ws + https-proxy-agent，避免瀏覽器原生 WS 不支援 proxy 的問題）。
  const transcriptionService = createMainTranscriptionService({
    getSettings: () => configStore.get(),
    revealSensitiveLogs: !app.isPackaged,
  });
  const uninstallService = createAppUninstallService();
  const versionCheckEndpoint = resolveVersionCheckEndpoint({
    backendBaseUrl: firstConfiguredValue(
      process.env.AOA_BACKEND_BASE_URL,
      mainAppConfig.backendBaseUrl
    ),
    versionCheckUrl: firstConfiguredValue(
      process.env.AOA_VERSION_CHECK_URL,
      mainAppConfig.versionCheckUrl
    ),
  });
  const versionPhase = resolvePackagedVersionPhase(__AOA_VERSION_PHASE__);
  console.log(
    `[bootstrap] update versionCheckEndpoint=${
      versionCheckEndpoint ? redactUrlForLog(versionCheckEndpoint) : "disabled"
    } phase=${versionPhase}`
  );
  const updateService = createUpdateService({
    allowDevelopmentBackendCheck: Boolean(versionCheckEndpoint),
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
  });

  registerIpcRoutes(
    ipcMain,
    {
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
    },
    { revealSensitiveLogs: !app.isPackaged },
  );
  console.log("[bootstrap] IPC 路由已註冊");

  const overlayWindow = createOverlayWindow({ theme: initialSettings.ui.theme });
  blockHomeWindowAltSpaceMenu(overlayWindow);
  const overlayWindowFollower = createOverlayWindowFollower(overlayWindow);
  console.log("[bootstrap] 懸浮窗已建立");

  const cancelPendingOverlayHide = (): void => {
    if (!pendingHideTimer) {
      return;
    }
    clearTimeout(pendingHideTimer);
    pendingHideTimer = undefined;
  };

  const showOverlayWithLayout = (layout: OverlayWindowLayout): void => {
    cancelPendingOverlayHide();
    applyOverlayWindowLayout(overlayWindow, layout);
    if (!overlayWindow.isVisible()) {
      overlayWindow.showInactive();
    }
    overlayWindowFollower.start(layout);
  };

  const scheduleOverlayHide = (state: string): void => {
    cancelPendingOverlayHide();
    pendingHideTimer = setTimeout(() => {
      pendingHideTimer = undefined;
      if (overlayWindow.isDestroyed()) {
        return;
      }
      if (!shouldRunScheduledOverlayHide(lastRecordingState, lastRecordingReason)) {
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
  transcriptionService.subscribe((event) => {
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
  });

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
  app.on("will-quit", () => {
    cancelPendingOverlayHide();
    void audioDuckingService.restore();
    overlayWindowFollower.stop();
    shortcutCaptureSession.stop();
    escCancelController.dispose();
  });

  const handleToggle = (mode: RecordingMode): void => {
    if (shortcutCaptureDepth > 0) {
      console.log(`[bootstrap] 快捷鍵錄入中，忽略 toggle mode=${mode}`);
      return;
    }
    cancelPendingOverlayHide();
    console.log(`[bootstrap] handleToggle 觸發，mode=${mode}`);
    void (async () => {
      if (shouldReplayMicErrorOverlay(lastRecordingState, lastRecordingReason)) {
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
        console.log("[bootstrap] microphone error overlay already active; replay only");
        return;
      }

      if (
        lastRecordingState === "idle" ||
        lastRecordingState === "success" ||
        lastRecordingState === "error"
      ) {
        try {
          insertTargetWindowHandle =
            await nativeBridge.getForegroundWindowHandle();
          console.log(
            `[bootstrap] 已記錄插入目標視窗 handle=${insertTargetWindowHandle ?? "none"}`,
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
      if (resolveShortcutTriggerOverlayAction(mode, lastRecordingState) === "show") {
        showOverlayWithLayout(layout);
      } else {
        applyOverlayWindowLayout(overlayWindow, layout);
      }
      overlayWindow.webContents.send("voice:toggle-recording", { mode });
      console.log(`[bootstrap] 已傳送 voice:toggle-recording，mode=${mode}`);
    })();
  };

  const handleShortcutHelp = (): void => {
    if (shortcutCaptureDepth > 0 || !shouldShowShortcutHelpForState(lastRecordingState)) {
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

  function configureShortcuts(shortcuts: AppSettings["shortcuts"]) {
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
          : ` 衝突=${shortcutResult.conflicts.map((c) => c.accelerator).join(",")}`),
    );
    if (!shortcutResult.ok) {
      broadcastShortcutConflict(
        shortcutResult.conflicts.map((c) => c.accelerator),
      );
    }
    return shortcutResult;
  }

  let shortcutCaptureDepth = 0;
  let shortcutCaptureTargetWindow: BrowserWindow | undefined;

  function setShortcutCaptureActive(
    active: boolean,
    targetWindow: BrowserWindow | undefined,
  ): void {
    if (active) {
      if (shortcutCaptureDepth === 0) {
        shortcutCaptureTargetWindow = targetWindow;
        shortcutManager.suspend();
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
          const resumeResult = shortcutManager.resume();
          if (resumeResult && !resumeResult.ok) {
            broadcastShortcutConflict(
              resumeResult.conflicts.map((c) => c.accelerator),
            );
          }
          throw error;
        }
        console.log("[bootstrap] 快捷鍵錄入模式：已暫停全域性快捷鍵");
      } else {
        shortcutCaptureTargetWindow = targetWindow ?? shortcutCaptureTargetWindow;
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
      const resumeResult = shortcutManager.resume();
      console.log(
        `[bootstrap] 快捷鍵錄入模式：已恢復全域性快捷鍵 ok=${resumeResult?.ok ?? false}`,
      );
      if (resumeResult && !resumeResult.ok) {
        broadcastShortcutConflict(
          resumeResult.conflicts.map((c) => c.accelerator),
        );
      }
    }
  }

  function broadcastShortcutConflict(conflicts: string[]): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:shortcut-conflict", { conflicts });
      }
    }
  }

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
    openHomeWindow({ section: "about", updateReady: payload });
  }

  function broadcastUpdateDownloadProgress(payload: UpdateDownloadProgressPayload): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send("voice:update-download-progress", payload);
      }
    }
  }

  const initialShortcutResult = configureShortcuts(configStore.get().shortcuts);
  void updateService.checkForUpdates();

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
      runLoggedTrayAction(console, "open-history", { section: "history" }, () =>
        openHomeWindow({ section: "history" }),
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
      runLoggedTrayAction(console, "open-about", { section: "about" }, () =>
        openHomeWindow({ section: "about" }),
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
  let homeWindow: import("electron").BrowserWindow | undefined;
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
        homeWindow.webContents.send("voice:update-ready", options.updateReady);
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
    wireShortcutCaptureWindowGuard(homeWindow, () => shortcutCaptureDepth > 0);
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
        homeWindow?.webContents.send("voice:update-ready", options.updateReady);
      }
    });
    homeWindow.on("closed", () => {
      homeWindow = undefined;
    });
  }

  ipcMain.on("voice:open-home-section-request", (_event, input: unknown) => {
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
  });

  ipcMain.on("voice:open-microphone-help-request", () => {
    withDirectIpcLogging("voice:open-microphone-help-request", undefined, () => {
      handleOpenMicrophoneHelpRequest({
        overlayWindow,
        overlayWindowFollower,
        cancelPendingOverlayHide,
        openHomeWindow,
      });
    });
  });

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
  ipcMain.on(
    "voice:report-recording-state",
    (
      _event,
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
      withDirectIpcLogging("voice:report-recording-state", update, () => {
        const state = typeof update?.state === "string" ? update.state : "idle";
        lastRecordingState = state;
        lastRecordingMode =
          state === "idle" || state === "success" ? undefined : update?.mode;
        lastRecordingReason = state === "error" ? update?.reason : undefined;
        audioDuckingService.handleRecordingState({
          state,
          mode: update?.mode,
        });
        if (state !== "idle" && state !== "shortcutHelp") {
          shortcutHelpVisible = false;
        }
        const tooltip = formatTrayTooltip(state, configStore.get().ui.language);
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
    },
  );

  ipcMain.handle(
    "voice:set-shortcut-capture-active",
    (event, payload: { active?: boolean } | undefined) => {
      return withDirectIpcLogging(
        "voice:set-shortcut-capture-active",
        payload,
        () => {
          setShortcutCaptureActive(
            payload?.active === true,
            BrowserWindow.fromWebContents(event.sender) ?? undefined,
          );
        },
      );
    },
  );

  if (!initialShortcutResult.ok) {
    overlayWindow.showInactive();
    const payload = {
      conflicts: initialShortcutResult.conflicts.map(
        (entry) => entry.accelerator,
      ),
    };
    const sendConflict = (): void => {
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
  console.log("[bootstrap] 啟動完成");
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

export function resolvePackagedVersionPhase(
  phase: string | undefined
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
  versionCheckUrl
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
    localAppData: process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
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
    return withDirectIpcLogging("voice:installer-select-directory", input, async () => {
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
        installDir: installerService.normalizeInstallDir(result.filePaths[0] ?? defaultPath),
      };
    });
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
      handoffInstallerLaunch({
        installerWindow: BrowserWindow.fromWebContents(event.sender),
        installDir,
      });
      return undefined;
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
  if (typeof candidate.installDir !== "string" || !candidate.installDir.trim()) {
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

function openUninstallWindow(
  options: { onClosed?: () => void } = {},
): void {
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
  uninstallWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(
      `[bootstrap] uninstall window failed to load code=${errorCode} description=${errorDescription}`,
    );
    showUninstallWindow();
  });
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
