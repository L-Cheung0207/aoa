import { describe, expect, it } from "vitest";
import { BUNDLED_ASR_WS_URL, createDefaultSettings } from "@voice/shared";
import {
  applyConnectionSettings,
  normalizeConnectionSettings,
  patchConnectionSettings,
  readConnectionSettings,
  validateConnectionSettings
} from "./connectionSettings";

describe("connection settings helpers", () => {
  it("reads and writes a single editable ws/llm connection", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const next = applyConnectionSettings(base, {
      wsUrl: "ws://example.test/ws/transcribe",
      wsProxy: "http://proxy.test:8080",
      wsProxyUsername: "user",
      wsProxyPassword: "pass",
      llmBaseUrl: "http://example.test:9066",
      llmModelName: "Custom API",
      llmProxy: "",
      llmProxyUsername: "",
      llmProxyPassword: ""
    });

    expect(next.ws.servers).toEqual([
      {
        url: "ws://example.test/ws/transcribe",
        proxy: "http://proxy.test:8080",
        proxyUsername: "user",
        proxyPassword: "pass"
      }
    ]);
    expect(next.llm.models).toEqual([
      {
        baseUrl: "http://example.test:9066",
        apiKey: "unused",
        modelName: "Custom API"
      }
    ]);
    expect(readConnectionSettings(next)).toMatchObject({
      wsUrl: "ws://example.test/ws/transcribe",
      llmBaseUrl: "http://example.test:9066",
      llmModelName: "Custom API"
    });
  });

  it("patches individual fields without dropping other connection values", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const patched = patchConnectionSettings(base, {
      llmModelName: "Office API"
    });

    expect(patched.llm.models[0]?.modelName).toBe("Office API");
    expect(patched.ws.servers[0]?.url).toBe(BUNDLED_ASR_WS_URL);
  });

  it("keeps ws proxy cleared instead of falling back to bundled defaults", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const cleared = patchConnectionSettings(base, {
      wsProxy: "",
      wsProxyUsername: "",
      wsProxyPassword: ""
    });

    expect(cleared.ws.servers[0]).toEqual({ url: BUNDLED_ASR_WS_URL });
    expect(readConnectionSettings(cleared)).toMatchObject({
      wsProxy: "",
      wsProxyUsername: "",
      wsProxyPassword: ""
    });
    expect(normalizeConnectionSettings(cleared).ws.servers[0]).toEqual({
      url: BUNDLED_ASR_WS_URL
    });
  });

  it("requires ws url and llm base url before saving", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const invalid = patchConnectionSettings(base, { wsUrl: "  ", llmBaseUrl: "  " });

    expect(validateConnectionSettings(invalid)).toBe("WebSocket 地址不能为空");
  });
});
