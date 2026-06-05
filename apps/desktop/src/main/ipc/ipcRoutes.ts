import type {
  AppContext,
  BackendClient,
  ClientBootstrapSnapshot,
  PostprocessResult,
  ServiceStatusSnapshot,
  TranscriptionSession
} from "@voice/backend-client";
import type { ClipboardService } from "../clipboard/clipboardService";
import type { ConfigStore } from "../config/configStore";
import type { HistoryStore } from "../history/historyStore";
import type { InsertResult, InsertService } from "../insertion/insertService";
import type { SelectionService } from "../selection/selectionService";
import type { TranscriptionStopResult, MainTranscriptionService } from "../transcription/mainTranscriptionService";
import type { UpdateCheckResult, UpdateService } from "../update/updateService";
import type {
  UninstallResult,
  UninstallService
} from "../uninstall/uninstallService";
import type { AppSettings, HistoryRetention } from "@voice/shared";
import {
  type ConnectivityTestResult,
  testLlm,
  testWebSocket
} from "../connectivity/connectivityService";
import {
  parseApplyHistoryRetentionInput,
  parseAudioFrameInput,
  parseCopyTextInput,
  parseCreateHistoryRecordInput,
  parseCreateTranscriptionSessionInput,
  parseDeleteHistoryRecordInput,
  parseUpdateHistoryRecordInput,
  parseTranscriptionStartInput,
  parseInsertTextInput,
  parsePostprocessInput,
  parseReplaceSelectedTextInput,
  parseSettingsPatchInput,
  parseTestLlmInput,
  parseTestWebSocketInput
} from "./ipcSchemas";

export interface IpcAppInfo {
  deviceName: string;
  appVersion: string;
}

export interface IpcRouteDependencies {
  configStore: Pick<ConfigStore, "get" | "update">;
  clipboard: Pick<ClipboardService, "writeText">;
  insertService: InsertService;
  selectionService: Pick<SelectionService, "getSelectedText">;
  backendClient: BackendClient;
  postprocessService: Pick<BackendClient, "postprocess">;
  transcriptionService: MainTranscriptionService;
  uninstallService: UninstallService;
  updateService: Pick<UpdateService, "checkForUpdates" | "restartToUpdate">;
  quitApp(): void;
  historyStore: HistoryStore;
  installationId: string;
  appInfo: IpcAppInfo;
  getAppConfig?: () => Promise<unknown>;
  getInsertTargetWindowHandle?: () => string | undefined;
  onSettingsUpdated?(settings: ReturnType<ConfigStore["get"]>): void;
  onHistoryRecordCreated?(record: Awaited<ReturnType<HistoryStore["create"]>>): void;
  onHistoryRecordDeleted?(id: string): void;
}

export interface BootstrapClientResponse extends ClientBootstrapSnapshot {
  installationId: string;
}

export interface IpcRouteHandlers {
  getAppInfo(): IpcAppInfo;
  getAppConfig(): Promise<unknown>;
  getSettings(): ReturnType<ConfigStore["get"]>;
  updateSettings(input: unknown): ReturnType<ConfigStore["update"]>;
  copyText(input: unknown): void;
  insertText(input: unknown): Promise<InsertResult>;
  replaceSelectedText(input: unknown): Promise<InsertResult>;
  bootstrapClient(): Promise<BootstrapClientResponse>;
  getServiceStatus(): Promise<ServiceStatusSnapshot>;
  createTranscriptionSession(input: unknown): Promise<TranscriptionSession>;
  postprocess(input: unknown): Promise<PostprocessResult>;
  getSelectedText(): Promise<string>;
  getActiveWindow(): Promise<AppContext>;
  testWebSocket(input: unknown): Promise<ConnectivityTestResult>;
  testLlm(input: unknown): Promise<ConnectivityTestResult>;
  startTranscription(input: unknown): Promise<void>;
  sendTranscriptionAudio(input: unknown): void;
  stopTranscription(): Promise<TranscriptionStopResult>;
  cancelTranscription(): Promise<void>;
  performUninstall(): Promise<UninstallResult>;
  finishUninstall(): void;
  checkForUpdates(): Promise<UpdateCheckResult>;
  restartToUpdate(): void;
  createHistoryRecord(input: unknown): ReturnType<HistoryStore["create"]>;
  updateHistoryRecord(input: unknown): ReturnType<HistoryStore["update"]>;
  listHistoryRecords(): ReturnType<HistoryStore["list"]>;
  readHistoryAudio(input: unknown): ReturnType<HistoryStore["readAudio"]>;
  deleteHistoryRecord(input: unknown): Promise<{ deleted: boolean }>;
  applyHistoryRetention(input: unknown): Promise<{
    settings: ReturnType<ConfigStore["update"]>;
    deletedIds: string[];
  }>;
}

