import { describe, expect, it, vi } from "vitest";
import {
  createAuthService,
  type CreateAuthServiceOptions,
} from "./authService";
import type { AuthSessionStore, StoredAuthSession } from "./authSessionStore";
import {
  AuthHttpError,
  type AuthHttpClient,
  type AuthTokenResponse,
} from "./authTypes";

const nowMs = Date.parse("2026-06-17T09:00:00.000Z");

const device = {
  installationId: "install-1",
  deviceName: "ALEX-PC",
  platform: "windows",
  appVersion: "0.1.0",
  locale: "zh-CN",
} as const;

const tokenResponse: AuthTokenResponse = {
  user: {
    id: "user-1",
    displayName: "Alex",
    email: "alex@example.com",
    authType: "email_code",
  },
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresInSeconds: 10,
  refreshExpiresInSeconds: 20,
  featureFlags: {
    history: true,
  },
};

const refreshedTokenResponse: AuthTokenResponse = {
  ...tokenResponse,
  accessToken: "access-2",
  refreshToken: "refresh-2",
  expiresInSeconds: 60,
  refreshExpiresInSeconds: 120,
};

const reloginTokenResponse: AuthTokenResponse = {
  ...tokenResponse,
  accessToken: "access-login-2",
  refreshToken: "refresh-login-2",
  expiresInSeconds: 60,
  refreshExpiresInSeconds: 120,
};

function createClient(): AuthHttpClient {
  return {
    sendEmailCode: vi.fn().mockResolvedValue({ cooldownSeconds: 60 }),
    loginWithEmailCode: vi.fn().mockResolvedValue(tokenResponse),
    getLdapPublicKey: vi.fn().mockResolvedValue({
      keyId: "key-1",
      alg: "RSA-OAEP-256",
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\nkey\n-----END PUBLIC KEY-----",
      expiresAt: "2026-06-17T09:05:00.000Z",
    }),
    loginWithLdap: vi.fn().mockResolvedValue({
      ...tokenResponse,
      user: {
        ...tokenResponse.user,
        authType: "ldap",
      },
    }),
    refresh: vi.fn().mockResolvedValue(refreshedTokenResponse),
    logout: vi.fn().mockResolvedValue({ ok: true }),
  };
}

function createStore(initialSession?: StoredAuthSession): AuthSessionStore & {
  getStored(): StoredAuthSession | undefined;
} {
  let stored = initialSession;

  return {
    isPersistentSessionAvailable: vi.fn(() => true),
    write: vi.fn((response, options) => {
      if (!options.persistRefreshToken) {
        stored = undefined;
        return;
      }

      stored = {
        user: response.user,
        refreshToken: response.refreshToken,
        expiresAt: new Date(
          nowMs + response.expiresInSeconds * 1000,
        ).toISOString(),
        refreshExpiresAt: new Date(
          nowMs + response.refreshExpiresInSeconds * 1000,
        ).toISOString(),
        ...(response.featureFlags === undefined
          ? {}
          : { featureFlags: response.featureFlags }),
      };
    }),
    read: vi.fn(() => stored),
    clear: vi.fn(() => {
      stored = undefined;
    }),
    getStored: () => stored,
  };
}

function createStoredSession(
  overrides: Partial<StoredAuthSession> = {},
): StoredAuthSession {
  return {
    user: tokenResponse.user,
    refreshToken: "stored-refresh",
    expiresAt: new Date(nowMs + 10_000).toISOString(),
    refreshExpiresAt: new Date(nowMs + 20_000).toISOString(),
    featureFlags: tokenResponse.featureFlags,
    ...overrides,
  };
}

function createService(
  options: Partial<CreateAuthServiceOptions> & {
    client?: AuthHttpClient;
    store?: AuthSessionStore;
  } = {},
) {
  const client = options.client ?? createClient();
  const store = options.store ?? createStore();
  const encryptLdapPassword =
    options.encryptLdapPassword ??
    vi.fn().mockResolvedValue({
      keyId: "key-1",
      passwordCipher: "cipher",
      nonce: "nonce",
      timestamp: "2026-06-17T09:00:00.000Z",
    });
  const service = createAuthService({
    client,
    store,
    device,
    allowDevelopmentBypass: options.allowDevelopmentBypass,
    now: () => nowMs,
    encryptLdapPassword,
  });

  return { service, client, store, encryptLdapPassword };
}

