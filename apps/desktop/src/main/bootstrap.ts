import os, { homedir, tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
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
  shell,
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
  pasteFromClipboard,
  startKeyboardHook,
  typeText,
} from "@voice/native-helper";
import { createClipboardService } from "./clipboard/clipboardService";
import {
  createConfigStore,
  type ConfigStorageAdapter,
} from "./config/configStore";
import { readAppConfig, resolveAppConfigPath } from "./config/appConfig";
import { createElectronStoreAdapter } from "./config/electronStoreAdapter";
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
import { createNativeBridge } from "./native/nativeBridge";
import {
  createAosoPostprocessClient,
  createLlmPostprocessService,
} from "./postprocess/llmPostprocessService";
import { createSelectionService } from "./selection/selectionService";
import {
  createEscCancelController,
  shouldEnableEscCancelForState,
} from "./shortcuts/escCancelController";
import { createNativeShortcutRegistrar } from "./shortcuts/nativeShortcutRegistrar";
import { createShortcutManager } from "./shortcuts/shortcutManager";
import { createMainTranscriptionService } from "./transcription/mainTranscriptionService";
import { createTray } from "./tray/createTray";
import { createUpdateService } from "./update/updateService";
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
import { createUninstallWindow } from "./windows/createUninstallWindow";
import {
  blockHomeWindowAltSpaceMenu,
  ensureShortcutCaptureWindowGuards,
  wireShortcutCaptureWindowGuard,
} from "./windows/shortcutCaptureWindowGuard";
import { registerWindowControlIpc } from "./windows/windowControlIpc";

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
export function resolveOverlayVisibility(state: string): OverlayVisibility {
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
    default:
      return "keep";
  }
}

export function resolveOverlayWindowLayout(
  state: string,
  _mode: RecordingMode | undefined,
  options: { recordingLimitWarning?: boolean } = {},
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
  if (state === "processing" || state === "inserting" || state === "error") {
    return "thinkingPill";
  }
  return "pill";
}

/** 隱藏延遲：success/idle 直接 0ms 即時隱藏，避免短暫閃現 Thinking 後的預設膠囊面板。 */
export type ShortcutTriggerOverlayAction = "defer" | "show";

