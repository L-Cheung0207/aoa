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
      expect.objectContaining({ method: "GET" })
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
      expect.objectContaining({ method: "GET" })
    );
  });

  it("maps a backend update response with metadata", async () => {
    const logger = createLogger();
    const responseBody = {
      code: "10000000",
      message: "success",
      data: {
        hasUpdate: true,
        versionCode: "1.2.4",
        phase: "RELEASE",
        updateType: "FORCED",
        updateLog: "修复启动异常",
        downloadUrl: "/appVersion/download/abc",
        packageSha256:
          "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
        packageSize: 157286400,
        packageName: "aoa-setup-1.2.4.exe"
      }
    };
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/appVersion/check",
      fetch: vi.fn(async () => createJsonResponse(responseBody)),
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
      downloadUrl: "https://api.example.com/appVersion/download/abc",
      packageSha256:
        "9e6d2547e97c688d192e0dfc090b0cba99d1c2745cab6f15955e2b8a65c0a082",
      packageSize: 157286400,
      packageName: "aoa-setup-1.2.4.exe"
    });
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check response hasUpdate=true version=1.2.4 type=FORCED"
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check response payload hasUpdate=true version=1.2.4 phase=RELEASE type=FORCED updateLogLength=6 downloadUrlPresent=true packageSha256Present=true packageSize=157286400 packageName=aoa-setup-1.2.4.exe"
    );
    expect(logger.log.mock.calls.join("\n")).not.toContain("修复启动异常");
    expect(logger.log.mock.calls.join("\n")).not.toContain(
      "/appVersion/download/abc"
    );
  });

  it("redacts secret endpoint parameters in request logs", async () => {
    const logger = createLogger();
    const fetch = vi.fn(async () =>
      createJsonResponse({
        data: {
          hasUpdate: false
        }
      })
    );
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/appVersion/check?token=secret",
      fetch,
      logger
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({ hasUpdate: false });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/appVersion/check?token=secret&platform=WINDOWS&currentVersion=1.2.3&phase=ALPHA",
      expect.objectContaining({ method: "GET" })
    );
    expect(logger.log).toHaveBeenCalledWith(
      "[update] version check request url=https://api.example.com/appVersion/check?token=***&platform=WINDOWS&currentVersion=1.2.3&phase=ALPHA"
    );
  });

  it("resolves backend download paths relative to the version API prefix", async () => {
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/aoa_api/appVersion/check",
      fetch: vi.fn(async () => createJsonResponse({
        data: {
          hasUpdate: true,
          versionCode: "1.2.4",
          phase: "RELEASE",
          updateType: "OPTIONAL",
          updateLog: "notes",
          downloadUrl: "/appVersion/download/abc"
        }
      }))
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toMatchObject({
      downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc"
    });
  });

  it("keeps backend download paths that already include the API prefix", async () => {
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/aoa_api/appVersion/check",
      fetch: vi.fn(async () => createJsonResponse({
        data: {
          hasUpdate: true,
          versionCode: "1.2.4",
          phase: "RELEASE",
          updateType: "OPTIONAL",
          updateLog: "notes",
          downloadUrl: "/aoa_api/appVersion/download/abc"
        }
      }))
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toMatchObject({
      downloadUrl: "https://api.example.com/aoa_api/appVersion/download/abc"
    });
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
      fetch: vi.fn(async () => createJsonResponse({ message: "boom" }, 500)),
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

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
