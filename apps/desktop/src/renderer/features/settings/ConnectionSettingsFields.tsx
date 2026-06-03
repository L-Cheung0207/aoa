import type { ReactNode } from "react";
import type { AppSettings } from "@voice/shared";
import {
  getPrimaryLlmModel,
  getPrimaryWsServer,
  patchConnectionSettings,
  readConnectionSettings,
  type EditableConnectionSettings
} from "./connectionSettings";

export type ConnectionTestState = "idle" | "testing" | "ok" | "fail";

export interface ConnectionTestStatus {
  state: ConnectionTestState;
  message?: string;
}

interface ConnectionSettingsFieldsProps {
  settings: AppSettings;
  onSettingsChange(next: AppSettings): void;
  layout: "page" | "modal";
  wsTestButton?: ReactNode;
  llmTestButton?: ReactNode;
  wsTestResult?: ConnectionTestStatus;
  llmTestResult?: ConnectionTestStatus;
}

export function ConnectionSettingsFields({
  settings,
  onSettingsChange,
  layout,
  wsTestButton,
  llmTestButton,
  wsTestResult,
  llmTestResult
}: ConnectionSettingsFieldsProps): React.JSX.Element {
  const connection = readConnectionSettings(settings);

  const updateConnection = (patch: Partial<EditableConnectionSettings>): void => {
    onSettingsChange(patchConnectionSettings(settings, patch));
  };

  if (layout === "modal") {
    return (
      <>
        <div className="settings-row settings-row--service">
          <span>
            <strong>ASR WebSocket</strong>
            <small>語音識別即時轉寫連線地址。</small>
          </span>
          <div className="settings-field">
            <div className="settings-service-control">
              <input
                type="text"
                value={connection.wsUrl}
                placeholder="wss://aiapi.ctmcloud.com.mo:8443/.../ws?AccessCode=..."
                onChange={(event) => updateConnection({ wsUrl: event.target.value })}
              />
              {wsTestButton}
            </div>
            <ConnectionTestResult status={wsTestResult} layout="modal" />
          </div>
        </div>
        {renderProxyFields("modal", "ws", connection, updateConnection)}
        <div className="settings-row settings-row--service">
          <span>
            <strong>後處理 API</strong>
            <small>潤色、翻譯等 HTTP 後處理服務地址。</small>
          </span>
          <div className="settings-field">
            <div className="settings-service-control">
              <input
                type="text"
                value={connection.llmBaseUrl}
                placeholder="http://172.30.21.67:9066"
                onChange={(event) => updateConnection({ llmBaseUrl: event.target.value })}
              />
              {llmTestButton}
            </div>
            <ConnectionTestResult status={llmTestResult} layout="modal" />
          </div>
        </div>
        <label className="settings-row">
          <span>
            <strong>API 顯示名稱</strong>
            <small>僅用於介面展示，可選。</small>
          </span>
          <input
            type="text"
            value={connection.llmModelName}
            placeholder="AOSO API"
            onChange={(event) => updateConnection({ llmModelName: event.target.value })}
          />
        </label>
        {renderProxyFields("modal", "llm", connection, updateConnection)}
      </>
    );
  }

  return (
    <>
      <div className="settings-row settings-row--service">
        <div className="settings-row__text">
          <strong>ASR WebSocket</strong>
          <small>語音識別即時轉寫連線地址。</small>
        </div>
        <div className="settings-row__control">
          <div className="settings-field">
            <div className="settings-service-control">
              <input
                id="ws-url"
                className="settings__input"
                type="text"
                value={connection.wsUrl}
                placeholder="wss://aiapi.ctmcloud.com.mo:8443/.../ws?AccessCode=..."
                onChange={(event) => updateConnection({ wsUrl: event.target.value })}
              />
              {wsTestButton}
            </div>
            <ConnectionTestResult status={wsTestResult} layout="page" />
          </div>
        </div>
      </div>
      {renderProxyFields("page", "ws", connection, updateConnection)}

      <div className="settings-row settings-row--service">
        <div className="settings-row__text">
          <strong>後處理 API</strong>
          <small>潤色、翻譯等 HTTP 後處理服務地址。</small>
        </div>
        <div className="settings-row__control">
          <div className="settings-field">
            <div className="settings-service-control">
              <input
                id="llm-base-url"
                className="settings__input"
                type="text"
                value={connection.llmBaseUrl}
                placeholder="http://172.30.21.67:9066"
                onChange={(event) => updateConnection({ llmBaseUrl: event.target.value })}
              />
              {llmTestButton}
            </div>
            <ConnectionTestResult status={llmTestResult} layout="page" />
          </div>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row__text">
          <strong>API 顯示名稱</strong>
          <small>僅用於介面展示，可選。</small>
        </div>
        <div className="settings-row__control">
          <input
            id="llm-model-name"
            className="settings__input"
            type="text"
            value={connection.llmModelName}
            placeholder="AOSO API"
            onChange={(event) => updateConnection({ llmModelName: event.target.value })}
          />
        </div>
      </div>
      {renderProxyFields("page", "llm", connection, updateConnection)}
    </>
  );
}