describe("auth service", () => {
  it("returns unauthenticated when no persisted session exists", async () => {
    const { service, client, store } = createService();

    await expect(service.restoreSession()).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(store.read).toHaveBeenCalledOnce();
    expect(client.refresh).not.toHaveBeenCalled();
  });

  it("clears store and notifies expired when persisted refresh session is expired", async () => {
    const store = createStore(
      createStoredSession({
        refreshExpiresAt: new Date(nowMs - 1).toISOString(),
      }),
    );
    const { service, client } = createService({ store });
    const listener = vi.fn();
    service.subscribe(listener);

    await expect(service.restoreSession()).resolves.toEqual({
      status: "expired",
      message: "Session expired",
    });
    expect(store.clear).toHaveBeenCalledOnce();
    expect(client.refresh).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({
      status: "expired",
      message: "Session expired",
    });
  });

  it("refreshes persisted session with stored refresh token and device during restore", async () => {
    const store = createStore(createStoredSession());
    const { service, client } = createService({ store });

    await expect(service.restoreSession()).resolves.toEqual({
      status: "authenticated",
      user: refreshedTokenResponse.user,
      featureFlags: refreshedTokenResponse.featureFlags,
    });
    expect(client.refresh).toHaveBeenCalledWith({
      refreshToken: "stored-refresh",
      device,
    });
    expect(store.write).toHaveBeenCalledWith(refreshedTokenResponse, {
      persistRefreshToken: true,
    });
  });

  it("does not restore a cleared session when pending restore refresh resolves", async () => {
    const store = createStore(createStoredSession());
    const client = createClient();
    let resolveRefresh!: (response: AuthTokenResponse) => void;
    vi.mocked(client.refresh).mockReturnValue(
      new Promise<AuthTokenResponse>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const { service } = createService({ client, store });

    const restorePromise = service.restoreSession();
    service.clearSession();
    resolveRefresh(refreshedTokenResponse);

    await expect(restorePromise).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    expect(service.getSessionSnapshot()).toEqual({
      status: "unauthenticated",
    });
    expect(store.write).not.toHaveBeenCalled();
  });

  it("does not let old restore overwrite a newer login", async () => {
    const store = createStore(createStoredSession());
    const client = createClient();
    let resolveRefresh!: (response: AuthTokenResponse) => void;
    vi.mocked(client.refresh).mockReturnValue(
      new Promise<AuthTokenResponse>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const { service } = createService({ client, store });

    const restorePromise = service.restoreSession();
    vi.mocked(client.loginWithEmailCode).mockResolvedValueOnce(
      reloginTokenResponse,
    );
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "654321",
      rememberMe: true,
    });
    resolveRefresh(refreshedTokenResponse);

    await expect(restorePromise).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    await expect(service.getAccessTokenForRequest()).resolves.toBe(
      "access-login-2",
    );
    expect(store.write).toHaveBeenNthCalledWith(1, reloginTokenResponse, {
      persistRefreshToken: true,
    });
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it("keeps persisted session and returns offline when restore refresh has network error", async () => {
    const persistedSession = createStoredSession();
    const store = createStore(persistedSession);
    const client = createClient();
    vi.mocked(client.refresh).mockRejectedValue(
      new AuthHttpError(0, "network_error", "Network request failed"),
    );
    const { service } = createService({ client, store });

    await expect(service.restoreSession()).resolves.toEqual({
      status: "offline",
      user: tokenResponse.user,
      message: "Network unavailable",
    });
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.getStored()).toEqual(persistedSession);
  });

  it("clears store and notifies expired when restore refresh has non-network error", async () => {
    const store = createStore(createStoredSession());
    const client = createClient();
    vi.mocked(client.refresh).mockRejectedValue(
      new AuthHttpError(401, "session_expired", "Refresh token expired"),
    );
    const { service } = createService({ client, store });
    const listener = vi.fn();
    service.subscribe(listener);

    await expect(service.restoreSession()).resolves.toEqual({
      status: "expired",
      message: "Session expired",
    });
    expect(store.clear).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      status: "expired",
      message: "Session expired",
    });
  });

  it("sends email code with device context and returns cooldown", async () => {
    const { service, client } = createService();

    await expect(
      service.sendEmailCode({ email: "alex@example.com" }),
    ).resolves.toEqual({
      cooldownSeconds: 60,
    });
    expect(client.sendEmailCode).toHaveBeenCalledWith({
      email: "alex@example.com",
      device,
    });
  });

  it("logs in with email code, persists refresh token, and broadcasts authenticated snapshot", async () => {
    const { service, client, store } = createService();
    const listener = vi.fn();
    service.subscribe(listener);

    await expect(
      service.loginWithEmailCode({
        email: "alex@example.com",
        code: "123456",
        rememberMe: true,
      }),
    ).resolves.toEqual({
      status: "authenticated",
      user: tokenResponse.user,
      featureFlags: tokenResponse.featureFlags,
    });
    expect(client.loginWithEmailCode).toHaveBeenCalledWith({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
      device,
    });
    expect(store.write).toHaveBeenCalledWith(tokenResponse, {
      persistRefreshToken: true,
    });
    expect(listener).toHaveBeenCalledWith({
      status: "authenticated",
      user: tokenResponse.user,
      featureFlags: tokenResponse.featureFlags,
    });
  });

  it("bypasses email code backend auth in development mode", async () => {
    const { service, client, store } = createService({
      allowDevelopmentBypass: true,
    });
    const listener = vi.fn();
    service.subscribe(listener);

    await expect(
      service.loginWithEmailCode({
        email: "",
        code: "000000",
        rememberMe: true,
      }),
    ).resolves.toEqual({
      status: "authenticated",
      user: {
        id: "dev-user",
        displayName: "Developer",
        email: "dev@example.test",
        authType: "email_code",
      },
      featureFlags: {
        developmentAuthBypass: true,
      },
    });
    await expect(service.getAccessTokenForRequest()).resolves.toBe(
      "dev-access-token",
    );
    expect(client.loginWithEmailCode).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({
      status: "authenticated",
      user: {
        id: "dev-user",
        displayName: "Developer",
        email: "dev@example.test",
        authType: "email_code",
      },
      featureFlags: {
        developmentAuthBypass: true,
      },
    });
  });

  it("writes store with persistRefreshToken false when rememberMe is false", async () => {
    const { service, store } = createService();

    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: false,
    });

    expect(store.write).toHaveBeenCalledWith(tokenResponse, {
      persistRefreshToken: false,
    });
  });

  it("encrypts LDAP password before login and never sends plaintext password", async () => {
    const { service, client, encryptLdapPassword } = createService();

    await service.loginWithLdap({
      account: "alex.ldap",
      password: "P@ssw0rd!",
      rememberMe: true,
    });

    expect(client.getLdapPublicKey).toHaveBeenCalledOnce();
    expect(encryptLdapPassword).toHaveBeenCalledWith({
      password: "P@ssw0rd!",
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\nkey\n-----END PUBLIC KEY-----",
      keyId: "key-1",
    });
    expect(client.loginWithLdap).toHaveBeenCalledWith({
      account: "alex.ldap",
      passwordCipher: "cipher",
      keyId: "key-1",
      nonce: "nonce",
      timestamp: "2026-06-17T09:00:00.000Z",
      rememberMe: true,
      device,
    });
    expect(
      vi.mocked(client.loginWithLdap).mock.calls[0]?.[0],
    ).not.toHaveProperty("password");
  });

  it("dedupes concurrent getAccessTokenForRequest refreshes", async () => {
    const client = createClient();
    const { service, store } = createService({ client });
    let resolveRefresh!: (response: AuthTokenResponse) => void;
    vi.mocked(client.refresh).mockReturnValue(
      new Promise<AuthTokenResponse>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    const firstToken = service.getAccessTokenForRequest();
    const secondToken = service.getAccessTokenForRequest();

    expect(client.refresh).toHaveBeenCalledTimes(1);
    resolveRefresh(refreshedTokenResponse);
    await expect(Promise.all([firstToken, secondToken])).resolves.toEqual([
      "access-2",
      "access-2",
    ]);
    expect(store.write).toHaveBeenLastCalledWith(refreshedTokenResponse, {
      persistRefreshToken: true,
    });
  });

  it("does not revive a logged-out session when pending refresh resolves", async () => {
    const client = createClient();
    const { service, store } = createService({ client });
    let resolveRefresh!: (response: AuthTokenResponse) => void;
    vi.mocked(client.refresh).mockReturnValue(
      new Promise<AuthTokenResponse>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    const refreshPromise = service.getAccessTokenForRequest();
    await service.logout();
    resolveRefresh(refreshedTokenResponse);

    await expect(refreshPromise).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    expect(service.getSessionSnapshot()).toEqual({
      status: "unauthenticated",
    });
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it("does not let old refresh overwrite a newer login", async () => {
    const client = createClient();
    const { service, store } = createService({ client });
    let resolveRefresh!: (response: AuthTokenResponse) => void;
    vi.mocked(client.refresh).mockReturnValue(
      new Promise<AuthTokenResponse>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    const refreshPromise = service.getAccessTokenForRequest();
    vi.mocked(client.loginWithEmailCode).mockResolvedValueOnce(
      reloginTokenResponse,
    );
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "654321",
      rememberMe: true,
    });
    resolveRefresh(refreshedTokenResponse);

    await expect(refreshPromise).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    await expect(service.getAccessTokenForRequest()).resolves.toBe(
      "access-login-2",
    );
    expect(store.write).toHaveBeenNthCalledWith(1, tokenResponse, {
      persistRefreshToken: true,
    });
    expect(store.write).toHaveBeenNthCalledWith(2, reloginTokenResponse, {
      persistRefreshToken: true,
    });
    expect(store.write).toHaveBeenCalledTimes(2);
  });

  it("clears session and notifies expired when request refresh fails with session_expired", async () => {
    const client = createClient();
    const { service, store } = createService({ client });
    const listener = vi.fn();
    service.subscribe(listener);
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });
    vi.mocked(client.refresh).mockRejectedValue(
      new AuthHttpError(401, "session_expired", "Refresh token expired"),
    );

    await expect(service.getAccessTokenForRequest()).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    expect(store.clear).toHaveBeenCalledOnce();
    expect(service.getSessionSnapshot()).toEqual({
      status: "unauthenticated",
    });
    expect(listener).toHaveBeenLastCalledWith({
      status: "expired",
      message: "Session expired",
    });
  });

  it("keeps refresh persistence in-memory only after rememberMe false login", async () => {
    const { service, client, store } = createService();
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: false,
    });

    await expect(service.getAccessTokenForRequest()).resolves.toBe("access-2");
    expect(client.refresh).toHaveBeenCalledOnce();
    expect(store.write).toHaveBeenLastCalledWith(refreshedTokenResponse, {
      persistRefreshToken: false,
    });
  });

  it("does not authenticate runtime session when persistent store write fails", async () => {
    const store = createStore();
    vi.mocked(store.write).mockImplementation(() => {
      throw new Error("store write failed");
    });
    const { service } = createService({ store });

    await expect(
      service.loginWithEmailCode({
        email: "alex@example.com",
        code: "123456",
        rememberMe: true,
      }),
    ).rejects.toThrow("store write failed");
    expect(service.getSessionSnapshot()).toEqual({
      status: "unauthenticated",
    });
  });

  it("continues notifying listeners when one listener throws", async () => {
    const { service } = createService();
    const listenerError = new Error("listener failed");
    const logger = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const throwingListener = vi.fn(() => {
      throw listenerError;
    });
    const secondListener = vi.fn();
    service.subscribe(throwingListener);
    service.subscribe(secondListener);

    await expect(
      service.loginWithEmailCode({
        email: "alex@example.com",
        code: "123456",
        rememberMe: true,
      }),
    ).resolves.toEqual({
      status: "authenticated",
      user: tokenResponse.user,
      featureFlags: tokenResponse.featureFlags,
    });
    expect(throwingListener).toHaveBeenCalledOnce();
    expect(secondListener).toHaveBeenCalledWith({
      status: "authenticated",
      user: tokenResponse.user,
      featureFlags: tokenResponse.featureFlags,
    });
    logger.mockRestore();
  });

  it("expires session without refresh request when refresh token is expired", async () => {
    const client = createClient();
    vi.mocked(client.loginWithEmailCode).mockResolvedValue({
      ...tokenResponse,
      refreshExpiresInSeconds: 0,
    });
    const { service, store } = createService({ client });
    const listener = vi.fn();
    service.subscribe(listener);
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    await expect(service.getAccessTokenForRequest()).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
    expect(client.refresh).not.toHaveBeenCalled();
    expect(store.clear).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith({
      status: "expired",
      message: "Session expired",
    });
  });

  it("rejects getAccessTokenForRequest with session_expired when no session exists", async () => {
    const { service } = createService();

    await expect(service.getAccessTokenForRequest()).rejects.toMatchObject({
      status: 401,
      code: "session_expired",
    });
  });

  it("returns current access token without refresh when token is valid past skew", async () => {
    const client = createClient();
    vi.mocked(client.loginWithEmailCode).mockResolvedValue({
      ...tokenResponse,
      expiresInSeconds: 31,
    });
    const { service } = createService({ client });
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    await expect(service.getAccessTokenForRequest()).resolves.toBe("access-1");
    expect(client.refresh).not.toHaveBeenCalled();
  });

  it("clears local session and store on logout even when backend logout fails", async () => {
    const client = createClient();
    vi.mocked(client.logout).mockRejectedValue(new Error("backend down"));
    const { service, store } = createService({ client });
    const listener = vi.fn();
    service.subscribe(listener);
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    await expect(service.logout()).resolves.toEqual({
      status: "unauthenticated",
    });
    expect(client.logout).toHaveBeenCalledWith({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      device,
    });
    expect(store.clear).toHaveBeenCalledOnce();
    expect(service.getSessionSnapshot()).toEqual({
      status: "unauthenticated",
    });
    expect(listener).toHaveBeenLastCalledWith({
      status: "unauthenticated",
    });
  });

  it("clearSession clears local session, store, and broadcasts optional message", async () => {
    const { service, store } = createService();
    const listener = vi.fn();
    service.subscribe(listener);
    await service.loginWithEmailCode({
      email: "alex@example.com",
      code: "123456",
      rememberMe: true,
    });

    expect(service.clearSession("Signed out elsewhere")).toEqual({
      status: "unauthenticated",
      message: "Signed out elsewhere",
    });
    expect(store.clear).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith({
      status: "unauthenticated",
      message: "Signed out elsewhere",
    });
  });
});
