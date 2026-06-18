import type {
  AppContext,
  BackendClient,
  ClientBootstrapSnapshot,
  PostprocessRequest,
  PostprocessResult,
  ServiceStatusSnapshot,
  TranscriptionSession
} from "@voice/backend-client";
import type { AuthService } from "../auth/authService";
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
  testWebSocket
} from "../connectivity/connectivityService";
import { formatLogFields } from "../log/logSanitizer";
import {
  parseApplyHistoryRetentionInput,
  parseAudioFrameInput,
  parseEmailCodeLoginInput,
  parseCopyTextInput,
  parseCreateHistoryRecordInput,
  parseCreateTranscriptionSessionInput,
  parseDeleteHistoryRecordInput,
  parseLdapLoginInput,
  parsePostprocessInput,
  parseUpdateHistoryRecordInput,
  parseTranscriptionStartInput,
  parseInsertTextInput,
  parseReplaceSelectedTextInput,
  parseSettingsPatchInput,
  parseSendEmailCodeInput,
  parseTestWebSocketInput
} from "./ipcSchemas";

export interface IpcAppInfo {
  deviceName: string;
  appVersion: string;
  isPackaged: boolean;
}

type AuthIpcService = Pick<
  AuthService,
  | "getSessionSnapshot"
  | "sendEmailCode"
  | "loginWithEmailCode"
  | "loginWithLdap"
  | "logout"
>;

