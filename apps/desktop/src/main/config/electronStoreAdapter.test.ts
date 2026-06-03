import { describe, expect, it } from "vitest";
import { createElectronStoreAdapter } from "./electronStoreAdapter";

describe("electron store adapter", () => {
  it("delegates get set and delete to the wrapped store", () => {
    const calls: string[] = [];
    const values = new Map<string, unknown>();
    const adapter = createElectronStoreAdapter({
      get: (key) => {
        calls.push(`get:${key}`);
        return values.get(key);
      },
      set: (key, value) => {
        calls.push(`set:${key}`);
        values.set(key, value);
      },
      delete: (key) => {
        calls.push(`delete:${key}`);
        values.delete(key);
      }
    });

    adapter.set("settings", { ok: true });
    expect(adapter.get("settings")).toEqual({ ok: true });
    adapter.delete("settings");
    expect(adapter.get("settings")).toBeUndefined();
    expect(calls).toEqual(["set:settings", "get:settings", "delete:settings", "get:settings"]);
  });
});