export function createIpcRouteHandlers(
  dependencies: IpcRouteDependencies
): IpcRouteHandlers {
  return {
    getAppInfo: () => dependencies.appInfo,
    getAppConfig: async () => dependencies.getAppConfig?.(),
    getSettings: () => dependencies.configStore.get(),
    updateSettings: (input) => {
      const settings = dependencies.configStore.update(parseSettingsPatchInput(input));
      dependencies.onSettingsUpdated?.(settings);
      return settings;
    },
    copyText: (input) => {
      const { text } = parseCopyTextInput(input);
      dependencies.clipboard.writeText(text);
    },
    insertText: (input) => {
      const { text } = parseInsertTextInput(input);
      const settings = dependencies.configStore.get();
      return dependencies.insertService.insertText(text, {
        strategy: settings.insertion.strategy,
        targetWindowHandle: dependencies.getInsertTargetWindowHandle?.()
      });
    },
    replaceSelectedText: async (input) => {
      const { text, expectedSelectedText } = parseReplaceSelectedTextInput(input);
      const settings = dependencies.configStore.get();
      const strategy = settings.insertion.strategy;
      const targetWindowHandle = dependencies.getInsertTargetWindowHandle?.();
      const currentSelectedText =
        await dependencies.selectionService.getSelectedText(targetWindowHandle);

      if (
        currentSelectedText &&
        expectedSelectedText !== undefined &&
        normalizeSelectionText(currentSelectedText) !==
          normalizeSelectionText(expectedSelectedText)
      ) {
        return createReplacementFailure(
          strategy,
          text,
          "Selected text changed before replacement"
        );
      }

      return dependencies.insertService.insertText(text, {
        strategy,
        targetWindowHandle
      });
    },
    bootstrapClient: async () => {
      const snapshot = await dependencies.backendClient.bootstrap({
        installationId: dependencies.installationId,
        deviceName: dependencies.appInfo.deviceName,
        platform: "windows",
        appVersion: dependencies.appInfo.appVersion
      });
      return { ...snapshot, installationId: dependencies.installationId };
    },
    getServiceStatus: () =>
      dependencies.backendClient.getServiceStatus(dependencies.installationId),
    createTranscriptionSession: (input) =>
      dependencies.backendClient.createTranscriptionSession(
        parseCreateTranscriptionSessionInput(input)
      ),
    postprocess: (input) =>
      dependencies.postprocessService.postprocess(parsePostprocessInput(input)),
    getSelectedText: () =>
      dependencies.selectionService.getSelectedText(
        dependencies.getInsertTargetWindowHandle?.()
      ),
    // MVP：active window metadata 尚未支持，先返回占位 AppContext
    getActiveWindow: async () => ({
      platform: "windows",
      appName: "Unknown",
      windowTitle: ""
    }),
    testWebSocket: (input) => testWebSocket(parseTestWebSocketInput(input)),
    testLlm: (input) => testLlm(parseTestLlmInput(input)),
    startTranscription: (input) =>
      dependencies.transcriptionService.start(
        parseTranscriptionStartInput(input)
      ),
    sendTranscriptionAudio: (input) => {
      dependencies.transcriptionService.sendAudio(parseAudioFrameInput(input));
    },
    stopTranscription: () => dependencies.transcriptionService.stop(),
    cancelTranscription: () => dependencies.transcriptionService.cancel(),
    performUninstall: () => dependencies.uninstallService.performUninstall(),
    finishUninstall: () => {
      dependencies.quitApp();
    },
    checkForUpdates: () =>
      dependencies.updateService.checkForUpdates({
        allowDevelopmentFakeUpdate: true
      }),
    restartToUpdate: () => {
      dependencies.updateService.restartToUpdate();
    },
    createHistoryRecord: async (input) => {
      const record = await dependencies.historyStore.create(
        parseCreateHistoryRecordInput(input)
      );
      dependencies.onHistoryRecordCreated?.(record);
      await pruneExpiredHistoryRecords(dependencies);
      return record;
    },
    updateHistoryRecord: async (input) => {
      const { id, ...recordInput } = parseUpdateHistoryRecordInput(input);
      const record = await dependencies.historyStore.update(id, recordInput);
      dependencies.onHistoryRecordCreated?.(record);
      await pruneExpiredHistoryRecords(dependencies);
      return record;
    },
    listHistoryRecords: async () => {
      await pruneExpiredHistoryRecords(dependencies);
      return dependencies.historyStore.list();
    },
    readHistoryAudio: (input) => {
      const { id } = parseDeleteHistoryRecordInput(input);
      return dependencies.historyStore.readAudio(id);
    },
    deleteHistoryRecord: async (input) => {
      const { id } = parseDeleteHistoryRecordInput(input);
      const deleted = await dependencies.historyStore.delete(id);
      if (deleted) {
        dependencies.onHistoryRecordDeleted?.(id);
      }
      return { deleted };
    },
    applyHistoryRetention: async (input) => {
      const { retention, now } = parseApplyHistoryRetentionInput(input);
      const settings = dependencies.configStore.update({
        privacy: { historyRetention: retention }
      });
      dependencies.onSettingsUpdated?.(settings);
      const deletedIds = await deleteHistoryRecordsForRetention(
        dependencies.historyStore,
        retention,
        now === undefined ? new Date() : new Date(now)
      );
      notifyHistoryRecordsDeleted(dependencies, deletedIds);
      return { settings, deletedIds };
    }
  };
}

