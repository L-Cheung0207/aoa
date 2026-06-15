import { useCallback, useEffect, useState } from "react";
import type {
  AppSettings,
  InterfaceLanguage,
  RecordingLanguage,
  WaveformStyle,
} from "@voice/shared";
import { ConnectionSettingsFields } from "./ConnectionSettingsFields";
import {
  normalizeConnectionSettings,
  validateConnectionSettings,
} from "./connectionSettings";
import { MicrophoneDevicePicker } from "../../shared/ui/MicrophoneDevicePicker";
import { ThemedIcon, type ThemedIconName } from "../../shared/ui/ThemedIcon";
import { ShortcutRecorder } from "./ShortcutRecorder";
import { useAutoSaveSettings } from "./useAutoSaveSettings";
import { WaveformPreview } from "./WaveformPreview";
import { getSettingsText } from "./settingsI18n";

function updateWaveformStyle(
  current: AppSettings,
  waveformStyle: WaveformStyle,
): AppSettings {
  return {
    ...current,
    recording: {
      ...current.recording,
      waveformStyle,
    },
  };
}

interface SettingsPageProps {
  initialSettings?: AppSettings | undefined;
}

type ShortcutSettingKey =
  | "toggleRecording"
  | "translateDictation"
  | "processSelection";

export function getOtherShortcutValues(
  settings: AppSettings,
  key: ShortcutSettingKey
): string[] {
  const shortcuts = settings.shortcuts;
  const keys: ShortcutSettingKey[] = [
    "toggleRecording",
    "translateDictation",
    "processSelection"
  ];
  return keys
    .filter((item) => item !== key)
    .map((item) => shortcuts[item])
    .filter(Boolean);
}

