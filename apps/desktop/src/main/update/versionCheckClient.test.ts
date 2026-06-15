import { describe, expect, it, vi } from "vitest";
import {
  createHttpVersionCheckClient,
  normalizeVersionCheckResponse
} from "./versionCheckClient";

describe("version check client", () => {
  it("maps a backend no-update response", async () => {
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
      fetch
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({ hasUpdate: false });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/appVersion/check?platform=WINDOWS&currentVersion=1.2.3",
      { method: "GET" }
    );
  });

  it("maps a backend update response with metadata", async () => {
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
      }))
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
    const fetch = vi.fn();
    const client = createHttpVersionCheckClient({
      endpoint: " ",
      fetch
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).resolves.toEqual({ disabled: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps non-ok responses to errors", async () => {
    const client = createHttpVersionCheckClient({
      endpoint: "https://api.example.com/appVersion/check",
      fetch: vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ message: "boom" })
      }))
    });

    await expect(
      client.check({ platform: "WINDOWS", currentVersion: "1.2.3" })
    ).rejects.toThrow("VERSION_CHECK_HTTP_500");
  });
});

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
