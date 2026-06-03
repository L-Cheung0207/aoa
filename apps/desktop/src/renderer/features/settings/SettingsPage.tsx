import { useCallback, useEffect, useState } from "react";
import type {
  AppSettings,
  InterfaceLanguage,
  RecordingLanguage,
  WaveformStyle
} from "@voice/shared";
import {
  ConnectionSettingsFields,
  getConnectionTargets,
  type ConnectionTestStatus
} from "./ConnectionSettingsFields";
import {
  normalizeConnectionSettings,
  validateConnectionSettings
} from "./connectionSettings";
import { MicrophoneDevicePicker } from "../../shared/ui/MicrophoneDevicePicker";
import { ShortcutRecorder } from "./ShortcutRecorder";
import { useAutoSaveSettings } from "./useAutoSaveSettings";

interface LanguageOption {
  key: string;
  value: RecordingLanguage;
}

interface InterfaceLanguageOption {
  key: string;
  value: InterfaceLanguage;
}

interface WaveformOption {
  key: string;
  value: WaveformStyle;
}

const INTERFACE_LANGUAGE_OPTIONS: InterfaceLanguageOption[] = [
  { key: "简体中文（中国大陆）", value: "zh-CN" },
  { key: "繁體中文（香港/澳門）", value: "zh-TW" },
  { key: "English (United States)", value: "en-US" }
];

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { key: "自動 (Auto)", value: "auto" },
  { key: "廣東話 (Cantonese)", value: "cantonese" },
  { key: "普通話 (Mandarin)", value: "mandarin" },
  { key: "韓語 (Korean)", value: "korean" },
  { key: "英文 (English)", value: "english" },
  { key: "葡文 (Portuguese)", value: "portuguese" },
  { key: "日文 (Japanese)", value: "japanese" },
  { key: "泰文 (Thai)", value: "thai" },
  { key: "印地文 (Hindi)", value: "hindi" },
  { key: "印尼文 (Indonesia)", value: "indonesia" }
];

const WAVEFORM_OPTIONS: WaveformOption[] = [
  { key: "脉冲焰", value: "waveform-sunset" },
  { key: "银核灰", value: "waveform-mono" },
  { key: "霓虹糖", value: "waveform-candy" }
];

const TRANSLATION_TARGET_OPTIONS: Array<{
  key: string;
  value: AppSettings["translation"]["targetLanguage"];
}> = [
  { key: "英语（英国）", value: "en-US" },
  { key: "简体中文（中国大陆）", value: "zh-CN" }
];

function updateWaveformStyle(current: AppSettings, waveformStyle: WaveformStyle): AppSettings {
  return {
    ...current,
    recording: {
      ...current.recording,
      waveformStyle
    }
  };
}

interface SettingsPageProps {
  initialSettings?: AppSettings | undefined;
}

function formatConnectivityMessage(
  label: string,
  result: { ok: boolean; message: string; elapsedMs?: number }
): string {
  if (result.ok) {
    return `${label}連線成功${result.elapsedMs ? `（${result.elapsedMs}ms）` : ""}`;
  }
  return `${label}連線失敗：${result.message}`;
}

