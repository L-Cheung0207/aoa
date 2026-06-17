import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  AppSettingsPatch,
  AudioFrame,
  CreateHistoryRecordInput,
  HistoryAudioData,
  HistoryRecord,
  HistoryRetention,
  RecordingMode,
  UpdateHistoryRecordInput,
  WsServerConfig
} from "@voice/shared";
import type {
  AppContext,
  ClientBootstrapSnapshot,
  ClientFacingError,
  ServiceStatusSnapshot,
  TranscriptionSession,
  TranscriptionSessionRequest
} from "@voice/backend-client";
import type { TranscriptionStartInput } from "@voice/ai";
import type { SerializedTranscriptionEvent, TranscriptionStopResult } from "../renderer/app/ipcTranscriptionProvider";
import type { UninstallResult } from "../main/uninstall/uninstallService";
import type {
  InstallerShellDefaults,
  InstallerShellInstallInput,
  InstallerShellInstallResult,
} from "../main/installer/installerService";

export type RecordingState =
  | "idle"
  | "listening"
  | "canceled"
  | "processing"
  | "inserting"
  | "result"
  | "success"
  | "error";

export interface StartRecordingInput {
  mode: RecordingMode;
  /** 仅 processSelection 模式传入，由主进程/原生 helper 读取后填充 */
  selectedText?: string;
}

export interface RecordingStateUpdate {
  state: RecordingState;
  mode: RecordingMode | undefined;
  reason?: string;
  recordingLimitWarning?: boolean;
  busyHintVisible?: boolean;
}

export interface InsertResult {
  ok: boolean;
  strategy: "clipboard" | "native" | "auto";
  fallbackText?: string;
  errorCode?: "insert_failed";
  message?: string;
}

export interface ConnectivityTestResult {
  ok: boolean;
  message: string;
  elapsedMs?: number;
}

export interface ToggleRecordingPayload {
  mode: RecordingMode;
}

export interface BootstrapClientResponse extends ClientBootstrapSnapshot {
  installationId: string;
}

export interface ShortcutConflictPayload {
  conflicts: string[];
}

export interface ShortcutHelpPayload {
  direct: string;
  processSelection: string;
  translate: string;
}

export interface ShortcutCaptureAcceleratorPayload {
  accelerator: string;
}

export type HomeWindowControlAction = "minimize" | "toggleMaximize" | "close";
export type HomeSection = "home" | "history" | "settings" | "about";
export interface OpenHomeSectionInput {
  section: HomeSection;
  onboardingStep?: number;
}

export interface AppInfo {
  deviceName: string;
  appVersion: string;
}

export interface UpdateReadyPayload {
  version?: string;
  phase?: "ALPHA" | "BETA" | "PREVIEW" | "RELEASE";
  updateType?: "FORCED" | "RECOMMENDED" | "OPTIONAL";
  updateLog?: string;
  downloadUrl?: string;
  packageSize?: number;
  packageName?: string;
}

export interface UpdateDownloadProgressPayload {
  phase: "checking" | "downloading" | "verifying";
  percent?: number;
  transferredBytes?: number;
  totalBytes?: number;
  packageName?: string;
  version?: string;
}

export type UpdateCheckResult =
  | { status: "disabled" }
  | { status: "up-to-date" }
  | ({ status: "available"; updaterError?: string } & UpdateReadyPayload)
  | ({ status: "ready" } & UpdateReadyPayload)
  | { status: "error"; message: string };

export type InstallerSelectDirectoryResult =
  | { canceled: true }
  | { canceled: false; installDir: string };

