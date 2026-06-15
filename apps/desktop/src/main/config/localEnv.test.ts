import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { applyLocalEnvFiles } from "./localEnv";

describe("local env loader", () => {
  it("loads local env files without overriding existing values", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aoa-env-"));
    const envPath = join(dir, ".env");
    const env: NodeJS.ProcessEnv = {
      AOA_VERSION_CHECK_URL: "http://existing.example.com/appVersion/check"
    };

    await writeFile(
      envPath,
      [
        "AOA_BACKEND_BASE_URL=http://172.27.209.114:8097",
        "AOA_VERSION_CHECK_URL=http://from-file.example.com/appVersion/check",
        "# ignored comment",
        ""
      ].join("\n"),
      "utf8"
    );

    try {
      const loadedKeys = applyLocalEnvFiles([envPath], env);

      expect(env.AOA_BACKEND_BASE_URL).toBe("http://172.27.209.114:8097");
      expect(env.AOA_VERSION_CHECK_URL).toBe(
        "http://existing.example.com/appVersion/check"
      );
      expect(loadedKeys).toEqual(["AOA_BACKEND_BASE_URL"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