export function SettingsPage({ initialSettings }: SettingsPageProps = {}): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | undefined>(initialSettings);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [wsTest, setWsTest] = useState<ConnectionTestStatus>({ state: "idle" });
  const [llmTest, setLlmTest] = useState<ConnectionTestStatus>({ state: "idle" });
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  const autoSave = useAutoSaveSettings({
    scope: "page",
    validate: validateConnectionSettings,
    onError: (message) => setSaveError(message)
  });

  const updateSettings = useCallback(
    (updater: AppSettings | ((draft: AppSettings) => AppSettings)): void => {
      setWsTest({ state: "idle" });
      setLlmTest({ state: "idle" });
      setSettings((current) => autoSave.commitSettings(current, updater) ?? current);
    },
    [autoSave]
  );

  useEffect(() => {
    if (initialSettings) {
      autoSave.setLatestDraft(initialSettings);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const current = await window.voiceAI.getSettings();
        if (!cancelled) {
          const normalized = normalizeConnectionSettings(current);
          autoSave.setLatestDraft(normalized);
          setSettings(normalized);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
      void autoSave.flushPersist();
    };
  }, [autoSave, initialSettings]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const theme = settings?.ui?.theme;
    if (!theme) {
      return;
    }
    document.documentElement.dataset.theme = theme;
  }, [settings?.ui?.theme]);

  if (loadError !== undefined) {
    return (
      <main className="settings">
        <div className="settings__error">載入配置失敗：{loadError}</div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="settings">
        <div className="settings__loading">載入中…</div>
      </main>
    );
  }

  const connectionError = validateConnectionSettings(settings);

  const handleTestWs = async (): Promise<void> => {
    const { wsServer } = getConnectionTargets(settings);
    if (!wsServer?.url.trim()) {
      setWsTest({ state: "fail", message: "請先填寫 WebSocket 地址。" });
      return;
    }

    setWsTest({ state: "testing", message: "正在測試 WS 服務..." });
    try {
      const result = await window.voiceAI.testWebSocket(wsServer);
      setWsTest({
        state: result.ok ? "ok" : "fail",
        message: formatConnectivityMessage("WS 服務", result)
      });
    } catch (error) {
      setWsTest({
        state: "fail",
        message: `WS 服務連線異常：${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const handleTestLlm = async (): Promise<void> => {
    const { llmModel } = getConnectionTargets(settings);
    if (!llmModel?.baseUrl.trim()) {
      setLlmTest({ state: "fail", message: "請先填寫後處理 API 地址。" });
      return;
    }

    setLlmTest({ state: "testing", message: "正在測試後處理 API..." });
    try {
      const result = await window.voiceAI.testLlm(llmModel);
      setLlmTest({
        state: result.ok ? "ok" : "fail",
        message: formatConnectivityMessage("後處理 API", result)
      });
    } catch (error) {
      setLlmTest({
        state: "fail",
        message: `後處理 API 連線異常：${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  return (
    <main className="settings">
      <header className="settings-header">
        <div className="settings-header__left">
          <h1 className="settings-header__title">設定</h1>
          <p className="settings-header__subtitle">
            配置會儲存在你的裝置上，不會上傳到雲端。
          </p>
        </div>
      </header>

      <section className="settings__section settings__section--plain" aria-label="外觀">
        <h2 className="settings-group-header" aria-label="外觀分組">
          <span className="settings-group-header__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 3.5a8.5 8.5 0 0 0 0 17h.55a2.15 2.15 0 0 0 1.48-3.71l-.24-.23a1.4 1.4 0 0 1 .98-2.4H16a4.5 4.5 0 0 0 0-9H12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M7.8 11.1h.01M9.8 7.7h.01M14.2 7.7h.01"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="settings-group-header__label">外觀</span>
        </h2>
        <div className="settings-row">
          <div className="settings-row__text">
            <strong>主題</strong>
            <small>預設使用深色主題；淺色主題更適合白天。</small>
          </div>
          <div className="settings-row__control">
            <select
              className="settings__select"
              value={settings.ui.theme}
              onChange={(event) => {
                const theme = event.target.value as AppSettings["ui"]["theme"];
                setSaveError(undefined);
                setSettings((current) => {
                  if (!current) {
                    return current;
                  }
                  return {
                    ...current,
                    ui: {
                      ...current.ui,
                      theme
                    }
                  };
                });
                void window.voiceAI.updateSettings({ ui: { theme } }).catch((error) => {
                  setSaveError(
                    `儲存失敗：${error instanceof Error ? error.message : String(error)}`
                  );
                });
              }}
            >
              <option value="dark">深色（預設）</option>
              <option value="light">淺色（白色）</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label="快捷鍵">
        <h2 className="settings-group-header" aria-label="快捷鍵分組">
          <span className="settings-group-header__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M5.75 7.25h12.5A2.75 2.75 0 0 1 21 10v4a2.75 2.75 0 0 1-2.75 2.75H5.75A2.75 2.75 0 0 1 3 14v-4a2.75 2.75 0 0 1 2.75-2.75Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M7 11h.01M10 11h.01M13 11h.01M16 11h1M7 14h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="settings-group-header__label">快捷鍵</span>
        </h2>
        <div className="settings-row settings-row--shortcut">
          <div className="settings-row__text">
            <strong>語音輸入</strong>
            <small>開始與停止語音輸入。</small>
          </div>
          <div className="settings-row__control">
            <ShortcutRecorder
              value={settings.shortcuts.toggleRecording}
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    toggleRecording: value
                  }
                }))
              }
            />
          </div>
        </div>

        <div className="settings-row settings-row--shortcut">
          <div className="settings-row__text">
            <strong>智慧改寫</strong>
            <small>結合選區與語音指令進行處理。</small>
          </div>
          <div className="settings-row__control">
            <ShortcutRecorder
              value={settings.shortcuts.processSelection}
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    processSelection: value
                  }
                }))
              }
            />
          </div>
        </div>

        <div className="settings-row settings-row--shortcut">
          <div className="settings-row__text">
            <strong>翻譯</strong>
            <small>開始與停止翻譯模式。</small>
          </div>
          <div className="settings-row__control">
            <ShortcutRecorder
              value={settings.shortcuts.translateDictation}
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    translateDictation: value
                  }
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label="语言">
        <h2 className="settings-group-header" aria-label="语言分组">
          <span className="settings-group-header__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M3.75 12h16.5M12 3.5c2.1 2.25 3.15 5.08 3.15 8.5S14.1 18.25 12 20.5M12 3.5C9.9 5.75 8.85 8.58 8.85 12S9.9 18.25 12 20.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="settings-group-header__label">语言</span>
        </h2>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>界面语言</strong>
            <small>选择用户界面使用的语言。</small>
          </div>
          <div className="settings-row__control">
            <select
              id="interface-language"
              className="settings__select"
              value={settings.ui.language}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  ui: {
                    ...current.ui,
                    language: event.target.value as InterfaceLanguage
                  }
                }))
              }
            >
              {INTERFACE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>翻译目标</strong>
            <small>选择翻译模式下的听写目标语言。</small>
          </div>
          <div className="settings-row__control">
            <select
              id="translation-target-language"
              className="settings__select"
              value={settings.translation.targetLanguage}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  translation: {
                    ...current.translation,
                    targetLanguage: event.target.value as AppSettings["translation"]["targetLanguage"]
                  }
                }))
              }
            >
              {TRANSLATION_TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label="音频">
        <h2 className="settings-group-header" aria-label="音频分组">
          <span className="settings-group-header__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 3.75a3.25 3.25 0 0 0-3.25 3.25v4.5a3.25 3.25 0 0 0 6.5 0V7A3.25 3.25 0 0 0 12 3.75Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M6.25 10.75v.85a5.75 5.75 0 0 0 11.5 0v-.85M12 17.35v2.9M8.75 20.25h6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="settings-group-header__label">音频</span>
        </h2>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>麦克风</strong>
            <small>选择您首选的麦克风，以便 Typeless 捕捉您的声音。</small>
          </div>
          <div className="settings-row__control">
            <MicrophoneDevicePicker
              variant="page"
              selectedDeviceId={settings.recording.inputDeviceId}
              onDeviceChange={(deviceId) =>
                updateSettings((current) => ({
                  ...current,
                  recording: {
                    ...current.recording,
                    inputDeviceId: deviceId
                  }
                }))
              }
            />
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>交互声音</strong>
            <small>为开始/停止等关键操作播放声音。</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={settings.audio.interactionSounds}
              label="交互声音"
              onChange={(checked) =>
                updateSettings((current) => ({
                  ...current,
                  audio: {
                    ...current.audio,
                    interactionSounds: checked
                  }
                }))
              }
            />
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>语音输入时静音</strong>
            <small>在语音输入时自动静音其他活动音频。</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={settings.audio.muteOtherAudioDuringRecording}
              label="语音输入时静音"
              onChange={(checked) =>
                updateSettings((current) => ({
                  ...current,
                  audio: {
                    ...current.audio,
                    muteOtherAudioDuringRecording: checked
                  }
                }))
              }
            />
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>语音识别语言</strong>
            <small>影响语音识别的语言提示。</small>
          </div>
          <div className="settings-row__control">
            <select
              id="recording-language"
              className="settings__select"
              value={settings.recording.language}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  recording: {
                    ...current.recording,
                    language: event.target.value as RecordingLanguage
                  }
                }))
              }
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>聲波效果</strong>
            <small>選擇懸浮窗的波形風格。</small>
          </div>
          <div className="settings-row__control">
            <select
              id="recording-waveform"
              className="settings__select"
              value={settings.recording.waveformStyle}
              onChange={(event) =>
                updateSettings((current) =>
                  updateWaveformStyle(current, event.target.value as WaveformStyle)
                )
              }
            >
              {WAVEFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label="应用行为">
        <h2 className="settings-group-header" aria-label="应用行为分组">
          <span className="settings-group-header__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M4.5 7.25h15a1.75 1.75 0 0 1 1.75 1.75v8a1.75 1.75 0 0 1-1.75 1.75h-15A1.75 1.75 0 0 1 2.75 17V9A1.75 1.75 0 0 1 4.5 7.25Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 7.25V5.8c0-.86.7-1.55 1.55-1.55h3.9c.86 0 1.55.7 1.55 1.55v1.45M2.75 13h18.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="settings-group-header__label">应用行为</span>
        </h2>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>登录时启动应用</strong>
            <small>当您的计算机启动时，自动打开 Typeless。</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={settings.appBehavior.launchAtLogin}
              label="登录时启动应用"
              onChange={(checked) =>
                updateSettings((current) => ({
                  ...current,
                  appBehavior: {
                    ...current.appBehavior,
                    launchAtLogin: checked
                  }
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label="連線">
        <h2 className="settings-group-header" aria-label="連線分組">
          <span className="settings-group-header__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M7.5 12a4.5 4.5 0 0 1 4.5-4.5h2.5A4.5 4.5 0 0 1 19 12a4.5 4.5 0 0 1-4.5 4.5H13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M11 16.5H9.5A4.5 4.5 0 0 1 5 12a4.5 4.5 0 0 1 4.5-4.5H11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="settings-group-header__label">連線</span>
        </h2>
        <ConnectionSettingsFields
          layout="page"
          settings={settings}
          onSettingsChange={updateSettings}
          wsTestResult={wsTest}
          llmTestResult={llmTest}
          wsTestButton={
            <button
              type="button"
              className="settings__btn settings__btn--compact"
              disabled={wsTest.state === "testing" || Boolean(connectionError)}
              onClick={() => void handleTestWs()}
            >
              {renderTestLabel("WS測試", wsTest.state)}
            </button>
          }
          llmTestButton={
            <button
              type="button"
              className="settings__btn settings__btn--compact"
              disabled={llmTest.state === "testing" || Boolean(connectionError)}
              onClick={() => void handleTestLlm()}
            >
              {renderTestLabel("API測試", llmTest.state)}
            </button>
          }
        />
      </section>

      {connectionError && <p className="settings__hint settings__hint--error">{connectionError}</p>}
      {saveError && <p className="settings__hint settings__hint--error">{saveError}</p>}
    </main>
  );
}

function renderTestLabel(base: string, state: ConnectionTestStatus["state"]): string {
  switch (state) {
    case "testing":
      return "測試中...";
    case "ok":
      return `${base} ✓`;
    case "fail":
      return `${base} ✗`;
    default:
      return base;
  }
}

function SettingsSwitch({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="settings-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch__thumb" aria-hidden="true" />
    </button>
  );
}