export function resolveShortcutTriggerOverlayAction(): ShortcutTriggerOverlayAction {
  return "defer";
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
  return state === "idle";
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

export async function bootstrap(): Promise<void> {
  registerWindowControlIpc(ipcMain);
  if (
    shouldOpenInstallerShell(
      process.argv,
      existsSync(resolveInstallerModeMarkerPath(process.resourcesPath)),
    )
  ) {
    registerInstallerOnlyIpc(createAppInstallerService());
    openInstallerWindow();
    return;
  }
  if (shouldOpenUninstallWindow(process.argv)) {
    registerUninstallOnlyIpc(createAppUninstallService());
    openUninstallWindow();
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
    `[bootstrap] settings developer.enabled=${initialSettings.developer.enabled} wsUrl=${initialSettings.ws.servers[initialSettings.ws.selectedIndex]?.url ?? ""}`,
  );
  applyNativeTheme(initialSettings.ui.theme);
  applyLaunchAtLogin(initialSettings.appBehavior.launchAtLogin);
  const installationId = getOrCreateInstallationId({ adapter: storeAdapter });
  const backendClient = createMockBackendClient();
  const postprocessService = createLlmPostprocessService({
    getSettings: () => configStore.get(),
    postprocessClient: createAosoPostprocessClient(),
  });
  const nativeBridge = createNativeBridge({
    loadHelper: () => ({
      copySelectionToClipboard,
      pasteFromClipboard,
      typeText,
      getForegroundWindowHandle,
      focusWindow,
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
  let insertTargetWindowHandle: string | undefined;
  let lastRecordingState = "idle";
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
  });
  const uninstallService = createAppUninstallService();
  const updateService = createUpdateService({
    autoUpdater: electronUpdater.autoUpdater,
    isPackaged: app.isPackaged,
    updateFeedUrl: process.env.AOA_UPDATE_FEED_URL,
    onUpdateReady: (payload) => {
      broadcastUpdateReady(payload);
    },
    onError: (error) => {
      console.warn("[bootstrap] update check failed", error);
    },
  });

  registerIpcRoutes(ipcMain, {
    configStore,
    clipboard: clipboardService,
    insertService,
    selectionService,
    backendClient,
    postprocessService,
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

  const overlayWindow = createOverlayWindow();
  blockHomeWindowAltSpaceMenu(overlayWindow);
  const overlayWindowFollower = createOverlayWindowFollower(overlayWindow);
  console.log("[bootstrap] 懸浮窗已建立");

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
    overlayWindowFollower.stop();
    escCancelController.dispose();
  });

  const handleToggle = (mode: RecordingMode): void => {
    if (shortcutCaptureDepth > 0) {
      console.log(`[bootstrap] 快捷鍵錄入中，忽略 toggle mode=${mode}`);
      return;
    }
    console.log(`[bootstrap] handleToggle 觸發，mode=${mode}`);
    void (async () => {
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
      const shortcutLayoutState =
        lastRecordingState === "processing" ||
        lastRecordingState === "inserting" ||
        lastRecordingState === "error"
          ? lastRecordingState
          : "listening";
      const layout = resolveOverlayWindowLayout(shortcutLayoutState, mode);
      applyOverlayWindowLayout(overlayWindow, layout);
      if (resolveShortcutTriggerOverlayAction() === "show") {
        overlayWindow.showInactive();
        overlayWindowFollower.start(layout);
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
    applyOverlayWindowLayout(overlayWindow, layout);
    overlayWindow.showInactive();
    overlayWindowFollower.start(layout);
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

  function setShortcutCaptureActive(active: boolean): void {
    if (active) {
      shortcutCaptureDepth += 1;
      if (shortcutCaptureDepth === 1) {
        shortcutManager.suspend();
        ensureShortcutCaptureWindowGuards(
          BrowserWindow.getAllWindows(),
          () => shortcutCaptureDepth > 0,
        );
        console.log("[bootstrap] 快捷鍵錄入模式：已暫停全域性快捷鍵");
      }
      return;
    }

    if (shortcutCaptureDepth === 0) {
      return;
    }

    shortcutCaptureDepth -= 1;
    if (shortcutCaptureDepth === 0) {
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

  const initialShortcutResult = configureShortcuts(configStore.get().shortcuts);
  void updateService.checkForUpdates();

  // 托盤圖示：開發態從 app.getAppPath()/resources 讀取；打包後從 process.resourcesPath 讀取，
  // 需要在 electron-builder 的 extraResources 中把 resources/app-icon.ico 投放到 resources 目錄。
  const trayIconPath = app.isPackaged
    ? join(process.resourcesPath, "app-icon.ico")
    : join(app.getAppPath(), "resources", "app-icon.ico");
  const tray = createTray({
    onOpenHome: () => openHomeWindow(),
    onOpenHistory: () => openHomeWindow({ section: "history" }),
    onOpenSettings: () => openHomeWindow({ section: "settings" }),
    onCheckUpdates: () => openHomeWindow({ section: "about", showUpdates: true }),
    onOpenAbout: () => openHomeWindow({ section: "about" }),
    onOpenUninstall: () => openUninstallWindow(),
    onQuit: () => app.quit(),
    versionLabel: `v${app.getVersion()}`,
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
      updateReady?: { version?: string };
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
      if (options.updateReady) {
        homeWindow.webContents.send("voice:update-ready", options.updateReady);
      }
      return;
    }
    homeWindow = createHomeWindow({
      ...(options.section ? { section: options.section } : {}),
      theme: configStore.get().ui.theme,
    });
    wireShortcutCaptureWindowGuard(homeWindow, () => shortcutCaptureDepth > 0);
    homeWindow.once("ready-to-show", () => {
      homeWindow?.show();
      homeWindow?.focus();
      if (options.showUpdates) {
        homeWindow?.webContents.send("voice:open-update-dialog");
      }
      if (options.updateReady) {
        homeWindow?.webContents.send("voice:update-ready", options.updateReady);
      }
    });
    homeWindow.on("closed", () => {
      homeWindow = undefined;
    });
  }

  // 監聽 renderer 上報的錄音狀態，更新托盤 tooltip（僅開啟/關閉兩態），並控制懸浮窗顯隱。
  // 用定時器控制代碼保證"快速切換"場景下最終顯隱意圖以最後一次 state 為準，不會出現閃爍或延遲隱藏。
  let pendingHideTimer: NodeJS.Timeout | undefined;
  ipcMain.on(
    "voice:report-recording-state",
    (
      _event,
      update:
        | {
            state: string;
            mode?: RecordingMode | undefined;
            recordingLimitWarning?: boolean;
          }
        | undefined,
    ) => {
      const state = typeof update?.state === "string" ? update.state : "idle";
      lastRecordingState = state;
      if (state !== "idle" && state !== "shortcutHelp") {
        shortcutHelpVisible = false;
      }
      const tooltip = formatTrayTooltip(state, configStore.get().ui.language);
      const visibility = resolveOverlayVisibility(state);
      console.log(
        `[bootstrap] 收到錄音狀態 state=${state} mode=${update?.mode ?? "無"} → tooltip="${tooltip}" overlay=${visibility}`,
      );
      tray.setToolTip(tooltip);

      const layout = resolveOverlayWindowLayout(state, update?.mode, {
        recordingLimitWarning: update?.recordingLimitWarning === true,
      });
      applyOverlayWindowLayout(overlayWindow, layout);
      overlayWindowFollower.updateLayout(layout);

      if (shouldEnableEscCancelForState(state)) {
        escCancelController.enable();
      } else {
        escCancelController.disable();
      }

      if (visibility === "show") {
        if (pendingHideTimer) {
          clearTimeout(pendingHideTimer);
          pendingHideTimer = undefined;
        }
        if (!overlayWindow.isVisible()) {
          overlayWindow.showInactive();
        }
        overlayWindowFollower.start(layout);
      } else if (visibility === "hide") {
        if (pendingHideTimer) {
          clearTimeout(pendingHideTimer);
        }
        pendingHideTimer = setTimeout(() => {
          pendingHideTimer = undefined;
          if (overlayWindow.isDestroyed()) {
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
      } else {
        if (overlayWindow.isVisible()) {
          overlayWindowFollower.start(layout);
        }
      }
      // visibility === "keep"：error 態，保持當前顯隱不變，讓使用者看到錯誤提示。
    },
  );

  ipcMain.handle(
    "voice:set-shortcut-capture-active",
    (_event, payload: { active?: boolean } | undefined) => {
      setShortcutCaptureActive(payload?.active === true);
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

function shouldOpenUninstallWindow(argv: readonly string[]): boolean {
  return argv.some((arg) => arg === "--uninstall" || arg === "/uninstall");
}

function createAppUninstallService(): UninstallService {
  return createUninstallService({
    app,
    executablePath: process.execPath,
    pid: process.pid,
    platform: process.platform,
    tempDir: tmpdir(),
  });
}

function createAppInstallerService(): InstallerService {
  return createInstallerService({
    productName: INSTALL_TARGET_PRODUCT_NAME,
    resourcesPath: process.resourcesPath,
    localAppData: process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"),
  });
}

function registerUninstallOnlyIpc(uninstallService: UninstallService): void {
  ipcMain.handle("voice:perform-uninstall", () =>
    uninstallService.performUninstall(),
  );
  ipcMain.handle("voice:finish-uninstall", () => {
    app.quit();
    return undefined;
  });
}

function registerInstallerOnlyIpc(installerService: InstallerService): void {
  ipcMain.handle("voice:installer-get-defaults", () =>
    installerService.getDefaults(),
  );
  ipcMain.handle("voice:installer-select-directory", async (_event, input) => {
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
  ipcMain.handle("voice:installer-install", (_event, input) => {
    return installerService.install(parseInstallerShellInstallInput(input));
  });
  ipcMain.handle("voice:installer-launch", (_event, input) => {
    const installDir =
      typeof input === "object" &&
      input !== null &&
      "installDir" in input &&
      typeof input.installDir === "string"
        ? input.installDir
        : installerService.getDefaults().installDir;
    void shell.openPath(join(installDir, `${INSTALL_TARGET_PRODUCT_NAME}.exe`));
    app.quit();
    return undefined;
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
  };
}

function openInstallerWindow(): void {
  const installerWindow = createInstallerWindow();
  installerWindow.once("ready-to-show", () => {
    installerWindow.show();
    installerWindow.focus();
  });
}

function openUninstallWindow(): void {
  const uninstallWindow = createUninstallWindow();
  uninstallWindow.once("ready-to-show", () => {
    uninstallWindow.show();
    uninstallWindow.focus();
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
