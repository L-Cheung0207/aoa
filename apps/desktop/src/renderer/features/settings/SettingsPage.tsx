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
import { WaveformPreview } from "./WaveformPreview";
import { getSettingsText, type SettingsText } from "./settingsI18n";

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

function formatLocalizedConnectivityMessage(
  label: string,
  result: { ok: boolean; message: string; elapsedMs?: number },
  text: SettingsText
): string {
  if (result.ok) {
    return `${label}${text.connection.connectionSucceeded}${
      result.elapsedMs ? ` (${result.elapsedMs}ms)` : ""
    }`;
  }
  return `${label}${text.connection.connectionFailed}${result.message}`;
}

export function SettingsPage({ initialSettings }: SettingsPageProps = {}): React.JSX.Element {
  const fallbackText = getSettingsText(initialSettings?.ui.language);
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
        <div className="settings__error">
          {fallbackText.common.loadFailed}
          {loadError}
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="settings">
        <div className="settings__loading">{fallbackText.common.loading}</div>
      </main>
    );
  }

  const text = getSettingsText(settings.ui.language);
  const connectionError = validateConnectionSettings(settings);

  const handleTestWs = async (): Promise<void> => {
    const { wsServer } = getConnectionTargets(settings);
    if (!wsServer?.url.trim()) {
      setWsTest({ state: "fail", message: text.connection.wsMissing });
      return;
    }

    setWsTest({ state: "testing", message: text.connection.testingWs });
    try {
      const result = await window.voiceAI.testWebSocket(wsServer);
      setWsTest({
        state: result.ok ? "ok" : "fail",
        message: formatLocalizedConnectivityMessage(text.connection.wsService, result, text)
      });
    } catch (error) {
      setWsTest({
        state: "fail",
        message: `${text.connection.wsService}${text.connection.connectionException}${
          error instanceof Error ? error.message : String(error)
        }`
      });
    }
  };

  const handleTestLlm = async (): Promise<void> => {
    const { llmModel } = getConnectionTargets(settings);
    if (!llmModel?.baseUrl.trim()) {
      setLlmTest({ state: "fail", message: text.connection.apiMissing });
      return;
    }

    setLlmTest({ state: "testing", message: text.connection.testingApi });
    try {
      const result = await window.voiceAI.testLlm(llmModel);
      setLlmTest({
        state: result.ok ? "ok" : "fail",
        message: formatLocalizedConnectivityMessage(text.connection.apiService, result, text)
      });
    } catch (error) {
      setLlmTest({
        state: "fail",
        message: `${text.connection.apiService}${text.connection.connectionException}${
          error instanceof Error ? error.message : String(error)
        }`
      });
    }
  };

  return (
    <main className="settings">
      <header className="settings-header">
        <div className="settings-header__left">
          <h1 className="settings-header__title">{text.header.title}</h1>
          <p className="settings-header__subtitle">
            {text.header.subtitle}
          </p>
        </div>
      </header>

      <section className="settings__section settings__section--plain" aria-label={text.sections.appearance}>
        <h2 className="settings-group-header" aria-label={text.sections.appearance}>
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
          <span className="settings-group-header__label">{text.sections.appearance}</span>
        </h2>
        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.appearance.theme}</strong>
            <small>{text.appearance.themeDescription}</small>
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
                    `${text.common.saveFailed}${error instanceof Error ? error.message : String(error)}`
                  );
                });
              }}
            >
              <option value="dark">{text.appearance.darkTheme}</option>
              <option value="light">{text.appearance.lightTheme}</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label={text.sections.shortcuts}>
        <h2 className="settings-group-header" aria-label={text.sections.shortcuts}>
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
          <span className="settings-group-header__label">{text.sections.shortcuts}</span>
        </h2>
        <div className="settings-row settings-row--shortcut">
          <div className="settings-row__text">
            <strong>{text.shortcuts.voiceInput}</strong>
            <small>{text.shortcuts.voiceInputDescription}</small>
          </div>
          <div className="settings-row__control">
            <ShortcutRecorder
              language={settings.ui.language}
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
            <strong>{text.shortcuts.smartRewrite}</strong>
            <small>{text.shortcuts.smartRewriteDescription}</small>
          </div>
          <div className="settings-row__control">
            <ShortcutRecorder
              language={settings.ui.language}
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
            <strong>{text.shortcuts.translate}</strong>
            <small>{text.shortcuts.translateDescription}</small>
          </div>
          <div className="settings-row__control">
            <ShortcutRecorder
              language={settings.ui.language}
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

      <section className="settings__section settings__section--plain" aria-label={text.sections.language}>
        <h2 className="settings-group-header" aria-label={text.sections.language}>
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
          <span className="settings-group-header__label">{text.sections.language}</span>
        </h2>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.language.interfaceLanguage}</strong>
            <small>{text.language.interfaceLanguageDescription}</small>
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
              {text.options.interfaceLanguages.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.language.translationTarget}</strong>
            <small>{text.language.translationTargetDescription}</small>
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
              {text.options.translationTargets.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label={text.sections.audio}>
        <h2 className="settings-group-header" aria-label={text.sections.audio}>
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
          <span className="settings-group-header__label">{text.sections.audio}</span>
        </h2>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.audio.microphone}</strong>
            <small>{text.audio.microphoneDescription}</small>
          </div>
          <div className="settings-row__control">
            <MicrophoneDevicePicker
              variant="page"
              language={settings.ui.language}
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
            <strong>{text.audio.interactionSounds}</strong>
            <small>{text.audio.interactionSoundsDescription}</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={settings.audio.interactionSounds}
              label={text.audio.interactionSounds}
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
            <strong>{text.audio.muteDuringVoiceInput}</strong>
            <small>{text.audio.muteDuringVoiceInputDescription}</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={settings.audio.muteOtherAudioDuringRecording}
              label={text.audio.muteDuringVoiceInput}
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
            <strong>{text.audio.recognitionLanguage}</strong>
            <small>{text.audio.recognitionLanguageDescription}</small>
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
              {text.options.recordingLanguages.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.audio.waveformEffect}</strong>
            <small>{text.audio.waveformEffectDescription}</small>
          </div>
          <div className="settings-row__control">
            <div className="settings-waveform-control">
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
                {text.options.waveforms.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.key}
                  </option>
                ))}
              </select>
              <div className="settings-waveform-preview" aria-label={text.audio.waveformPreview}>
                <WaveformPreview
                  styleName={settings.recording.waveformStyle}
                  label={
                    text.options.waveforms.find(
                      (option) => option.value === settings.recording.waveformStyle
                    )?.key ?? text.audio.waveformPreview
                  }
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="settings__section settings__section--plain" aria-label={text.sections.appBehavior}>
        <h2 className="settings-group-header" aria-label={text.sections.appBehavior}>
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
          <span className="settings-group-header__label">{text.sections.appBehavior}</span>
        </h2>

        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.appBehavior.launchAtLogin}</strong>
            <small>{text.appBehavior.launchAtLoginDescription}</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={settings.appBehavior.launchAtLogin}
              label={text.appBehavior.launchAtLogin}
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

      <section className="settings__section settings__section--plain" aria-label={text.sections.connection}>
        <h2 className="settings-group-header" aria-label={text.sections.connection}>
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
          <span className="settings-group-header__label">{text.sections.connection}</span>
        </h2>
        <ConnectionSettingsFields
          layout="page"
          settings={settings}
          language={settings.ui.language}
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
              {renderLocalizedTestLabel(text.connection.wsTest, wsTest.state, text)}
            </button>
          }
          llmTestButton={
            <button
              type="button"
              className="settings__btn settings__btn--compact"
              disabled={llmTest.state === "testing" || Boolean(connectionError)}
              onClick={() => void handleTestLlm()}
            >
              {renderLocalizedTestLabel(text.connection.apiTest, llmTest.state, text)}
            </button>
          }
        />
      </section>

      {connectionError && <p className="settings__hint settings__hint--error">{connectionError}</p>}
      {saveError && <p className="settings__hint settings__hint--error">{saveError}</p>}
    </main>
  );
}

function renderLocalizedTestLabel(
  base: string,
  state: ConnectionTestStatus["state"],
  text: SettingsText
): string {
  switch (state) {
    case "testing":
      return text.common.testing;
    case "ok":
      return `${base}${text.common.testOkSuffix}`;
    case "fail":
      return `${base}${text.common.testFailSuffix}`;
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