export interface VoiceAIAPI {
  getAppInfo(): Promise<AppInfo>;
  getAppConfig(): Promise<unknown>;
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: AppSettingsPatch): Promise<AppSettings>;
  startRecording(input: StartRecordingInput): Promise<void>;
  stopRecording(): Promise<void>;
  cancelRecording(): Promise<void>;
  copyText(text: string): Promise<void>;
  insertText(text: string): Promise<InsertResult>;
  replaceSelectedText(
    text: string,
    expectedSelectedText?: string
  ): Promise<InsertResult>;
  getServiceStatus(): Promise<ServiceStatusSnapshot>;
  refreshAnonymousClient(): Promise<ServiceStatusSnapshot>;
  bootstrapClient(): Promise<BootstrapClientResponse>;
  createTranscriptionSession(
    input: TranscriptionSessionRequest
  ): Promise<TranscriptionSession>;
  getSelectedText(): Promise<string>;
  getActiveWindow(): Promise<AppContext>;
  testWebSocket(config: WsServerConfig): Promise<ConnectivityTestResult>;
  /** 启动主进程 ASR 转写会话（主进程走 node ws + https-proxy-agent，避免浏览器原生 WS 不支持代理）。 */
  startTranscription(input: TranscriptionStartInput): Promise<void>;
  /** 推帧到主进程。在 socket 未就绪期间主进程会静默丢帧。 */
  sendTranscriptionAudio(frame: AudioFrame): Promise<void>;
  stopTranscription(): Promise<TranscriptionStopResult>;
  cancelTranscription(): Promise<void>;
  performUninstall(): Promise<UninstallResult>;
  cancelUninstall(): Promise<void>;
  finishUninstall(): Promise<void>;
  getInstallerDefaults(): Promise<InstallerShellDefaults>;
  selectInstallerDirectory(defaultPath: string): Promise<InstallerSelectDirectoryResult>;
  installFromShell(input: InstallerShellInstallInput): Promise<InstallerShellInstallResult>;
  launchInstalledApp(installDir: string): Promise<void>;
  checkForUpdates(): Promise<UpdateCheckResult>;
  restartToUpdate(): Promise<void>;
  createHistoryRecord(input: CreateHistoryRecordInput): Promise<HistoryRecord>;
  updateHistoryRecord(input: UpdateHistoryRecordInput): Promise<HistoryRecord>;
  listHistoryRecords(): Promise<HistoryRecord[]>;
  readHistoryAudio(id: string): Promise<HistoryAudioData | undefined>;
  deleteHistoryRecord(id: string): Promise<{ deleted: boolean }>;
  applyHistoryRetention(retention: HistoryRetention): Promise<{
    settings: AppSettings;
    deletedIds: string[];
  }>;
  /** 订阅主进程下发的 ASR 转写事件（已序列化）。 */
  onTranscriptionEvent(
    callback: (event: SerializedTranscriptionEvent) => void
  ): () => void;
  /**
   * Renderer → Main 的录音状态上报，用于驱动托盘 tooltip 等主进程 UI。
   * 仅做副作用通知，无返回值。
   */
  reportRecordingState(update: RecordingStateUpdate): void;
  controlHomeWindow(action: HomeWindowControlAction): void;
  openHomeSection(input: OpenHomeSectionInput): void;
  openMicrophoneHelp(): void;
  /** 录入快捷键时暂停/恢复全局 Right Alt 快捷键，避免与语音功能冲突。 */
  setShortcutCaptureActive(active: boolean): Promise<void>;
  onToggleRecording(callback: (payload: ToggleRecordingPayload) => void): () => void;
  onRecordingStateChanged(callback: (update: RecordingStateUpdate) => void): () => void;
  onPartialTranscript(callback: (text: string) => void): () => void;
  onError(callback: (error: ClientFacingError) => void): () => void;
  onShortcutConflict(callback: (payload: ShortcutConflictPayload) => void): () => void;
  onShortcutCaptureAccelerator(
    callback: (payload: ShortcutCaptureAcceleratorPayload) => void
  ): () => void;
  onShortcutHelp(callback: (payload: ShortcutHelpPayload) => void): () => void;
  onShortcutHelpDismiss(callback: () => void): () => void;
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void;
  onHistoryRecordCreated(callback: (record: HistoryRecord) => void): () => void;
  onHistoryRecordDeleted(callback: (payload: { id: string }) => void): () => void;
  onOpenSettingsPanel(callback: () => void): () => void;
  onOpenHomeSection(callback: (section: HomeSection) => void): () => void;
  onOpenOnboardingStep(callback: (step: number) => void): () => void;
  onOpenMicrophoneHelp(callback: () => void): () => void;
  onOpenUpdateDialog(callback: () => void): () => void;
  onUpdateReady(callback: (payload: UpdateReadyPayload) => void): () => void;
  onUpdateDownloadProgress(
    callback: (payload: UpdateDownloadProgressPayload) => void
  ): () => void;
  /**
   * 主进程在「处理阶段」（processing/inserting）临时注册的全局 Escape 被按下时，
   * 通过此事件通知 renderer 走 controller.cancel() 链路退出处理。
   */
  onCancelRequested(callback: () => void): () => void;
}