export function getConnectionTargets(settings: AppSettings): {
  wsServer: ReturnType<typeof getPrimaryWsServer>;
  llmModel: ReturnType<typeof getPrimaryLlmModel>;
} {
  const normalized = patchConnectionSettings(settings, readConnectionSettings(settings));
  return {
    wsServer: getPrimaryWsServer(normalized),
    llmModel: getPrimaryLlmModel(normalized)
  };
}

function ConnectionTestResult({
  status,
  layout
}: {
  status?: ConnectionTestStatus | undefined;
  layout: "page" | "modal";
}): React.JSX.Element | null {
  if (!status?.message || status.state === "idle") {
    return null;
  }

  return (
    <p
      className={`connection-test-result connection-test-result--${layout} connection-test-result--${status.state}`}
      role="status"
      aria-live="polite"
    >
      {status.message}
    </p>
  );
}

function renderProxyFields(
  layout: "page" | "modal",
  target: "ws" | "llm",
  connection: EditableConnectionSettings,
  updateConnection: (patch: Partial<EditableConnectionSettings>) => void
): React.JSX.Element {
  const prefix = target === "ws" ? "ws" : "llm";
  const proxyKey = `${prefix}Proxy` as const;
  const usernameKey = `${prefix}ProxyUsername` as const;
  const passwordKey = `${prefix}ProxyPassword` as const;
  const idPrefix = `${layout}-${target}`;

  const fields = (
    <>
      {layout === "page" ? (
        <label className="settings__label" htmlFor={`${idPrefix}-proxy`}>
          代理地址
        </label>
      ) : null}
      <input
        id={`${idPrefix}-proxy`}
        className={layout === "page" ? "settings__input" : undefined}
        type="text"
        value={connection[proxyKey]}
        placeholder="http://proxy.example.com:8080"
        onChange={(event) => updateConnection({ [proxyKey]: event.target.value })}
      />
      {layout === "page" ? (
        <label className="settings__label" htmlFor={`${idPrefix}-proxy-user`}>
          代理使用者名稱
        </label>
      ) : null}
      <input
        id={`${idPrefix}-proxy-user`}
        className={layout === "page" ? "settings__input" : undefined}
        type="text"
        value={connection[usernameKey]}
        placeholder="使用者名稱"
        onChange={(event) => updateConnection({ [usernameKey]: event.target.value })}
      />
      {layout === "page" ? (
        <label className="settings__label" htmlFor={`${idPrefix}-proxy-pass`}>
          代理密碼
        </label>
      ) : null}
      <input
        id={`${idPrefix}-proxy-pass`}
        className={layout === "page" ? "settings__input" : undefined}
        type="password"
        value={connection[passwordKey]}
        placeholder="密碼"
        autoComplete="off"
        onChange={(event) => updateConnection({ [passwordKey]: event.target.value })}
      />
    </>
  );

  if (layout === "page") {
    return (
      <div className="settings-row settings-row--proxy">
        <div className="settings-row__text">
          <strong>{target === "ws" ? "WS 代理（可選）" : "API 代理（可選）"}</strong>
          <small>留空表示直連。</small>
        </div>
        <div className="settings-row__control">
          <div className="settings-field settings-field--proxy">
            {fields}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-row settings-row--proxy">
      <span>
        <strong>{target === "ws" ? "WS 代理" : "API 代理"}</strong>
        <small>可選。留空表示直連。</small>
      </span>
      <div className="settings-field settings-field--proxy">{fields}</div>
    </div>
  );
}