export interface IpcMainAdapter {
  handle(channel: string, listener: (_event: unknown, input?: unknown) => unknown): void;
}

export function registerIpcRoutes(
  ipcMain: IpcMainAdapter,
  dependencies: IpcRouteDependencies
): void {
  const handlers = createIpcRouteHandlers(dependencies);

  ipcMain.handle("voice:get-app-info", () => handlers.getAppInfo());
  ipcMain.handle("voice:get-app-config", () => handlers.getAppConfig());
  ipcMain.handle("voice:get-settings", () => handlers.getSettings());
  ipcMain.handle("voice:update-settings", (_event, input: unknown) => {
    return handlers.updateSettings(input);
  });
  ipcMain.handle("voice:copy-text", (_event, input: unknown) => {
    handlers.copyText(input);
    return undefined;
  });
  ipcMain.handle("voice:insert-text", (_event, input: unknown) => {
    return handlers.insertText(input);
  });
  ipcMain.handle("voice:replace-selected-text", (_event, input: unknown) => {
    return handlers.replaceSelectedText(input);
  });

  ipcMain.handle("voice:bootstrap-client", () => handlers.bootstrapClient());
  ipcMain.handle("voice:get-service-status", () => handlers.getServiceStatus());
  ipcMain.handle("voice:refresh-anonymous-client", () => handlers.getServiceStatus());
  ipcMain.handle("voice:create-transcription-session", (_event, input: unknown) => {
    return handlers.createTranscriptionSession(input);
  });
  ipcMain.handle("voice:postprocess", (_event, input: unknown) => {
    return handlers.postprocess(input);
  });
  ipcMain.handle("voice:get-selected-text", () => handlers.getSelectedText());
  ipcMain.handle("voice:get-active-window", () => handlers.getActiveWindow());
  ipcMain.handle("voice:test-websocket", (_event, input: unknown) => {
    return handlers.testWebSocket(input);
  });
  ipcMain.handle("voice:test-llm", (_event, input: unknown) => {
    return handlers.testLlm(input);
  });

  // preload 已声明以下 API，主流程改为 renderer 直接驱动 controller，
  // 这里保留空 handler 避免 invoke 报 "No handler"。
  ipcMain.handle("voice:start-recording", () => undefined);
  ipcMain.handle("voice:stop-recording", () => undefined);
  ipcMain.handle("voice:cancel-recording", () => undefined);

  // ASR 实时转写 —— renderer 调用主进程服务（主进程走 node ws + https-proxy-agent）。
  ipcMain.handle("voice:start-transcription", (_event, input: unknown) => {
    return handlers.startTranscription(input);
  });
  ipcMain.handle("voice:send-transcription-audio", (_event, input: unknown) => {
    handlers.sendTranscriptionAudio(input);
    return undefined;
  });
  ipcMain.handle("voice:stop-transcription", () => handlers.stopTranscription());
  ipcMain.handle("voice:cancel-transcription", () => handlers.cancelTranscription());
  ipcMain.handle("voice:perform-uninstall", () => handlers.performUninstall());
  ipcMain.handle("voice:finish-uninstall", () => {
    handlers.finishUninstall();
    return undefined;
  });
  ipcMain.handle("voice:check-for-updates", () => handlers.checkForUpdates());
  ipcMain.handle("voice:restart-to-update", () => {
    handlers.restartToUpdate();
    return undefined;
  });
  ipcMain.handle("voice:create-history-record", (_event, input: unknown) => {
    return handlers.createHistoryRecord(input);
  });
  ipcMain.handle("voice:update-history-record", (_event, input: unknown) => {
    return handlers.updateHistoryRecord(input);
  });
  ipcMain.handle("voice:list-history-records", () => handlers.listHistoryRecords());
  ipcMain.handle("voice:read-history-audio", (_event, input: unknown) => {
    return handlers.readHistoryAudio(input);
  });
  ipcMain.handle("voice:delete-history-record", (_event, input: unknown) => {
    return handlers.deleteHistoryRecord(input);
  });
  ipcMain.handle("voice:apply-history-retention", (_event, input: unknown) => {
    return handlers.applyHistoryRetention(input);
  });
}

