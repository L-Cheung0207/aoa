import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { normalizeMainAppConfig, readMainAppConfig } from "./appConfig";

describe("main app config", () => {
  it("reads update endpoint fields from config.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aoa-app-config-"));
    const configPath = join(dir, "config.json");

    await writeFile(
      configPath,
      JSON.stringify({
        javaVoiceWsUrl: "ws://java.example/aoa_api/voice",
        versionCheckUrl: " http://java.example/aoa_api/appVersion/check ",
        backendBaseUrl: " http://java.example/aoa_api "
      }),
      "utf8"
    );

    try {
      await expect(readMainAppConfig(configPath)).resolves.toEqual({
        javaVoiceWsUrl: "ws://java.example/aoa_api/voice",
        versionCheckUrl: "http://java.example/aoa_api/appVersion/check",
        backendBaseUrl: "http://java.example/aoa_api"
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("ignores invalid config fields", () => {
    expect(
      normalizeMainAppConfig({
        javaVoiceWsUrl: "",
        versionCheckUrl: " ",
        backendBaseUrl: 123
      })
    ).toEqual({});
  });

  it("falls back to empty config when config.json cannot be read", async () => {
    const logger = { warn: vi.fn() };

    await expect(
      readMainAppConfig("missing-config.json", logger)
    ).resolves.toEqual({});

    expect(logger.warn).toHaveBeenCalledWith(
      "[config] app config load failed; using defaults",
      expect.any(Error)
    );
  });
});
