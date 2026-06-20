import type { AppSettings, InterfaceLanguage } from "@voice/shared";
import {
  patchConnectionSettings,
  readConnectionSettings,
  type EditableConnectionSettings,
} from "./connectionSettings";
import { getSettingsText } from "./settingsI18n";

interface ConnectionSettingsFieldsProps {
  settings: AppSettings;
  language?: InterfaceLanguage;
  onSettingsChange(next: AppSettings): void;
  layout: "page" | "modal";
}

export function ConnectionSettingsFields({
  settings,
  language,
  onSettingsChange,
  layout,
}: ConnectionSettingsFieldsProps): React.JSX.Element {
  const text = getSettingsText(language ?? settings.ui.language);
  const connection = readConnectionSettings(settings);

  const updateConnection = (patch: Partial<EditableConnectionSettings>): void => {
    onSettingsChange(patchConnectionSettings(settings, patch));
  };

  if (layout === "modal") {
    return (
      <label className="settings-row settings-row--service">
        <span>
          <strong>{text.connection.apiAddress}</strong>
          <small>{text.connection.apiAddressDescription}</small>
        </span>
        <input
          type="text"
          value={connection.wsUrl}
          placeholder="ws://172.27.209.114:8095/aoa_api/voice"
          onChange={(event) => updateConnection({ wsUrl: event.target.value })}
        />
      </label>
    );
  }

  return (
    <div className="settings-row settings-row--service">
      <div className="settings-row__text">
        <strong>{text.connection.apiAddress}</strong>
        <small>{text.connection.apiAddressDescription}</small>
      </div>
      <div className="settings-row__control">
        <input
          id="developer-api-url"
          className="settings__input"
          type="text"
          value={connection.wsUrl}
          placeholder="ws://172.27.209.114:8095/aoa_api/voice"
          onChange={(event) => updateConnection({ wsUrl: event.target.value })}
        />
      </div>
    </div>
  );
}