export interface IpcRouteDependencies {
  authService: AuthIpcService;
  configStore: Pick<ConfigStore, "get" | "update">;
  clipboard: Pick<ClipboardService, "writeText">;
  insertService: InsertService;
  selectionService: Pick<SelectionService, "getSelectedText">;
  backendClient: BackendClient;
  postprocessService?: {
    postprocess(request: PostprocessRequest): Promise<PostprocessResult>;
  };
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
  logger?: IpcRouteLogger | undefined;
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
  getAuthSession(): ReturnType<AuthIpcService["getSessionSnapshot"]>;
  sendEmailCode(input: unknown): ReturnType<AuthIpcService["sendEmailCode"]>;
  loginWithEmailCode(input: unknown): ReturnType<AuthIpcService["loginWithEmailCode"]>;
  loginWithLdap(input: unknown): ReturnType<AuthIpcService["loginWithLdap"]>;
  logout(): ReturnType<AuthIpcService["logout"]>;
  bootstrapClient(): Promise<BootstrapClientResponse>;
  getServiceStatus(): Promise<ServiceStatusSnapshot>;
  createTranscriptionSession(input: unknown): Promise<TranscriptionSession>;
  postprocess(input: unknown): Promise<PostprocessResult>;
  getSelectedText(): Promise<string>;
  getActiveWindow(): Promise<AppContext>;
  testWebSocket(input: unknown): Promise<ConnectivityTestResult>;
  startTranscription(input: unknown): Promise<void>;
  sendTranscriptionAudio(input: unknown): void;
  stopTranscription(): Promise<TranscriptionStopResult>;
  cancelTranscription(): Promise<void>;
  performUninstall(): Promise<UninstallResult>;
  cancelUninstall(): void;
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
  const logger = dependencies.logger ?? console;
  const authService = dependencies.authService;
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
      const strategy = settings.insertion.strategy;
      const targetWindowHandle = dependencies.getInsertTargetWindowHandle?.();
      console.log(
        `[ipc] insertText request strategy=${strategy} textLength=${text.length} targetHandle=${targetWindowHandle ?? "none"}`
      );
      return dependencies.insertService
        .insertText(text, {
          strategy,
          targetWindowHandle
        })
        .then((result) => {
          console.log(
            `[ipc] insertText result ok=${result.ok} strategy=${result.strategy} message=${result.ok ? "" : result.message}`
          );
          return result;
        });
    },
    replaceSelectedText: async (input) => {
      const { text, expectedSelectedText } = parseReplaceSelectedTextInput(input);
      const settings = dependencies.configStore.get();
      const strategy = settings.insertion.strategy;
      const targetWindowHandle = dependencies.getInsertTargetWindowHandle?.();
      console.log(
        `[ipc] replaceSelectedText request strategy=${strategy} textLength=${text.length} expectedSelectedTextLength=${expectedSelectedText?.length ?? 0} targetHandle=${targetWindowHandle ?? "none"}`
      );
      const currentSelectedText =
        await dependencies.selectionService.getSelectedText(targetWindowHandle);
      console.log(
        `[ipc] replaceSelectedText currentSelectedTextLength=${currentSelectedText.length}`
      );

      if (
        currentSelectedText &&
        expectedSelectedText !== undefined &&
        normalizeSelectionText(currentSelectedText) !==
          normalizeSelectionText(expectedSelectedText)
      ) {
        console.warn("[ipc] replaceSelectedText blocked: selected text changed before replacement");
        return createReplacementFailure(
          strategy,
          text,
          "Selected text changed before replacement"
        );
      }

      const result = await dependencies.insertService.insertText(text, {
        strategy,
        targetWindowHandle
      });
      console.log(
        `[ipc] replaceSelectedText result ok=${result.ok} strategy=${result.strategy} message=${result.ok ? "" : result.message}`
      );
      if (result.ok && expectedSelectedText !== undefined) {
        const selectedTextAfterReplacement =
          await dependencies.selectionService.getSelectedText(targetWindowHandle);
        if (
          selectedTextAfterReplacement &&
          normalizeSelectionText(selectedTextAfterReplacement) ===
            normalizeSelectionText(expectedSelectedText)
        ) {
          console.warn(
            "[ipc] replaceSelectedText blocked: selected text was not replaced"
          );
          return createReplacementFailure(
            result.strategy,
            text,
            "Selected text was not replaced"
          );
        }
      }
      return result;
    },
    getAuthSession: () => authService.getSessionSnapshot(),
    sendEmailCode: async (input) =>
      authService.sendEmailCode(parseSendEmailCodeInput(input)),
    loginWithEmailCode: async (input) =>
      authService.loginWithEmailCode(parseEmailCodeLoginInput(input)),
    loginWithLdap: async (input) =>
      authService.loginWithLdap(parseLdapLoginInput(input)),
    logout: () => authService.logout(),
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
      (dependencies.postprocessService ?? dependencies.backendClient).postprocess(
        parsePostprocessInput(input)
      ),
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
    cancelUninstall: () => {
      dependencies.quitApp();
    },
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
      const parsedInput = parseCreateHistoryRecordInput(input);
      const record = await dependencies.historyStore.create(parsedInput);
      logger.log(
        `[history] create ${formatLogFields({
          id: record.id,
          mode: record.mode,
          status: record.status,
          durationMs: record.durationMs,
          transcriptLength: record.transcript?.length ?? 0,
          finalTextLength: record.finalText?.length ?? 0,
          hasAudio: parsedInput.audio !== undefined
        })}`
      );
      dependencies.onHistoryRecordCreated?.(record);
      await pruneExpiredHistoryRecords(dependencies);
      return record;
    },
    updateHistoryRecord: async (input) => {
      const { id, ...recordInput } = parseUpdateHistoryRecordInput(input);
      const record = await dependencies.historyStore.update(id, recordInput);
      logger.log(
        `[history] update ${formatLogFields({
          id: record.id,
          status: record.status ?? "unknown",
          durationMs: record.durationMs,
          transcriptLength: record.transcript?.length ?? 0,
          finalTextLength: record.finalText?.length ?? 0
        })}`
      );
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
      logger.log(`[history] delete ${formatLogFields({ id, deleted })}`);
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
      logger.log(
        `[history] retention ${formatLogFields({
          retention,
          deleted: deletedIds.length
        })}`
      );
      notifyHistoryRecordsDeleted(dependencies, deletedIds);
      return { settings, deletedIds };
    }
  };
}

export interface IpcMainAdapter {
  handle(channel: string, listener: (_event: unknown, input?: unknown) => unknown): void;
}

export interface IpcRouteLogger {
  log(message: string): void;
  warn(message: string): void;
}

export interface RegisterIpcRoutesOptions {
  logger?: IpcRouteLogger | undefined;
  now?: (() => number) | undefined;
  revealSensitiveLogs?: boolean | undefined;
}