function createReplacementFailure(
  strategy: InsertResult["strategy"],
  fallbackText: string,
  message: string
): InsertResult {
  return {
    ok: false,
    strategy,
    fallbackText,
    errorCode: "insert_failed",
    message
  };
}

function normalizeSelectionText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

async function pruneExpiredHistoryRecords(
  dependencies: Pick<IpcRouteDependencies, "configStore" | "historyStore" | "onHistoryRecordDeleted">
): Promise<string[]> {
  const settings = dependencies.configStore.get() as Partial<AppSettings>;
  const deletedIds = await deleteHistoryRecordsForRetention(
    dependencies.historyStore,
    resolveConfiguredHistoryRetention(settings),
    new Date()
  );
  notifyHistoryRecordsDeleted(dependencies, deletedIds);
  return deletedIds;
}

async function deleteHistoryRecordsForRetention(
  historyStore: HistoryStore,
  retention: HistoryRetention,
  now: Date
): Promise<string[]> {
  const cutoff = getHistoryRetentionCutoff(retention, now);
  if (cutoff === "clear") {
    return historyStore.clear();
  }
  if (cutoff === undefined) {
    return [];
  }
  return historyStore.pruneBefore(cutoff.toISOString());
}

function getHistoryRetentionCutoff(
  retention: HistoryRetention,
  now: Date
): Date | "clear" | undefined {
  switch (retention) {
    case "never":
      return "clear";
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "forever":
      return undefined;
  }
}

function notifyHistoryRecordsDeleted(
  dependencies: Pick<IpcRouteDependencies, "onHistoryRecordDeleted">,
  deletedIds: readonly string[]
): void {
  for (const id of deletedIds) {
    dependencies.onHistoryRecordDeleted?.(id);
  }
}

function resolveConfiguredHistoryRetention(
  settings: Partial<AppSettings>
): HistoryRetention {
  return (
    settings.privacy?.historyRetention ??
    (settings.privacy?.saveHistory === false ? "never" : "forever")
  );
}
