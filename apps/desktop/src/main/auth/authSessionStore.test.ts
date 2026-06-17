import { describe, expect, it, vi } from "vitest";
import { createAuthSessionStore } from "./authSessionStore";
import type { ConfigStorageAdapter } from "../config/configStore";
import type { AuthTokenResponse } from "./authTypes";

class MemoryConfigAdapter implements ConfigStorageAdapter {
  readonly values = new Map<string, unknown>();

  get(key: string): unknown {
    return this.values.get(key);
  }

  set(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  delete(key: string): void {
    this.values.delete(key);
  }
}

function createSafeStorage(available = true) {
  return {
    isEncryptionAvailable: vi.fn(() => available),
    encryptString: vi.fn((text: string) => Buffer.from(`encrypted:${text}`, "utf8")),
    decryptString: vi.fn((encrypted: Buffer) =>
      encrypted.toString("utf8").replace(/^encrypted:/, "")
    )
  };
}

const storedEncryptedRefreshToken = Buffer.from(
  "encrypted:refresh-1",
  "utf8"
).toString("base64");

const nowMs = Date.parse("2026-06-17T09:00:00.000Z");

const tokenResponse: AuthTokenResponse = {
  user: {
    id: "user-1",
    displayName: "Alex",
    email: "alex@example.com",
    authType: "email_code"
  },
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresInSeconds: 7200,
  refreshExpiresInSeconds: 2592000,
  featureFlags: {
    history: true,
    ldapLogin: false
  }
};

describe("auth session store", () => {
  it("encrypts refresh token and persists user metadata under auth.session", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    const store = createAuthSessionStore({
      adapter,
      safeStorage,
      now: () => nowMs
    });

    store.write(tokenResponse, { persistRefreshToken: true });

    expect(adapter.values.get("auth.session")).toEqual({
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: {
        history: true,
        ldapLogin: false
      }
    });
    expect(safeStorage.encryptString).toHaveBeenCalledWith("refresh-1");
  });

  it("reads and decrypts stored session", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: tokenResponse.featureFlags
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toEqual({
      user: tokenResponse.user,
      refreshToken: "refresh-1",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: tokenResponse.featureFlags
    });
    expect(safeStorage.decryptString).toHaveBeenCalledWith(
      Buffer.from("encrypted:refresh-1", "utf8")
    );
  });

  it("does not persist refresh token when safeStorage unavailable", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage(false);
    adapter.set("auth.session", { stale: true });
    const store = createAuthSessionStore({
      adapter,
      safeStorage,
      now: () => nowMs
    });

    store.write(tokenResponse, { persistRefreshToken: true });

    expect(store.isPersistentSessionAvailable()).toBe(false);
    expect(adapter.values.has("auth.session")).toBe(false);
    expect(safeStorage.encryptString).not.toHaveBeenCalled();
  });

  it("deletes stale auth session when refresh token encryption fails", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    safeStorage.encryptString.mockImplementation(() => {
      throw new Error("safeStorage failed");
    });
    adapter.set("auth.session", { stale: true });
    const store = createAuthSessionStore({
      adapter,
      safeStorage,
      now: () => nowMs
    });

    expect(() =>
      store.write(tokenResponse, { persistRefreshToken: true })
    ).toThrow("safeStorage failed");
    expect(adapter.values.has("auth.session")).toBe(false);
  });

  it("ignores stored sessions with invalid expiry dates", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "not-a-date",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: tokenResponse.featureFlags
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toBeUndefined();
  });

  it("ignores stored sessions with invalid refresh expiry dates", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "not-a-date",
      featureFlags: tokenResponse.featureFlags
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toBeUndefined();
  });

  it("does not leak extra stored user fields", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", {
      v: 1,
      user: {
        ...tokenResponse.user,
        role: "admin"
      },
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: {
        history: true,
        ldapLogin: false
      }
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toEqual({
      user: tokenResponse.user,
      refreshToken: "refresh-1",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: {
        history: true,
        ldapLogin: false
      }
    });
  });

  it("ignores stored sessions with non-boolean feature flags", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: {
        history: true,
        nested: { enabled: true }
      }
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toBeUndefined();
  });

  it("ignores stored sessions with array feature flags", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z",
      featureFlags: [true]
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toBeUndefined();
  });

  it("returns undefined when refresh token decryption fails", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    safeStorage.decryptString.mockImplementation(() => {
      throw new Error("decrypt failed");
    });
    adapter.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: storedEncryptedRefreshToken,
      refreshTokenProtection: "safeStorage",
      expiresAt: "2026-06-17T11:00:00.000Z",
      refreshExpiresAt: "2026-07-17T09:00:00.000Z"
    });
    const store = createAuthSessionStore({ adapter, safeStorage });

    expect(store.read()).toBeUndefined();
  });

  it("in-memory-only login clears persisted auth session", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", { stale: true });
    const store = createAuthSessionStore({
      adapter,
      safeStorage,
      now: () => nowMs
    });

    store.write(tokenResponse, { persistRefreshToken: false });

    expect(adapter.values.has("auth.session")).toBe(false);
  });

  it("clear deletes auth session", () => {
    const adapter = new MemoryConfigAdapter();
    const safeStorage = createSafeStorage();
    adapter.set("auth.session", { stale: true });
    const store = createAuthSessionStore({ adapter, safeStorage });

    store.clear();

    expect(adapter.values.has("auth.session")).toBe(false);
  });
});
