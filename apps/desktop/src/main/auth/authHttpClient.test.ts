import { describe, expect, it, vi } from "vitest";
import { createAuthHttpClient } from "./authHttpClient";
import type { AuthDeviceContext } from "./authTypes";

const device: AuthDeviceContext = {
  installationId: "install-1",
  deviceName: "ALEX-PC",
  platform: "windows",
  appVersion: "0.1.0",
  locale: "zh-CN"
};

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function createEmptyResponse(status = 204): Response {
  return new Response(null, { status });
}

describe("auth http client", () => {
  it("posts email code requests to /aoa_api/auth/email-code/send", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        ok: true,
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
        extra: "drop-me"
      })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.sendEmailCode({ email: "user@example.com", device })
    ).resolves.toEqual({ cooldownSeconds: 60 });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/auth/email-code/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-installation-id": "install-1",
          "x-app-version": "0.1.0"
        }),
        body: JSON.stringify({ email: "user@example.com", scene: "login" })
      })
    );
  });

  it("uses a base URL that already points at /aoa_api", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({ ok: true, expiresInSeconds: 300, resendAfterSeconds: 60 })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com/aoa_api/",
      fetch: fetchImpl
    });

    await client.sendEmailCode({ email: "user@example.com", device });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/aoa_api/auth/email-code/send"
    );
  });

  it("normalizes base URLs with path, query, and hash before appending /aoa_api", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({ ok: true, expiresInSeconds: 300, resendAfterSeconds: 60 })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com/root?x=1#frag",
      fetch: fetchImpl
    });

    await client.sendEmailCode({ email: "user@example.com", device });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/root/aoa_api/auth/email-code/send"
    );
  });

  it("returns a session from email login and never exposes raw response fields beyond the contract", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        user: {
          id: "user-1",
          displayName: "Alex",
          email: "user@example.com",
          authType: "email_code"
        },
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresInSeconds: 7200,
        refreshExpiresInSeconds: 2592000,
        featureFlags: { history: true },
        serverTraceId: "trace-1"
      })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    const result = await client.loginWithEmailCode({
      email: "user@example.com",
      code: "123456",
      rememberMe: true,
      device
    });

    expect(result.user.displayName).toBe("Alex");
    expect(result.accessToken).toBe("access-1");
    expect(result.refreshToken).toBe("refresh-1");
    expect(result.expiresInSeconds).toBe(7200);
    expect(result.refreshExpiresInSeconds).toBe(2592000);
    expect(result.featureFlags).toEqual({ history: true });
    expect(result).not.toHaveProperty("serverTraceId");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/auth/login/email-code",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-installation-id": "install-1",
          "x-app-version": "0.1.0"
        }),
        body: JSON.stringify({
          email: "user@example.com",
          code: "123456",
          rememberMe: true,
          deviceName: "ALEX-PC",
          platform: "windows",
          appVersion: "0.1.0",
          locale: "zh-CN"
        })
      })
    );
  });

  it("gets the LDAP public key", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        keyId: "key-1",
        alg: "RSA-OAEP-256",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----",
        expiresAt: "2026-06-17T10:00:00.000Z",
        extra: "drop-me"
      })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(client.getLdapPublicKey()).resolves.toEqual({
      keyId: "key-1",
      alg: "RSA-OAEP-256",
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----",
      expiresAt: "2026-06-17T10:00:00.000Z"
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/auth/crypto/public-key",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("posts LDAP login with encrypted password fields", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        user: { id: "user-2", displayName: "Dana", authType: "ldap" },
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresInSeconds: 7200,
        refreshExpiresInSeconds: 86400,
        extra: "drop-me"
      })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    const result = await client.loginWithLdap({
      account: "ALEX\\dana",
      passwordCipher: "cipher",
      keyId: "key-1",
      nonce: "nonce-1",
      timestamp: "2026-06-17T09:00:00.000Z",
      rememberMe: true,
      device
    });

    expect(result.user.displayName).toBe("Dana");
    expect(result.accessToken).toBe("access-2");
    expect(result.refreshToken).toBe("refresh-2");
    expect(result.expiresInSeconds).toBe(7200);
    expect(result.refreshExpiresInSeconds).toBe(86400);
    expect(result).not.toHaveProperty("extra");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/auth/login/ldap",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-installation-id": "install-1",
          "x-app-version": "0.1.0"
        }),
        body: JSON.stringify({
          account: "ALEX\\dana",
          passwordCipher: "cipher",
          keyId: "key-1",
          nonce: "nonce-1",
          timestamp: "2026-06-17T09:00:00.000Z",
          rememberMe: true,
          deviceName: "ALEX-PC",
          platform: "windows",
          appVersion: "0.1.0",
          locale: "zh-CN"
        })
      })
    );
  });

  it("refreshes and logs out through auth endpoints", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          user: { id: "user-1", displayName: "Alex", authType: "email_code" },
          accessToken: "new-access",
          refreshToken: "new-refresh",
          expiresInSeconds: 7200,
          refreshExpiresInSeconds: 2592000,
          extra: "drop-me"
        })
      )
      .mockResolvedValueOnce(createJsonResponse({ ok: true, extra: "drop-me" }))
      .mockResolvedValueOnce(createEmptyResponse());
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    const refreshed = await client.refresh({ refreshToken: "old-refresh", device });
    expect(refreshed.accessToken).toBe("new-access");
    expect(refreshed).not.toHaveProperty("extra");
    await expect(
      client.logout({ accessToken: "new-access", refreshToken: "new-refresh", device })
    ).resolves.toEqual({ ok: true });
    await expect(
      client.logout({ refreshToken: "new-refresh", device })
    ).resolves.toEqual({ ok: true });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/aoa_api/auth/refresh"
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-installation-id": "install-1",
          "x-app-version": "0.1.0"
        }),
        body: JSON.stringify({ refreshToken: "old-refresh", ...device })
      })
    );
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://api.example.com/aoa_api/auth/logout"
    );
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "new-refresh", ...device }),
        headers: expect.objectContaining({
          authorization: "Bearer new-access",
          "x-installation-id": "install-1",
          "x-app-version": "0.1.0"
        })
      })
    );
  });

  it("maps failed responses to AuthHttpError with safe code and message", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({ code: "invalid_code", message: "bad code" }, 401)
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.loginWithEmailCode({
        email: "user@example.com",
        code: "000000",
        rememberMe: false,
        device
      })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      status: 401,
      code: "invalid_code"
    });
  });

  it("maps invalid JSON responses to backend_unavailable", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.sendEmailCode({ email: "user@example.com", device })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      status: 200,
      code: "backend_unavailable"
    });
  });

  it("maps missing or unknown backend error codes to backend_unavailable", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse("bad gateway", 502))
      .mockResolvedValueOnce(
        createJsonResponse({ code: "surprise_code", message: "surprise" }, 500)
      )
      .mockResolvedValueOnce(createJsonResponse({ message: "missing code" }, 503));
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.sendEmailCode({ email: "user@example.com", device })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      status: 502,
      code: "backend_unavailable"
    });
    await expect(
      client.sendEmailCode({ email: "user@example.com", device })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      status: 500,
      code: "backend_unavailable"
    });
    await expect(
      client.sendEmailCode({ email: "user@example.com", device })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      status: 503,
      code: "backend_unavailable"
    });
  });

  it("rejects array featureFlags instead of projecting them", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        user: {
          id: "user-1",
          displayName: "Alex",
          email: "user@example.com",
          authType: "email_code"
        },
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresInSeconds: 7200,
        refreshExpiresInSeconds: 2592000,
        featureFlags: [true]
      })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.loginWithEmailCode({
        email: "user@example.com",
        code: "123456",
        rememberMe: true,
        device
      })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      code: "backend_unavailable"
    });
  });

  it("maps fetch failures to network_error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.sendEmailCode({ email: "user@example.com", device })
    ).rejects.toMatchObject({
      name: "AuthHttpError",
      status: 0,
      code: "network_error"
    });
  });
});
