import { describe, expect, it, vi } from "vitest";
import {
  createHttpVersionCheckClient,
  normalizeVersionCheckResponse
} from "./versionCheckClient";

describe("version check client", () => {
  it("maps a backend no-update response", async () => {
    const logger = createLogger();
    const fetch = vi.fn(async () => createJsonResponse({
      code: 200,
      message: "success",
      data: {
        hasUpdate: false,
        versionCode: null,
        phase: null,
        updateType: null,
        updateLog: null,
        downloadUrl: null,
        packageSize: null,
        packageName: null
      }
    }));
    const client = createHttpVersionCheckClient({
      endpoint: " https://api.example.com/appVersion/check ",
      fetch,
      logger
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({ hasUpdate: false });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/appVersion/check?platform=WINDOWS&currentVersion=1.2.3&phase=ALPHA",
      { method: "GET" }
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check request url=https://api.example.com/appVersion/check?platform=WINDOWS&currentVersion=1.2.3&phase=ALPHA"
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check response hasUpdate=false"
    );
  });

  it("uses the configured version phase in the backend request", async () => {
    const logger = createLogger();
    const fetch = vi.fn(async () =>
      createJsonResponse({
        data: {
          hasUpdate: false
        }
      })
    );
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/appVersion/check",
      fetch,
      logger,
      phase: "BETA"
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({ hasUpdate: false });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/appVersion/check?platform=WINDOWS&currentVersion=1.2.3&phase=BETA",
      { method: "GET" }
    );
  });

  it("maps a backend update response with metadata", async () => {
    const logger = createLogger();
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/appVersion/check",
      fetch: vi.fn(async () => createJsonResponse({
        data: {
          hasUpdate: true,
          versionCode: "1.2.4",
          phase: "RELEASE",
          updateType: "FORCED",
          updateLog: "修复启动异常",
          downloadUrl: "/appVersion/download/abc",
          packageSize: 157286400,
          packageName: "aoa-setup-1.2.4.exe"
        }
      })),
      logger
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({
      hasUpdate: true,
      versionCode: "1.2.4",
      phase: "RELEASE",
      updateType: "FORCED",
      updateLog: "修复启动异常",
      downloadUrl: "/appVersion/download/abc",
      packageSize: 157286400,
      packageName: "aoa-setup-1.2.4.exe"
    });
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check response hasUpdate=true version=1.2.4 type=FORCED"
    );
  });

  it("rejects update responses missing required fields", () => {
    expect(() =>
      normalizeVersionCheckResponse({
        data: {
          hasUpdate: true,
          versionCode: "",
          phase: "RELEASE",
          updateType: "FORCED",
          updateLog: "notes",
          downloadUrl: "",
          packageSize: 1,
          packageName: "setup.exe"
        }
      })
    ).toThrow("VERSION_CHECK_INVALID_PAYLOAD");
  });

  it("returns disabled when endpoint is not configured", async () => {
    const logger = createLogger();
    const fetch = vi.fn();
    const client = createHttpVersionCheckClient({
      endpoint: " ",
      fetch,
      logger
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({ disabled: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check disabled: endpoint missing"
    );
  });

  it("rejects unsupported version phases from backend responses", () => {
    expect(() =>
      normalizeVersionCheckResponse({
        data: {
          hasUpdate: true,
          versionCode: "1.2.4",
          phase: "PREVIEW",
          updateType: "OPTIONAL",
          updateLog: "notes",
          downloadUrl: "/appVersion/download/abc"
        }
      })
    ).toThrow("VERSION_CHECK_INVALID_PAYLOAD");
  });

  it("maps non-ok responses to errors", async () => {
    const logger = createLogger();
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/appVersion/check",
      fetch: vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: "boom" })
      })),
      logger
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).rejects.toThrow("VERSION_CHECK_HTTP_500");
    expect(logger.warn).toHaveBeenCalledWith(
      "[update] version check failed status=500"
    );
  });
});

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn()
  };
}

function createJsonResponse(body: unknown): {
  ok: true;
  status: 200;
  statusText: "OK";
  json(): Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    async json() {
      return body;
    }
  };
}
