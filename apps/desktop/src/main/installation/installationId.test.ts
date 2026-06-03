import { describe, expect, it } from "vitest";
import type { ConfigStorageAdapter } from "../config/configStore";
import {
  INSTALLATION_ID_KEY,
  getOrCreateInstallationId
} from "./installationId";

function createMemoryAdapter(initial: Record<string, unknown> = {}): {
  adapter: ConfigStorageAdapter;
  storage: Record<string, unknown>;
  writes: Array<{ key: string; value: unknown }>;
} {
  const storage: Record<string, unknown> = { ...initial };
  const writes: Array<{ key: string; value: unknown }> = [];
  const adapter: ConfigStorageAdapter = {
    get: (key) => storage[key],
    set: (key, value) => {
      storage[key] = value;
      writes.push({ key, value });
    },
    delete: (key) => {
      delete storage[key];
    }
  };
  return { adapter, storage, writes };
}

describe("installationId", () => {
  it("creates and persists a new id when none exists", () => {
    const { adapter, storage, writes } = createMemoryAdapter();
    const id = getOrCreateInstallationId({
      adapter,
      generate: () => "generated-id"
    });

    expect(id).toBe("generated-id");
    expect(storage[INSTALLATION_ID_KEY]).toBe("generated-id");
    expect(writes).toEqual([{ key: INSTALLATION_ID_KEY, value: "generated-id" }]);
  });

  it("returns the persisted id without re-writing", () => {
    const { adapter, writes } = createMemoryAdapter({
      [INSTALLATION_ID_KEY]: "existing-id"
    });

    const id = getOrCreateInstallationId({
      adapter,
      generate: () => {
        throw new Error("should not generate when id already exists");
      }
    });

    expect(id).toBe("existing-id");
    expect(writes).toHaveLength(0);
  });
});