export function registerIpcRoutes(
  ipcMain: IpcMainAdapter,
  dependencies: IpcRouteDependencies,
  options: RegisterIpcRoutesOptions = {}
): void {
  const logger = options.logger ?? console;
  const handlers = createIpcRouteHandlers({ ...dependencies, logger });
  const now = options.now ?? Date.now;
  const logOptions = { revealSensitive: options.revealSensitiveLogs === true };
  let nextRequestId = 0;

  const handle = (
    channel: string,
    listener: (_event: unknown, input?: unknown) => unknown
  ): void => {
    ipcMain.handle(channel, async (event: unknown, input?: unknown) => {
      const requestId = `ipc-${++nextRequestId}`;
      const startedAt = now();
      logger.log(
        `[ipc] request ${formatLogFields({
          channel,
          requestId,
          ...(input === undefined ? {} : { input })
        }, logOptions)}`
      );
      try {
        const result = await listener(event, input);
        logger.log(
          `[ipc] response ${formatLogFields({
            channel,
            requestId,
            status: "ok",
            durationMs: now() - startedAt
          }, logOptions)}`
        );
        return result;
      } catch (error) {
        logger.warn(
          `[ipc] response ${formatLogFields({
            channel,
            requestId,
            status: "error",
            durationMs: now() - startedAt,
            error: getErrorMessage(error)
          }, logOptions)}`
        );
        throw error;
      }
    });
  };

  handle("voice:get-app-info", () => handlers.getAppInfo());
  handle("voice:get-app-config", () => handlers.getAppConfig());
  handle("voice:get-settings", () => handlers.getSettings());
  handle("voice:update-settings", (_event, input: unknown) => {
    return handlers.updateSettings(input);
  });
  handle("voice:copy-text", (_event, input: unknown) => {
    handlers.copyText(input);
    return undefined;
  });
  handle("voice:insert-text", (_event, input: unknown) => {
    return handlers.insertText(input);
  });
  handle("voice:replace-selected-text", (_event, input: unknown) => {
    return handlers.replaceSelectedText(input);
  });
  handle("voice:auth:get-session", () => handlers.getAuthSession());
  handle("voice:auth:send-email-code", (_event, input: unknown) => {
    return handlers.sendEmailCode(input);
  });
  handle("voice:auth:login-email-code", (_event, input: unknown) => {
    return handlers.loginWithEmailCode(input);
  });
  handle("voice:auth:login-ldap", (_event, input: unknown) => {
    return handlers.loginWithLdap(input);
  });
  handle("voice:auth:logout", () => handlers.logout());

  handle("voice:bootstrap-client", () => handlers.bootstrapClient());
  handle("voice:get-service-status", () => handlers.getServiceStatus());
  handle("voice:refresh-anonymous-client", () => handlers.getServiceStatus());
  handle("voice:create-transcription-session", (_event, input: unknown) => {
    return handlers.createTranscriptionSession(input);
  });
  handle("voice:postprocess", (_event, input: unknown) => {
    return handlers.postprocess(input);
  });
  handle("voice:get-selected-text", () => handlers.getSelectedText());
  handle("voice:get-active-window", () => handlers.getActiveWindow());
  handle("voice:test-websocket", (_event, input: unknown) => {
    return handlers.testWebSocket(input);
  });

  // preload 已声明以下 API，主流程改为 renderer 直接驱动 controller，
  // 这里保留空 handler 避免 invoke 报 "No handler"。
  handle("voice:start-recording", () => undefined);
  handle("voice:stop-recording", () => undefined);
  handle("voice:cancel-recording", () => undefined);

  // ASR 实时转写 —— renderer 调用主进程服务（主进程走 node ws + https-proxy-agent）。
  handle("voice:start-transcription", (_event, input: unknown) => {
    return handlers.startTranscription(input);
  });
  handle("voice:send-transcription-audio", (_event, input: unknown) => {
    handlers.sendTranscriptionAudio(input);
    return undefined;
  });
  handle("voice:stop-transcription", () => handlers.stopTranscription());
  handle("voice:cancel-transcription", () => handlers.cancelTranscription());
  handle("voice:perform-uninstall", () => handlers.performUninstall());
  handle("voice:cancel-uninstall", () => {
    handlers.cancelUninstall();
    return undefined;
  });
  handle("voice:finish-uninstall", () => {
    handlers.finishUninstall();
    return undefined;
  });
  handle("voice:check-for-updates", () => handlers.checkForUpdates());
  handle("voice:restart-to-update", () => {
    handlers.restartToUpdate();
    return undefined;
  });
  handle("voice:create-history-record", (_event, input: unknown) => {
    return handlers.createHistoryRecord(input);
  });
  handle("voice:update-history-record", (_event, input: unknown) => {
    return handlers.updateHistoryRecord(input);
  });
  handle("voice:list-history-records", () => handlers.listHistoryRecords());
  handle("voice:read-history-audio", (_event, input: unknown) => {
    return handlers.readHistoryAudio(input);
  });
  handle("voice:delete-history-record", (_event, input: unknown) => {
    return handlers.deleteHistoryRecord(input);
  });
  handle("voice:apply-history-retention", (_event, input: unknown) => {
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
