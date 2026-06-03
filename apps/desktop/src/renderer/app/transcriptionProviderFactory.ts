import type { AppSettings, AudioFrame, WsServerConfig } from "@voice/shared";
import type {
  TranscriptionProvider,
  TranscriptionStartInput
} from "@voice/ai";
import {
  createIpcTranscriptionProvider,
  type IpcTranscriptionTransport,
  type SerializedTranscriptionEvent
} from "./ipcTranscriptionProvider";

/**
 * Renderer 端轉寫 provider 工廠：ASR 即時轉寫所有網路 I/O 均交給主程序。
 *
 * 動機：瀏覽器原生 WebSocket 不支援 proxy，使用者的 WS server 配置可能帶 proxy
 * 欄位；即使不帶 proxy 也可能因內網/翻牆條件完全不可達。主程序用 Node ws +
 * https-proxy-agent 可以真正走代理，且不會被瀏覽器 TLS 限制卡住。
 */
export interface CreateConfiguredTranscriptionProviderOptions {
  /**
   * 可選的 transport，預設從 window.voiceAI 取。單測時傳 fake transport。
   */
  transport?: IpcTranscriptionTransport;
}

export function createConfiguredTranscriptionProvider(
  options: CreateConfiguredTranscriptionProviderOptions = {}
): TranscriptionProvider {
  const transport = options.transport ?? createWindowVoiceAiTransport();
  return createIpcTranscriptionProvider(transport);
}

function createWindowVoiceAiTransport(): IpcTranscriptionTransport {
  const api = window.voiceAI;
  if (!api) {
    throw new Error(
      "window.voiceAI 不存在：preload 未載入或 contextIsolation 配置錯誤"
    );
  }
  return {
    startTranscription: (input: TranscriptionStartInput) =>
      api.startTranscription(input),
    sendTranscriptionAudio: (frame: AudioFrame) => api.sendTranscriptionAudio(frame),
    stopTranscription: () => api.stopTranscription(),
    cancelTranscription: () => api.cancelTranscription(),
    onTranscriptionEvent: (listener) =>
      api.onTranscriptionEvent(
        (event: SerializedTranscriptionEvent) => listener(event)
      )
  };
}

export function resolveSelectedWsServer(
  wsSettings: AppSettings["ws"]
): WsServerConfig | undefined {
  if (wsSettings.servers.length === 0) {
    return undefined;
  }

  const index = clampIndex(wsSettings.selectedIndex, wsSettings.servers.length);
  return wsSettings.servers[index];
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value >= length) {
    return length - 1;
  }
  return Math.floor(value);
}