export const voiceAI: VoiceAIAPI = {
  getAppInfo: () => ipcRenderer.invoke("voice:get-app-info"),
  getAppConfig: () => ipcRenderer.invoke("voice:get-app-config"),
  getSettings: () => ipcRenderer.invoke("voice:get-settings"),
  updateSettings: (patch) => ipcRenderer.invoke("voice:update-settings", patch),
  startRecording: (input) => ipcRenderer.invoke("voice:start-recording", input),
  stopRecording: () => ipcRenderer.invoke("voice:stop-recording"),
  cancelRecording: () => ipcRenderer.invoke("voice:cancel-recording"),
  copyText: (text) => ipcRenderer.invoke("voice:copy-text", { text }),
  insertText: (text) => ipcRenderer.invoke("voice:insert-text", { text }),
  replaceSelectedText: (text, expectedSelectedText) => {
    const payload =
      expectedSelectedText === undefined ? { text } : { text, expectedSelectedText };
    return ipcRenderer.invoke("voice:replace-selected-text", payload);
  },
  getServiceStatus: () => ipcRenderer.invoke("voice:get-service-status"),
  refreshAnonymousClient: () => ipcRenderer.invoke("voice:refresh-anonymous-client"),
  bootstrapClient: () => ipcRenderer.invoke("voice:bootstrap-client"),
  createTranscriptionSession: (input) =>
    ipcRenderer.invoke("voice:create-transcription-session", input),
  getSelectedText: () => ipcRenderer.invoke("voice:get-selected-text"),
  getActiveWindow: () => ipcRenderer.invoke("voice:get-active-window"),
  testWebSocket: (config) => ipcRenderer.invoke("voice:test-websocket", config),
  startTranscription: (input) =>
    ipcRenderer.invoke("voice:start-transcription", input),
  sendTranscriptionAudio: (frame) => ipcRenderer.invoke("voice:send-transcription-audio", frame),
  stopTranscription: () => ipcRenderer.invoke("voice:stop-transcription"),
  cancelTranscription: () => ipcRenderer.invoke("voice:cancel-transcription"),
  performUninstall: () => ipcRenderer.invoke("voice:perform-uninstall"),
  cancelUninstall: () => ipcRenderer.invoke("voice:cancel-uninstall"),
  finishUninstall: () => ipcRenderer.invoke("voice:finish-uninstall"),
  getInstallerDefaults: () => ipcRenderer.invoke("voice:installer-get-defaults"),
  selectInstallerDirectory: (defaultPath) =>
    ipcRenderer.invoke("voice:installer-select-directory", { defaultPath }),
  installFromShell: (input) => ipcRenderer.invoke("voice:installer-install", input),
  launchInstalledApp: (installDir) =>
    ipcRenderer.invoke("voice:installer-launch", { installDir }),
  checkForUpdates: () => ipcRenderer.invoke("voice:check-for-updates"),
  restartToUpdate: () => ipcRenderer.invoke("voice:restart-to-update"),
  createHistoryRecord: (input) =>
    ipcRenderer.invoke("voice:create-history-record", input),
  updateHistoryRecord: (input) =>
    ipcRenderer.invoke("voice:update-history-record", input),
  listHistoryRecords: () => ipcRenderer.invoke("voice:list-history-records"),
  readHistoryAudio: (id) =>
    ipcRenderer.invoke("voice:read-history-audio", { id }),
  deleteHistoryRecord: (id) =>
    ipcRenderer.invoke("voice:delete-history-record", { id }),
  applyHistoryRetention: (retention) =>
    ipcRenderer.invoke("voice:apply-history-retention", { retention }),
  onTranscriptionEvent: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      event: SerializedTranscriptionEvent
    ): void => {
      callback(event);
    };
    ipcRenderer.on("voice:transcription-event", listener);
    return () =>
      ipcRenderer.removeListener("voice:transcription-event", listener);
  },
  reportRecordingState: (update) => {
    ipcRenderer.send("voice:report-recording-state", update);
  },
  controlHomeWindow: (action) => {
    ipcRenderer.send("voice:home-window-control", action);
  },
  openHomeSection: (input) => {
    ipcRenderer.send("voice:open-home-section-request", input);
  },
  openMicrophoneHelp: () => {
    ipcRenderer.send("voice:open-microphone-help-request");
  },
  setShortcutCaptureActive: (active) =>
    ipcRenderer.invoke("voice:set-shortcut-capture-active", { active }),
  onToggleRecording: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: ToggleRecordingPayload
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:toggle-recording", listener);
    return () => ipcRenderer.removeListener("voice:toggle-recording", listener);
  },
  onRecordingStateChanged: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      update: RecordingStateUpdate
    ): void => {
      callback(update);
    };
    ipcRenderer.on("voice:recording-state-changed", listener);
    return () => ipcRenderer.removeListener("voice:recording-state-changed", listener);
  },
  onPartialTranscript: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, text: string): void => {
      callback(text);
    };
    ipcRenderer.on("voice:partial-transcript", listener);
    return () => ipcRenderer.removeListener("voice:partial-transcript", listener);
  },
  onError: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, error: ClientFacingError): void => {
      callback(error);
    };
    ipcRenderer.on("voice:error", listener);
    return () => ipcRenderer.removeListener("voice:error", listener);
  },
  onShortcutConflict: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: ShortcutConflictPayload
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:shortcut-conflict", listener);
    return () => ipcRenderer.removeListener("voice:shortcut-conflict", listener);
  },
  onShortcutCaptureAccelerator: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: ShortcutCaptureAcceleratorPayload
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:shortcut-capture-accelerator", listener);
    return () =>
      ipcRenderer.removeListener("voice:shortcut-capture-accelerator", listener);
  },
  onShortcutHelp: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: ShortcutHelpPayload
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:shortcut-help", listener);
    return () => ipcRenderer.removeListener("voice:shortcut-help", listener);
  },
  onShortcutHelpDismiss: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent): void => {
      callback();
    };
    ipcRenderer.on("voice:shortcut-help-dismiss", listener);
    return () =>
      ipcRenderer.removeListener("voice:shortcut-help-dismiss", listener);
  },
  onSettingsChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: AppSettings): void => {
      callback(settings);
    };
    ipcRenderer.on("voice:settings-changed", listener);
    return () => ipcRenderer.removeListener("voice:settings-changed", listener);
  },
  onHistoryRecordCreated: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, record: HistoryRecord): void => {
      callback(record);
    };
    ipcRenderer.on("voice:history-record-created", listener);
    return () => ipcRenderer.removeListener("voice:history-record-created", listener);
  },
  onHistoryRecordDeleted: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: { id: string }
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:history-record-deleted", listener);
    return () => ipcRenderer.removeListener("voice:history-record-deleted", listener);
  },
  onOpenSettingsPanel: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent): void => {
      callback();
    };
    ipcRenderer.on("voice:open-settings-panel", listener);
    return () => ipcRenderer.removeListener("voice:open-settings-panel", listener);
  },
  onOpenHomeSection: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, section: HomeSection): void => {
      callback(section);
    };
    ipcRenderer.on("voice:open-home-section", listener);
    return () => ipcRenderer.removeListener("voice:open-home-section", listener);
  },
  onOpenOnboardingStep: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, step: number): void => {
      callback(step);
    };
    ipcRenderer.on("voice:open-onboarding-step", listener);
    return () =>
      ipcRenderer.removeListener("voice:open-onboarding-step", listener);
  },
  onOpenMicrophoneHelp: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent): void => {
      callback();
    };
    ipcRenderer.on("voice:open-microphone-help", listener);
    return () => ipcRenderer.removeListener("voice:open-microphone-help", listener);
  },
  onOpenUpdateDialog: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent): void => {
      callback();
    };
    ipcRenderer.on("voice:open-update-dialog", listener);
    return () => ipcRenderer.removeListener("voice:open-update-dialog", listener);
  },
  onUpdateReady: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: UpdateReadyPayload
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:update-ready", listener);
    return () => ipcRenderer.removeListener("voice:update-ready", listener);
  },
  onUpdateDownloadProgress: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: UpdateDownloadProgressPayload
    ): void => {
      callback(payload);
    };
    ipcRenderer.on("voice:update-download-progress", listener);
    return () =>
      ipcRenderer.removeListener("voice:update-download-progress", listener);
  },
  onCancelRequested: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent): void => {
      callback();
    };
    ipcRenderer.on("voice:cancel-requested", listener);
    return () => ipcRenderer.removeListener("voice:cancel-requested", listener);
  }
};

export function exposeVoiceApi(): void {
  contextBridge.exposeInMainWorld("voiceAI", voiceAI);
}