export function SettingsPage({
  initialSettings,
}: SettingsPageProps = {}): React.JSX.Element {
  const fallbackText = getSettingsText(initialSettings?.ui.language);
  const [settings, setSettings] = useState<AppSettings | undefined>(
    initialSettings,
  );
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  const autoSave = useAutoSaveSettings({
    scope: "page",
    validate: validateConnectionSettings,
    onError: (message) => setSaveError(message),
  });

  const updateSettings = useCallback(
    (updater: AppSettings | ((draft: AppSettings) => AppSettings)): void => {
      setSettings(
        (current) => autoSave.commitSettings(current, updater) ?? current,
      );
    },
    [autoSave],
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
  const developerModeEnabled = settings.developer.enabled;
  const connectionError = validateConnectionSettings(settings);

  return (
    <main className="settings">
      <header className="settings-header">
        <div className="settings-header__left">
          <h1 className="settings-header__title">{text.header.title}</h1>
          <p className="settings-header__subtitle">{text.header.subtitle}</p>
        </div>
      </header>

      <section
        className="settings__section settings__section--plain"
        aria-label={text.sections.appearance}
      >
        <h2
          className="settings-group-header"
          aria-label={text.sections.appearance}
        >
          <span className="settings-group-header__icon" aria-hidden="true">
            <SettingsSectionIcon name="appearance" />
          </span>
          <span className="settings-group-header__label">
            {text.sections.appearance}
          </span>
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
                      theme,
                    },
                  };
                });
                void window.voiceAI
                  .updateSettings({ ui: { theme } })
                  .catch((error) => {
                    setSaveError(
                      `${text.common.saveFailed}${error instanceof Error ? error.message : String(error)}`,
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

      <section
        className="settings__section settings__section--plain"
        aria-label={text.sections.shortcuts}
      >
        <h2
          className="settings-group-header"
          aria-label={text.sections.shortcuts}
        >
          <span className="settings-group-header__icon" aria-hidden="true">
            <SettingsSectionIcon name="keyboard" />
          </span>
          <span className="settings-group-header__label">
            {text.sections.shortcuts}
          </span>
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
              existingShortcuts={getOtherShortcutValues(
                settings,
                "toggleRecording"
              )}
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    toggleRecording: value,
                  },
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
              existingShortcuts={getOtherShortcutValues(
                settings,
                "translateDictation"
              )}
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    translateDictation: value,
                  },
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
              existingShortcuts={getOtherShortcutValues(
                settings,
                "processSelection"
              )}
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    processSelection: value,
                  },
                }))
              }
            />
          </div>
        </div>
      </section>

      <section
        className="settings__section settings__section--plain"
        aria-label={text.sections.language}
      >
        <h2
          className="settings-group-header"
          aria-label={text.sections.language}
        >
          <span className="settings-group-header__icon" aria-hidden="true">
            <SettingsSectionIcon name="language" />
          </span>
          <span className="settings-group-header__label">
            {text.sections.language}
          </span>
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
                    language: event.target.value as InterfaceLanguage,
                  },
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
                    targetLanguage: event.target
                      .value as AppSettings["translation"]["targetLanguage"],
                  },
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

      <section
        className="settings__section settings__section--plain"
        aria-label={text.sections.audio}
      >
        <h2 className="settings-group-header" aria-label={text.sections.audio}>
          <span className="settings-group-header__icon" aria-hidden="true">
            <SettingsSectionIcon name="microphone" />
          </span>
          <span className="settings-group-header__label">
            {text.sections.audio}
          </span>
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
                    inputDeviceId: deviceId,
                  },
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
                    interactionSounds: checked,
                  },
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
                    muteOtherAudioDuringRecording: checked,
                  },
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
                    language: event.target.value as RecordingLanguage,
                  },
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
                    updateWaveformStyle(
                      current,
                      event.target.value as WaveformStyle,
                    ),
                  )
                }
              >
                {text.options.waveforms.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.key}
                  </option>
                ))}
              </select>
              <div
                className="settings-waveform-preview"
                aria-label={text.audio.waveformPreview}
              >
                <WaveformPreview
                  styleName={settings.recording.waveformStyle}
                  label={
                    text.options.waveforms.find(
                      (option) =>
                        option.value === settings.recording.waveformStyle,
                    )?.key ?? text.audio.waveformPreview
                  }
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="settings__section settings__section--plain"
        aria-label={text.sections.appBehavior}
      >
        <h2
          className="settings-group-header"
          aria-label={text.sections.appBehavior}
        >
          <span className="settings-group-header__icon" aria-hidden="true">
            <SettingsSectionIcon name="appBehavior" />
          </span>
          <span className="settings-group-header__label">
            {text.sections.appBehavior}
          </span>
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
                    launchAtLogin: checked,
                  },
                }))
              }
            />
          </div>
        </div>
      </section>

      <section
        className="settings__section settings__section--plain"
        aria-label={text.sections.connection}
      >
        <h2
          className="settings-group-header"
          aria-label={text.sections.connection}
        >
          <span className="settings-group-header__icon" aria-hidden="true">
            <SettingsSectionIcon name="connection" mode="image" />
          </span>
          <span className="settings-group-header__label">
            {text.sections.connection}
          </span>
        </h2>
        <div className="settings-row">
          <div className="settings-row__text">
            <strong>{text.connection.developerMode}</strong>
            <small>{text.connection.developerModeDescription}</small>
          </div>
          <div className="settings-row__control">
            <SettingsSwitch
              checked={developerModeEnabled}
              label={text.connection.developerMode}
              onChange={(checked) =>
                updateSettings((current) => ({
                  ...current,
                  developer: {
                    ...current.developer,
                    enabled: checked,
                  },
                }))
              }
            />
          </div>
        </div>
        {developerModeEnabled ? (
          <ConnectionSettingsFields
            layout="page"
            settings={settings}
            language={settings.ui.language}
            onSettingsChange={updateSettings}
          />
        ) : null}
      </section>

      {developerModeEnabled && connectionError && (
        <p className="settings__hint settings__hint--error">
          {connectionError}
        </p>
      )}
      {saveError && (
        <p className="settings__hint settings__hint--error">{saveError}</p>
      )}
    </main>
  );
}

function SettingsSectionIcon({
  name,
  mode = "mask",
}: {
  name: ThemedIconName;
  mode?: "mask" | "image";
}): React.JSX.Element {
  return <ThemedIcon name={name} mode={mode} />;
}

function SettingsSwitch({
  checked,
  label,
  onChange,
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
