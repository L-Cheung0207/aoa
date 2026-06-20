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
  it("reads and writes a single editable ws connection", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const next = applyConnectionSettings(base, {
      wsUrl: "ws://example.test/ws/transcribe",
      wsProxy: "http://proxy.test:8080",
      wsProxyUsername: "user",
      wsProxyPassword: "pass"
    });

    expect(next.ws.servers).toEqual([
      {
        url: "ws://example.test/ws/transcribe",
        proxy: "http://proxy.test:8080",
        proxyUsername: "user",
        proxyPassword: "pass"
      }
    ]);
    expect(readConnectionSettings(next)).toMatchObject({
      wsUrl: "ws://example.test/ws/transcribe",
      wsProxy: "http://proxy.test:8080",
      wsProxyUsername: "user",
      wsProxyPassword: "pass"
    });
  });

  it("patches individual fields without dropping other connection values", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const patched = patchConnectionSettings(base, {
      wsProxy: "http://proxy.test:8080"
    });

    expect(patched.ws.servers[0]?.proxy).toBe("http://proxy.test:8080");
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

  it("requires ws url before saving", () => {
    const base = createDefaultSettings({ isPackaged: false });
    base.developer.enabled = true;
    const invalid = patchConnectionSettings(base, { wsUrl: "  " });

    expect(validateConnectionSettings(invalid)).toBe("WebSocket 地址不能为空");
  });

  it("does not block saving unrelated settings when developer mode is disabled", () => {
    const base = createDefaultSettings({ isPackaged: false });
    const invalid = patchConnectionSettings(base, { wsUrl: "  " });

    expect(validateConnectionSettings(invalid)).toBeUndefined();
  });
});
