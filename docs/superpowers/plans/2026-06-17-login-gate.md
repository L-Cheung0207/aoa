# Login Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strict login gating so the installed Electron app shows a login setup wizard first and only starts the main app after a valid email-code or LDAP session exists.

**Architecture:** Main process owns authentication through a new `AuthService`. Renderer only sees session snapshots through `window.voiceAI`, while tokens stay in the main process and encrypted storage. Startup moves business UI creation behind an auth gate: unauthenticated users get `#/login-setup`; authenticated users get the existing home, tray, overlay, shortcuts, and voice services.

**Tech Stack:** Electron, React, TypeScript, Vitest, `electron-store`, `safeStorage`, Node WebCrypto, injected `fetch`.

---

## File Structure

- Create `apps/desktop/src/main/auth/authTypes.ts`
  - Shared main/preload auth DTOs: session snapshot, login inputs, backend token responses, standardized auth errors.
- Create `apps/desktop/src/main/auth/authHttpClient.ts`
  - Small HTTP client for `/aoa_api/auth/*` endpoints with injected `fetch`.
- Create `apps/desktop/src/main/auth/authSessionStore.ts`
  - Reads/writes encrypted refresh token and persisted user/session metadata through the existing config storage adapter and `safeStorage`.
- Create `apps/desktop/src/main/auth/ldapCrypto.ts`
  - RSA-OAEP(SHA-256) encryption helpers and nonce/timestamp payload builder.
- Create `apps/desktop/src/main/auth/authService.ts`
  - Orchestrates login, restore, refresh, logout, single-flight refresh, and session change listeners.
- Create tests beside each main auth module:
  - `apps/desktop/src/main/auth/authHttpClient.test.ts`
  - `apps/desktop/src/main/auth/authSessionStore.test.ts`
  - `apps/desktop/src/main/auth/ldapCrypto.test.ts`
  - `apps/desktop/src/main/auth/authService.test.ts`
- Modify `apps/desktop/src/main/ipc/ipcSchemas.ts`
  - Add auth input parsers.
- Modify `apps/desktop/src/main/ipc/ipcRoutes.ts`
  - Add auth IPC handlers and auth dependency.
- Modify `apps/desktop/src/main/ipc/ipcRoutes.test.ts`
  - Cover auth IPC routing and parser failure.
- Modify `apps/desktop/src/preload/voiceApi.ts`
  - Expose auth API and auth session event.
- Create `apps/desktop/src/main/windows/createLoginSetupWindow.ts`
  - Creates the installed-app login setup window.
- Create `apps/desktop/src/main/windows/createLoginSetupWindow.test.ts`
  - Verifies hash, size, chrome, preload, and icon options.
- Create `apps/desktop/src/renderer/features/login/LoginSetupPage.tsx`
  - Four-step setup shell and login forms.
- Create `apps/desktop/src/renderer/features/login/login-setup.css`
  - Visual style matching the supplied install wizard screenshot. `LoginSetupPage.tsx` imports this CSS file directly.
- Modify `apps/desktop/src/renderer/app/routes.ts`
  - Add `loginSetup` route in the same task that creates `LoginSetupPage`.
- Modify `apps/desktop/src/renderer/main.tsx`
  - Render `LoginSetupPage`.
- Modify `apps/desktop/src/renderer/app/HomeShell.tsx`
  - Add logout action through `window.voiceAI.logout()`.
- Modify `apps/desktop/src/main/bootstrap.ts`
  - Instantiate `AuthService`, register auth IPC, run startup gate, and start authenticated runtime only after auth succeeds.
- Modify `apps/desktop/src/main/bootstrap.test.ts`
  - Cover gate behavior at the orchestrator level.
- Modify `apps/desktop/src/main/log/logSanitizer.ts`
  - Confirm `code`, `accessToken`, `refreshToken`, and `Authorization` are redacted.
- Modify `apps/desktop/src/main/log/logSanitizer.test.ts`
  - Add auth-specific log redaction coverage.

No frontend tests are planned because project instructions say not to add frontend tests unless explicitly requested.

---

### Task 1: Auth Types And HTTP Client

**Files:**
- Create: `apps/desktop/src/main/auth/authTypes.ts`
- Create: `apps/desktop/src/main/auth/authHttpClient.ts`
- Create: `apps/desktop/src/main/auth/authHttpClient.test.ts`

- [ ] **Step 1: Write failing HTTP client tests**

Create `apps/desktop/src/main/auth/authHttpClient.test.ts`:

```ts
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

describe("auth http client", () => {
  it("posts email code requests to /aoa_api/auth/email-code/send", async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse({ cooldownSeconds: 60 }));
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
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ email: "user@example.com", ...device })
      })
    );
  });

  it("uses a base URL that already points at /aoa_api", async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse({ cooldownSeconds: 160 }));
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com/aoa_api/",
      fetch: fetchImpl
    });

    await client.sendEmailCode({ email: "user@example.com", device });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/aoa_api/auth/email-code/send"
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
        featureFlags: { history: true }
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
  });

  it("gets the LDAP public key", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        keyId: "key-1",
        alg: "RSA-OAEP-256",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----",
        expiresAt: "2026-06-17T10:00:00.000Z"
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
  });

  it("posts LDAP login with encrypted password fields", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        user: { id: "user-2", displayName: "Dana", authType: "ldap" },
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresInSeconds: 7200,
        refreshExpiresInSeconds: 86400
      })
    );
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await client.loginWithLdap({
      account: "ALEX\\dana",
      passwordCipher: "cipher",
      keyId: "key-1",
      nonce: "nonce-1",
      timestamp: "2026-06-17T09:00:00.000Z",
      rememberMe: true,
      device
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/aoa_api/auth/login/ldap",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          account: "ALEX\\dana",
          passwordCipher: "cipher",
          keyId: "key-1",
          nonce: "nonce-1",
          timestamp: "2026-06-17T09:00:00.000Z",
          rememberMe: true,
          ...device
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
          refreshExpiresInSeconds: 2592000
        })
      )
      .mockResolvedValueOnce(createJsonResponse({ ok: true }));
    const client = createAuthHttpClient({
      baseUrl: "https://api.example.com",
      fetch: fetchImpl
    });

    await expect(
      client.refresh({ refreshToken: "old-refresh", device })
    ).resolves.toMatchObject({ accessToken: "new-access" });
    await expect(
      client.logout({ accessToken: "new-access", refreshToken: "new-refresh", device })
    ).resolves.toEqual({ ok: true });

    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer new-access"
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
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authHttpClient.test.ts
```

Expected: FAIL because `authHttpClient.ts` and `authTypes.ts` do not exist.

- [ ] **Step 3: Add auth types**

Create `apps/desktop/src/main/auth/authTypes.ts`:

```ts
export type AuthType = "email_code" | "ldap";
export type AuthSessionStatus =
  | "authenticated"
  | "unauthenticated"
  | "expired"
  | "offline"
  | "error";

export interface AuthUserSnapshot {
  id: string;
  displayName: string;
  email?: string;
  authType: AuthType;
}

export interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  user?: AuthUserSnapshot;
  featureFlags?: Record<string, boolean>;
  message?: string;
}

export interface AuthDeviceContext {
  installationId: string;
  deviceName: string;
  platform: "windows";
  appVersion: string;
  locale: "zh-CN" | "zh-TW" | "en-US";
}

export interface SendEmailCodeInput {
  email: string;
}

export interface SendEmailCodeRequest extends SendEmailCodeInput {
  device: AuthDeviceContext;
}

export interface SendEmailCodeResult {
  cooldownSeconds: number;
}

export interface EmailCodeLoginInput {
  email: string;
  code: string;
  rememberMe: boolean;
}

export interface EmailCodeLoginRequest extends EmailCodeLoginInput {
  device: AuthDeviceContext;
}

export interface LdapLoginInput {
  account: string;
  password: string;
  rememberMe: boolean;
}

export interface LdapPublicKeyResponse {
  keyId: string;
  alg: "RSA-OAEP-256" | "RSA-OAEP";
  publicKeyPem: string;
  expiresAt: string;
}

export interface LdapEncryptedLoginRequest {
  account: string;
  passwordCipher: string;
  keyId: string;
  nonce: string;
  timestamp: string;
  rememberMe: boolean;
  device: AuthDeviceContext;
}

export interface AuthTokenResponse {
  user: AuthUserSnapshot;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
  featureFlags?: Record<string, boolean>;
}

export interface RefreshRequest {
  refreshToken: string;
  device: AuthDeviceContext;
}

export interface LogoutRequest {
  accessToken?: string;
  refreshToken?: string;
  device: AuthDeviceContext;
}

export interface AuthHttpClient {
  sendEmailCode(input: SendEmailCodeRequest): Promise<SendEmailCodeResult>;
  loginWithEmailCode(input: EmailCodeLoginRequest): Promise<AuthTokenResponse>;
  getLdapPublicKey(): Promise<LdapPublicKeyResponse>;
  loginWithLdap(input: LdapEncryptedLoginRequest): Promise<AuthTokenResponse>;
  refresh(input: RefreshRequest): Promise<AuthTokenResponse>;
  logout(input: LogoutRequest): Promise<{ ok: true }>;
}

export type AuthErrorCode =
  | "invalid_email"
  | "invalid_code"
  | "invalid_credentials"
  | "account_disabled"
  | "rate_limited"
  | "session_expired"
  | "network_error"
  | "safe_storage_unavailable"
  | "key_expired"
  | "backend_unavailable"
  | "unknown";

export class AuthHttpError extends Error {
  readonly name = "AuthHttpError";

  constructor(
    readonly status: number,
    readonly code: AuthErrorCode,
    message: string
  ) {
    super(message);
  }
}
```

- [ ] **Step 4: Implement auth HTTP client**

Create `apps/desktop/src/main/auth/authHttpClient.ts`:

```ts
import type {
  AuthHttpClient,
  AuthTokenResponse,
  EmailCodeLoginRequest,
  LdapEncryptedLoginRequest,
  LdapPublicKeyResponse,
  LogoutRequest,
  RefreshRequest,
  SendEmailCodeRequest,
  SendEmailCodeResult
} from "./authTypes";
import { AuthHttpError, type AuthErrorCode } from "./authTypes";

type FetchLike = typeof fetch;

interface CreateAuthHttpClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
}

export function createAuthHttpClient(
  options: CreateAuthHttpClientOptions
): AuthHttpClient {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = (path: string): string => resolveAoaAuthUrl(options.baseUrl, path);

  return {
    sendEmailCode: (input) =>
      postJson<SendEmailCodeResult>(fetchImpl, endpoint("email-code/send"), {
        email: input.email,
        ...input.device
      }),
    loginWithEmailCode: (input) =>
      postJson<AuthTokenResponse>(fetchImpl, endpoint("login/email-code"), {
        email: input.email,
        code: input.code,
        rememberMe: input.rememberMe,
        ...input.device
      }),
    getLdapPublicKey: () =>
      getJson<LdapPublicKeyResponse>(fetchImpl, endpoint("crypto/public-key")),
    loginWithLdap: (input: LdapEncryptedLoginRequest) =>
      postJson<AuthTokenResponse>(fetchImpl, endpoint("login/ldap"), {
        account: input.account,
        passwordCipher: input.passwordCipher,
        keyId: input.keyId,
        nonce: input.nonce,
        timestamp: input.timestamp,
        rememberMe: input.rememberMe,
        ...input.device
      }),
    refresh: (input: RefreshRequest) =>
      postJson<AuthTokenResponse>(fetchImpl, endpoint("refresh"), {
        refreshToken: input.refreshToken,
        ...input.device
      }),
    logout: async (input: LogoutRequest) => {
      await postJson<unknown>(
        fetchImpl,
        endpoint("logout"),
        {
          refreshToken: input.refreshToken,
          ...input.device
        },
        input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : undefined
      );
      return { ok: true };
    }
  };
}

export function resolveAoaAuthUrl(baseUrl: string, authPath: string): string {
  const normalizedPath = authPath.replace(/^\/+/, "");
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const parsed = new URL(normalizedBase);
  const path = parsed.pathname.replace(/\/+$/, "");
  if (path.endsWith("/aoa_api")) {
    parsed.pathname = `${path}/auth/${normalizedPath}`;
  } else {
    parsed.pathname = `${path}/aoa_api/auth/${normalizedPath}`;
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function getJson<T>(fetchImpl: FetchLike, url: string): Promise<T> {
  return requestJson(fetchImpl, url, { method: "GET" });
}

async function postJson<T>(
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  return requestJson(fetchImpl, url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function requestJson<T>(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    throw new AuthHttpError(0, "network_error", getErrorMessage(error));
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.code === "string"
      ? normalizeAuthErrorCode(payload.code)
      : "backend_unavailable";
    const message = isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : response.statusText || "Authentication request failed";
    throw new AuthHttpError(response.status, code, message);
  }
  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AuthHttpError(
      response.status,
      "backend_unavailable",
      "Authentication response was not valid JSON"
    );
  }
}

function normalizeAuthErrorCode(code: string): AuthErrorCode {
  switch (code.toLowerCase()) {
    case "invalid_email":
    case "invalid_code":
    case "invalid_credentials":
    case "account_disabled":
    case "rate_limited":
    case "session_expired":
    case "network_error":
    case "safe_storage_unavailable":
    case "key_expired":
    case "backend_unavailable":
      return code.toLowerCase() as AuthErrorCode;
    default:
      return "unknown";
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

- [ ] **Step 5: Verify HTTP client tests pass**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authHttpClient.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add apps/desktop/src/main/auth/authTypes.ts apps/desktop/src/main/auth/authHttpClient.ts apps/desktop/src/main/auth/authHttpClient.test.ts
git commit -m "feat(auth): add auth HTTP client"
```

---

### Task 2: Session Store And LDAP Crypto

**Files:**
- Create: `apps/desktop/src/main/auth/authSessionStore.ts`
- Create: `apps/desktop/src/main/auth/authSessionStore.test.ts`
- Create: `apps/desktop/src/main/auth/ldapCrypto.ts`
- Create: `apps/desktop/src/main/auth/ldapCrypto.test.ts`

- [ ] **Step 1: Write failing session store tests**

Create `apps/desktop/src/main/auth/authSessionStore.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createAuthSessionStore } from "./authSessionStore";
import type { AuthTokenResponse } from "./authTypes";

function createMemoryAdapter() {
  const values = new Map<string, unknown>();
  return {
    values,
    get: vi.fn((key: string) => values.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      values.set(key, value);
    }),
    delete: vi.fn((key: string) => {
      values.delete(key);
    })
  };
}

function createSafeStorage(available = true) {
  return {
    isEncryptionAvailable: vi.fn(() => available),
    encryptString: vi.fn((text: string) => Buffer.from(`encrypted:${text}`, "utf8")),
    decryptString: vi.fn((buffer: Buffer) =>
      buffer.toString("utf8").replace(/^encrypted:/, "")
    )
  };
}

const tokenResponse: AuthTokenResponse = {
  user: {
    id: "user-1",
    displayName: "Alex",
    email: "user@example.com",
    authType: "email_code"
  },
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresInSeconds: 10,
  refreshExpiresInSeconds: 20,
  featureFlags: { history: true }
};

describe("auth session store", () => {
  it("encrypts refresh token and persists user metadata", () => {
    const adapter = createMemoryAdapter();
    const safeStorage = createSafeStorage(true);
    const store = createAuthSessionStore({ adapter, safeStorage, now: () => 1000 });

    store.write(tokenResponse, { persistRefreshToken: true });

    expect(adapter.values.get("auth.session")).toEqual({
      v: 1,
      user: tokenResponse.user,
      refreshToken: Buffer.from("encrypted:refresh-1").toString("base64"),
      refreshTokenProtection: "safeStorage",
      expiresAt: "1970-01-01T00:00:11.000Z",
      refreshExpiresAt: "1970-01-01T00:00:21.000Z",
      featureFlags: { history: true }
    });
    expect(safeStorage.encryptString).toHaveBeenCalledWith("refresh-1");
  });

  it("reads and decrypts a stored session", () => {
    const adapter = createMemoryAdapter();
    const safeStorage = createSafeStorage(true);
    adapter.values.set("auth.session", {
      v: 1,
      user: tokenResponse.user,
      refreshToken: Buffer.from("encrypted:refresh-1").toString("base64"),
      refreshTokenProtection: "safeStorage",
      expiresAt: "1970-01-01T00:00:11.000Z",
      refreshExpiresAt: "1970-01-01T00:00:21.000Z",
      featureFlags: { history: true }
    });
    const store = createAuthSessionStore({ adapter, safeStorage, now: () => 1000 });

    expect(store.read()).toEqual({
      user: tokenResponse.user,
      refreshToken: "refresh-1",
      expiresAt: "1970-01-01T00:00:11.000Z",
      refreshExpiresAt: "1970-01-01T00:00:21.000Z",
      featureFlags: { history: true }
    });
  });

  it("does not persist refresh token when safeStorage is unavailable", () => {
    const adapter = createMemoryAdapter();
    const safeStorage = createSafeStorage(false);
    const store = createAuthSessionStore({ adapter, safeStorage, now: () => 1000 });

    store.write(tokenResponse, { persistRefreshToken: true });

    expect(adapter.values.has("auth.session")).toBe(false);
  });

  it("can write an in-memory-only login by clearing persisted auth session", () => {
    const adapter = createMemoryAdapter();
    const safeStorage = createSafeStorage(true);
    adapter.values.set("auth.session", { stale: true });
    const store = createAuthSessionStore({ adapter, safeStorage, now: () => 1000 });

    store.write(tokenResponse, { persistRefreshToken: false });

    expect(adapter.delete).toHaveBeenCalledWith("auth.session");
    expect(adapter.values.has("auth.session")).toBe(false);
  });

  it("clears auth session", () => {
    const adapter = createMemoryAdapter();
    const safeStorage = createSafeStorage(true);
    adapter.values.set("auth.session", { stale: true });
    const store = createAuthSessionStore({ adapter, safeStorage, now: () => 1000 });

    store.clear();

    expect(adapter.delete).toHaveBeenCalledWith("auth.session");
  });
});
```

- [ ] **Step 2: Write failing LDAP crypto tests**

Create `apps/desktop/src/main/auth/ldapCrypto.test.ts`:

```ts
import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptLdapPassword } from "./ldapCrypto";

async function createPublicKeyPem(): Promise<string> {
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
  const spki = await webcrypto.subtle.exportKey("spki", keyPair.publicKey);
  const base64 = Buffer.from(spki).toString("base64");
  const lines = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

describe("ldap crypto", () => {
  it("encrypts password payload with RSA-OAEP SHA-256", async () => {
    const publicKeyPem = await createPublicKeyPem();

    const result = await encryptLdapPassword({
      password: "secret",
      publicKeyPem,
      keyId: "key-1",
      now: () => new Date("2026-06-17T09:00:00.000Z"),
      randomBytes: () => Buffer.from("0123456789abcdef0123456789abcdef", "utf8")
    });

    expect(result.keyId).toBe("key-1");
    expect(result.timestamp).toBe("2026-06-17T09:00:00.000Z");
    expect(result.nonce).toBe(
      Buffer.from("0123456789abcdef0123456789abcdef", "utf8").toString("base64url")
    );
    expect(result.passwordCipher.length).toBeGreaterThan(200);
    expect(result.passwordCipher).not.toContain("secret");
  });
});
```

- [ ] **Step 3: Run the failing tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authSessionStore.test.ts apps/desktop/src/main/auth/ldapCrypto.test.ts
```

Expected: FAIL because session store and LDAP crypto modules do not exist.

- [ ] **Step 4: Implement session store**

Create `apps/desktop/src/main/auth/authSessionStore.ts`:

```ts
import type { ConfigStorageAdapter } from "../config/configStore";
import type { AuthTokenResponse, AuthUserSnapshot } from "./authTypes";

const AUTH_SESSION_STORAGE_KEY = "auth.session";

interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

interface StoredAuthSessionV1 {
  v: 1;
  user: AuthUserSnapshot;
  refreshToken: string;
  refreshTokenProtection: "safeStorage";
  expiresAt: string;
  refreshExpiresAt: string;
  featureFlags?: Record<string, boolean>;
}

export interface StoredAuthSession {
  user: AuthUserSnapshot;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  featureFlags?: Record<string, boolean>;
}

export interface AuthSessionStore {
  isPersistentSessionAvailable(): boolean;
  read(): StoredAuthSession | undefined;
  write(
    response: AuthTokenResponse,
    options: { persistRefreshToken: boolean }
  ): void;
  clear(): void;
}

export function createAuthSessionStore(options: {
  adapter: Pick<ConfigStorageAdapter, "get" | "set" | "delete">;
  safeStorage: SafeStorageLike;
  now?: () => number;
}): AuthSessionStore {
  const now = options.now ?? Date.now;
  return {
    isPersistentSessionAvailable: () => options.safeStorage.isEncryptionAvailable(),
    read: () => readStoredAuthSession(options),
    write: (response, writeOptions) => {
      if (!writeOptions.persistRefreshToken) {
        options.adapter.delete(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      if (!options.safeStorage.isEncryptionAvailable()) {
        options.adapter.delete(AUTH_SESSION_STORAGE_KEY);
        return;
      }
      const stored: StoredAuthSessionV1 = {
        v: 1,
        user: response.user,
        refreshToken: options.safeStorage
          .encryptString(response.refreshToken)
          .toString("base64"),
        refreshTokenProtection: "safeStorage",
        expiresAt: new Date(now() + response.expiresInSeconds * 1000).toISOString(),
        refreshExpiresAt: new Date(
          now() + response.refreshExpiresInSeconds * 1000
        ).toISOString(),
        ...(response.featureFlags ? { featureFlags: response.featureFlags } : {})
      };
      options.adapter.set(AUTH_SESSION_STORAGE_KEY, stored);
    },
    clear: () => {
      options.adapter.delete(AUTH_SESSION_STORAGE_KEY);
    }
  };
}

function readStoredAuthSession(options: {
  adapter: Pick<ConfigStorageAdapter, "get">;
  safeStorage: SafeStorageLike;
}): StoredAuthSession | undefined {
  const stored = options.adapter.get(AUTH_SESSION_STORAGE_KEY);
  if (!isStoredAuthSession(stored)) {
    return undefined;
  }
  if (!options.safeStorage.isEncryptionAvailable()) {
    return undefined;
  }
  return {
    user: stored.user,
    refreshToken: options.safeStorage.decryptString(
      Buffer.from(stored.refreshToken, "base64")
    ),
    expiresAt: stored.expiresAt,
    refreshExpiresAt: stored.refreshExpiresAt,
    ...(stored.featureFlags ? { featureFlags: stored.featureFlags } : {})
  };
}

function isStoredAuthSession(input: unknown): input is StoredAuthSessionV1 {
  return (
    typeof input === "object" &&
    input !== null &&
    (input as StoredAuthSessionV1).v === 1 &&
    typeof (input as StoredAuthSessionV1).refreshToken === "string" &&
    (input as StoredAuthSessionV1).refreshTokenProtection === "safeStorage" &&
    typeof (input as StoredAuthSessionV1).expiresAt === "string" &&
    typeof (input as StoredAuthSessionV1).refreshExpiresAt === "string" &&
    typeof (input as StoredAuthSessionV1).user?.id === "string" &&
    typeof (input as StoredAuthSessionV1).user?.displayName === "string"
  );
}
```

- [ ] **Step 5: Implement LDAP crypto**

Create `apps/desktop/src/main/auth/ldapCrypto.ts`:

```ts
import { randomBytes as nodeRandomBytes, webcrypto } from "node:crypto";

export interface EncryptedLdapPassword {
  keyId: string;
  passwordCipher: string;
  nonce: string;
  timestamp: string;
}

export async function encryptLdapPassword(input: {
  password: string;
  publicKeyPem: string;
  keyId: string;
  now?: () => Date;
  randomBytes?: () => Buffer;
}): Promise<EncryptedLdapPassword> {
  const now = input.now ?? (() => new Date());
  const randomBytes = input.randomBytes ?? (() => nodeRandomBytes(32));
  const nonce = randomBytes().toString("base64url");
  const timestamp = now().toISOString();
  const payload = JSON.stringify({
    password: input.password,
    nonce,
    timestamp
  });
  const publicKey = await importRsaOaepPublicKey(input.publicKeyPem);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(payload)
  );
  return {
    keyId: input.keyId,
    nonce,
    timestamp,
    passwordCipher: Buffer.from(encrypted).toString("base64")
  };
}

async function importRsaOaepPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  const der = Buffer.from(
    publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/g, "")
      .replace(/-----END PUBLIC KEY-----/g, "")
      .replace(/\s+/g, ""),
    "base64"
  );
  return webcrypto.subtle.importKey(
    "spki",
    der,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}
```

- [ ] **Step 6: Verify Task 2 tests pass**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authSessionStore.test.ts apps/desktop/src/main/auth/ldapCrypto.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add apps/desktop/src/main/auth/authSessionStore.ts apps/desktop/src/main/auth/authSessionStore.test.ts apps/desktop/src/main/auth/ldapCrypto.ts apps/desktop/src/main/auth/ldapCrypto.test.ts
git commit -m "feat(auth): add session storage"
```

---

### Task 3: AuthService

**Files:**
- Create: `apps/desktop/src/main/auth/authService.ts`
- Create: `apps/desktop/src/main/auth/authService.test.ts`

- [ ] **Step 1: Write failing AuthService tests**

Create `apps/desktop/src/main/auth/authService.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { AuthHttpError, type AuthHttpClient, type AuthTokenResponse } from "./authTypes";
import { createAuthService } from "./authService";
import type { AuthSessionStore, StoredAuthSession } from "./authSessionStore";

const tokenResponse: AuthTokenResponse = {
  user: {
    id: "user-1",
    displayName: "Alex",
    email: "user@example.com",
    authType: "email_code"
  },
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresInSeconds: 10,
  refreshExpiresInSeconds: 20,
  featureFlags: { history: true }
};

function createClient(overrides: Partial<AuthHttpClient> = {}): AuthHttpClient {
  return {
    sendEmailCode: vi.fn(async () => ({ cooldownSeconds: 60 })),
    loginWithEmailCode: vi.fn(async () => tokenResponse),
    getLdapPublicKey: vi.fn(async () => ({
      keyId: "key-1",
      alg: "RSA-OAEP-256",
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----",
      expiresAt: "2026-06-17T10:00:00.000Z"
    })),
    loginWithLdap: vi.fn(async () => ({
      ...tokenResponse,
      user: { id: "user-2", displayName: "Dana", authType: "ldap" }
    })),
    refresh: vi.fn(async () => ({
      ...tokenResponse,
      accessToken: "access-refreshed",
      refreshToken: "refresh-refreshed"
    })),
    logout: vi.fn(async () => ({ ok: true })),
    ...overrides
  };
}

function createStore(stored?: StoredAuthSession): AuthSessionStore {
  let current = stored;
  return {
    isPersistentSessionAvailable: vi.fn(() => true),
    read: vi.fn(() => current),
    write: vi.fn((response) => {
      current = {
        user: response.user,
        refreshToken: response.refreshToken,
        expiresAt: new Date(Date.now() + response.expiresInSeconds * 1000).toISOString(),
        refreshExpiresAt: new Date(
          Date.now() + response.refreshExpiresInSeconds * 1000
        ).toISOString(),
        featureFlags: response.featureFlags
      };
    }),
    clear: vi.fn(() => {
      current = undefined;
    })
  };
}

function createService(options: {
  client?: AuthHttpClient;
  store?: AuthSessionStore;
  now?: () => number;
} = {}) {
  const client = options.client ?? createClient();
  const store = options.store ?? createStore();
  const snapshots: unknown[] = [];
  const service = createAuthService({
    client,
    sessionStore: store,
    getDeviceContext: () => ({
      installationId: "install-1",
      deviceName: "ALEX-PC",
      platform: "windows",
      appVersion: "0.1.0",
      locale: "zh-CN"
    }),
    encryptLdapPassword: vi.fn(async () => ({
      keyId: "key-1",
      passwordCipher: "cipher",
      nonce: "nonce-1",
      timestamp: "2026-06-17T09:00:00.000Z"
    })),
    now: options.now ?? (() => 1000)
  });
  service.subscribe((snapshot) => snapshots.push(snapshot));
  return { service, client, store, snapshots };
}

describe("auth service", () => {
  it("restores unauthenticated when no persisted session exists", async () => {
    const { service } = createService();

    await expect(service.restoreSession()).resolves.toEqual({
      status: "unauthenticated"
    });
  });

  it("clears expired persisted sessions", async () => {
    const store = createStore({
      user: tokenResponse.user,
      refreshToken: "refresh-old",
      expiresAt: "1970-01-01T00:00:00.500Z",
      refreshExpiresAt: "1970-01-01T00:00:00.900Z"
    });
    const { service } = createService({ store, now: () => 1000 });

    await expect(service.restoreSession()).resolves.toEqual({
      status: "expired",
      message: "Session expired"
    });
    expect(store.clear).toHaveBeenCalled();
  });

  it("refreshes persisted sessions during restore", async () => {
    const client = createClient();
    const store = createStore({
      user: tokenResponse.user,
      refreshToken: "refresh-old",
      expiresAt: "1970-01-01T00:00:00.500Z",
      refreshExpiresAt: "1970-01-01T00:00:30.000Z"
    });
    const { service } = createService({ client, store, now: () => 1000 });

    await expect(service.restoreSession()).resolves.toMatchObject({
      status: "authenticated",
      user: tokenResponse.user
    });
    expect(client.refresh).toHaveBeenCalledWith({
      refreshToken: "refresh-old",
      device: expect.objectContaining({ installationId: "install-1" })
    });
  });

  it("keeps persisted session and returns offline when restore refresh hits network error", async () => {
    const client = createClient({
      refresh: vi.fn(async () => {
        throw new AuthHttpError(0, "network_error", "fetch failed");
      })
    });
    const store = createStore({
      user: tokenResponse.user,
      refreshToken: "refresh-old",
      expiresAt: "1970-01-01T00:00:00.500Z",
      refreshExpiresAt: "1970-01-01T00:00:30.000Z"
    });
    const { service } = createService({ client, store, now: () => 1000 });

    await expect(service.restoreSession()).resolves.toEqual({
      status: "offline",
      user: tokenResponse.user,
      message: "Network unavailable"
    });
    expect(store.clear).not.toHaveBeenCalled();
  });

  it("logs in with email code, stores tokens, and broadcasts session", async () => {
    const { service, client, store, snapshots } = createService();

    await expect(
      service.loginWithEmailCode({
        email: "user@example.com",
        code: "123456",
        rememberMe: true
      })
    ).resolves.toMatchObject({
      status: "authenticated",
      user: tokenResponse.user
    });
    expect(client.loginWithEmailCode).toHaveBeenCalledWith({
      email: "user@example.com",
      code: "123456",
      rememberMe: true,
      device: expect.objectContaining({ platform: "windows" })
    });
    expect(store.write).toHaveBeenCalledWith(tokenResponse, {
      persistRefreshToken: true
    });
    expect(snapshots).toContainEqual(
      expect.objectContaining({ status: "authenticated" })
    );
  });

  it("uses in-memory session when rememberMe is false", async () => {
    const { service, store } = createService();

    await service.loginWithEmailCode({
      email: "user@example.com",
      code: "123456",
      rememberMe: false
    });

    expect(store.write).toHaveBeenCalledWith(tokenResponse, {
      persistRefreshToken: false
    });
  });

  it("encrypts LDAP password before login", async () => {
    const { service, client } = createService();

    await service.loginWithLdap({
      account: "ALEX\\dana",
      password: "secret",
      rememberMe: true
    });

    expect(client.loginWithLdap).toHaveBeenCalledWith(
      expect.objectContaining({
        account: "ALEX\\dana",
        passwordCipher: "cipher",
        keyId: "key-1",
        nonce: "nonce-1"
      })
    );
  });

  it("deduplicates concurrent refresh requests", async () => {
    let resolveRefresh: (response: AuthTokenResponse) => void = () => undefined;
    const refreshPromise = new Promise<AuthTokenResponse>((resolve) => {
      resolveRefresh = resolve;
    });
    const client = createClient({
      refresh: vi.fn(() => refreshPromise)
    });
    const { service } = createService({ client });
    await service.loginWithEmailCode({
      email: "user@example.com",
      code: "123456",
      rememberMe: true
    });

    const first = service.getAccessTokenForRequest();
    const second = service.getAccessTokenForRequest();
    resolveRefresh({
      ...tokenResponse,
      accessToken: "access-refreshed",
      refreshToken: "refresh-refreshed"
    });

    await expect(first).resolves.toBe("access-refreshed");
    await expect(second).resolves.toBe("access-refreshed");
    expect(client.refresh).toHaveBeenCalledTimes(1);
  });

  it("clears local session on logout even when backend logout fails", async () => {
    const client = createClient({
      logout: vi.fn(async () => {
        throw new AuthHttpError(503, "backend_unavailable", "down");
      })
    });
    const { service, store } = createService({ client });
    await service.loginWithEmailCode({
      email: "user@example.com",
      code: "123456",
      rememberMe: true
    });

    await expect(service.logout()).resolves.toEqual({ status: "unauthenticated" });
    expect(store.clear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing AuthService tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authService.test.ts
```

Expected: FAIL because `authService.ts` does not exist.

- [ ] **Step 3: Implement AuthService**

Create `apps/desktop/src/main/auth/authService.ts` with this structure:

```ts
import type {
  AuthDeviceContext,
  AuthHttpClient,
  AuthSessionSnapshot,
  AuthTokenResponse,
  EmailCodeLoginInput,
  LdapLoginInput
} from "./authTypes";
import { AuthHttpError } from "./authTypes";
import type { AuthSessionStore } from "./authSessionStore";

interface CreateAuthServiceOptions {
  client: AuthHttpClient;
  sessionStore: AuthSessionStore;
  getDeviceContext(): AuthDeviceContext;
  encryptLdapPassword(input: {
    password: string;
    publicKeyPem: string;
    keyId: string;
  }): Promise<{
    keyId: string;
    passwordCipher: string;
    nonce: string;
    timestamp: string;
  }>;
  now?: () => number;
}

export interface AuthService {
  getSessionSnapshot(): AuthSessionSnapshot;
  restoreSession(): Promise<AuthSessionSnapshot>;
  sendEmailCode(input: { email: string }): Promise<{ cooldownSeconds: number }>;
  loginWithEmailCode(input: EmailCodeLoginInput): Promise<AuthSessionSnapshot>;
  loginWithLdap(input: LdapLoginInput): Promise<AuthSessionSnapshot>;
  logout(): Promise<AuthSessionSnapshot>;
  getAccessTokenForRequest(): Promise<string>;
  clearSession(message?: string): Promise<AuthSessionSnapshot>;
  subscribe(listener: (snapshot: AuthSessionSnapshot) => void): () => void;
}

interface RuntimeSession {
  user: AuthTokenResponse["user"];
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
  refreshExpiresAtMs: number;
  featureFlags?: Record<string, boolean>;
}

export function createAuthService(options: CreateAuthServiceOptions): AuthService {
  const now = options.now ?? Date.now;
  const listeners = new Set<(snapshot: AuthSessionSnapshot) => void>();
  let session: RuntimeSession | undefined;
  let refreshInFlight: Promise<AuthTokenResponse> | undefined;

  const notify = (snapshot: AuthSessionSnapshot): AuthSessionSnapshot => {
    for (const listener of listeners) {
      listener(snapshot);
    }
    return snapshot;
  };

  const snapshotFromSession = (): AuthSessionSnapshot =>
    session
      ? {
          status: "authenticated",
          user: session.user,
          ...(session.featureFlags ? { featureFlags: session.featureFlags } : {})
        }
      : { status: "unauthenticated" };

  const applyTokenResponse = (
    response: AuthTokenResponse,
    persistRefreshToken: boolean
  ): AuthSessionSnapshot => {
    session = {
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAtMs: now() + response.expiresInSeconds * 1000,
      refreshExpiresAtMs: now() + response.refreshExpiresInSeconds * 1000,
      ...(response.featureFlags ? { featureFlags: response.featureFlags } : {})
    };
    options.sessionStore.write(response, { persistRefreshToken });
    return notify(snapshotFromSession());
  };

  const refresh = async (refreshToken: string): Promise<AuthTokenResponse> => {
    if (!refreshInFlight) {
      refreshInFlight = options.client
        .refresh({ refreshToken, device: options.getDeviceContext() })
        .finally(() => {
          refreshInFlight = undefined;
        });
    }
    return refreshInFlight;
  };

  return {
    getSessionSnapshot: snapshotFromSession,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    restoreSession: async () => {
      const stored = options.sessionStore.read();
      if (!stored) {
        return { status: "unauthenticated" };
      }
      if (Date.parse(stored.refreshExpiresAt) <= now()) {
        options.sessionStore.clear();
        return notify({ status: "expired", message: "Session expired" });
      }
      try {
        const response = await refresh(stored.refreshToken);
        return applyTokenResponse(response, true);
      } catch (error) {
        if (isNetworkError(error)) {
          return {
            status: "offline",
            user: stored.user,
            message: "Network unavailable"
          };
        }
        options.sessionStore.clear();
        return notify({ status: "expired", message: "Session expired" });
      }
    },
    sendEmailCode: (input) =>
      options.client.sendEmailCode({
        email: input.email,
        device: options.getDeviceContext()
      }),
    loginWithEmailCode: async (input) => {
      const response = await options.client.loginWithEmailCode({
        ...input,
        device: options.getDeviceContext()
      });
      return applyTokenResponse(response, input.rememberMe);
    },
    loginWithLdap: async (input) => {
      const publicKey = await options.client.getLdapPublicKey();
      const encrypted = await options.encryptLdapPassword({
        password: input.password,
        publicKeyPem: publicKey.publicKeyPem,
        keyId: publicKey.keyId
      });
      const response = await options.client.loginWithLdap({
        account: input.account,
        rememberMe: input.rememberMe,
        ...encrypted,
        device: options.getDeviceContext()
      });
      return applyTokenResponse(response, input.rememberMe);
    },
    logout: async () => {
      const current = session;
      try {
        await options.client.logout({
          accessToken: current?.accessToken,
          refreshToken: current?.refreshToken,
          device: options.getDeviceContext()
        });
      } catch {
        // Local logout must win even if backend revocation fails.
      }
      session = undefined;
      options.sessionStore.clear();
      return notify({ status: "unauthenticated" });
    },
    getAccessTokenForRequest: async () => {
      if (!session) {
        throw new AuthHttpError(401, "session_expired", "Not authenticated");
      }
      if (session.expiresAtMs > now() + 30_000) {
        return session.accessToken;
      }
      const response = await refresh(session.refreshToken);
      applyTokenResponse(response, true);
      return response.accessToken;
    },
    clearSession: async (message) => {
      session = undefined;
      options.sessionStore.clear();
      return notify({ status: "unauthenticated", ...(message ? { message } : {}) });
    }
  };
}

function isNetworkError(error: unknown): boolean {
  return error instanceof AuthHttpError && error.code === "network_error";
}
```

- [ ] **Step 4: Verify AuthService tests pass**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add apps/desktop/src/main/auth/authService.ts apps/desktop/src/main/auth/authService.test.ts
git commit -m "feat(auth): add main auth service"
```

---

### Task 4: IPC Schemas, Routes, And Preload API

**Files:**
- Modify: `apps/desktop/src/main/ipc/ipcSchemas.ts`
- Modify: `apps/desktop/src/main/ipc/ipcRoutes.ts`
- Modify: `apps/desktop/src/main/ipc/ipcRoutes.test.ts`
- Modify: `apps/desktop/src/preload/voiceApi.ts`

- [ ] **Step 1: Write failing IPC route tests**

Append to `apps/desktop/src/main/ipc/ipcRoutes.test.ts`:

```ts
it("routes auth requests through the auth service", async () => {
  const authCalls: unknown[] = [];
  const authService = {
    getSessionSnapshot: () => ({ status: "unauthenticated" as const }),
    sendEmailCode: async (input: unknown) => {
      authCalls.push(["sendEmailCode", input]);
      return { cooldownSeconds: 60 };
    },
    loginWithEmailCode: async (input: unknown) => {
      authCalls.push(["loginWithEmailCode", input]);
      return { status: "authenticated" as const };
    },
    loginWithLdap: async (input: unknown) => {
      authCalls.push(["loginWithLdap", input]);
      return { status: "authenticated" as const };
    },
    logout: async () => ({ status: "unauthenticated" as const })
  };
  const handlers = createIpcRouteHandlers(
    createDeps({ authService } as never)
  );

  await expect(
    handlers.sendEmailCode({ email: " user@example.com " })
  ).resolves.toEqual({ cooldownSeconds: 60 });
  await expect(
    handlers.loginWithEmailCode({
      email: "user@example.com",
      code: "123456",
      rememberMe: true
    })
  ).resolves.toEqual({ status: "authenticated" });
  await expect(
    handlers.loginWithLdap({
      account: "alex",
      password: "secret",
      rememberMe: false
    })
  ).resolves.toEqual({ status: "authenticated" });

  expect(authCalls).toEqual([
    ["sendEmailCode", { email: "user@example.com" }],
    [
      "loginWithEmailCode",
      { email: "user@example.com", code: "123456", rememberMe: true }
    ],
    [
      "loginWithLdap",
      { account: "alex", password: "secret", rememberMe: false }
    ]
  ]);
});

it("rejects malformed auth input", async () => {
  const handlers = createIpcRouteHandlers(createDeps({ authService: {} } as never));

  await expect(handlers.sendEmailCode({ email: "not-an-email" })).rejects.toThrow(
    "Auth email must be a valid email address"
  );
  await expect(
    handlers.loginWithEmailCode({
      email: "user@example.com",
      code: "12",
      rememberMe: true
    })
  ).rejects.toThrow("Auth code must be 6 digits");
});
```

- [ ] **Step 2: Run failing IPC tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/ipc/ipcRoutes.test.ts -- -t "auth"
```

Expected: FAIL because auth handlers and parsers do not exist.

- [ ] **Step 3: Add auth parsers to ipcSchemas**

Modify `apps/desktop/src/main/ipc/ipcSchemas.ts`:

```ts
export interface SendEmailCodeIpcInput {
  email: string;
}

export interface EmailCodeLoginIpcInput {
  email: string;
  code: string;
  rememberMe: boolean;
}

export interface LdapLoginIpcInput {
  account: string;
  password: string;
  rememberMe: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSendEmailCodeInput(input: unknown): SendEmailCodeIpcInput {
  if (!isRecord(input) || typeof input.email !== "string") {
    throw new Error("Auth email is required");
  }
  const email = input.email.trim();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Auth email must be a valid email address");
  }
  return { email };
}

export function parseEmailCodeLoginInput(input: unknown): EmailCodeLoginIpcInput {
  if (!isRecord(input)) {
    throw new Error("Auth email login input must be an object");
  }
  const email = parseSendEmailCodeInput(input).email;
  if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    throw new Error("Auth code must be 6 digits");
  }
  return {
    email,
    code: input.code,
    rememberMe: input.rememberMe === true
  };
}

export function parseLdapLoginInput(input: unknown): LdapLoginIpcInput {
  if (!isRecord(input)) {
    throw new Error("Auth LDAP login input must be an object");
  }
  if (typeof input.account !== "string" || !input.account.trim()) {
    throw new Error("Auth LDAP account is required");
  }
  if (typeof input.password !== "string" || !input.password) {
    throw new Error("Auth LDAP password is required");
  }
  return {
    account: input.account.trim(),
    password: input.password,
    rememberMe: input.rememberMe === true
  };
}
```

- [ ] **Step 4: Add auth dependencies and handlers to ipcRoutes**

Modify `apps/desktop/src/main/ipc/ipcRoutes.ts`:

```ts
import type { AuthService } from "../auth/authService";
import {
  parseEmailCodeLoginInput,
  parseLdapLoginInput,
  parseSendEmailCodeInput
} from "./ipcSchemas";

export interface IpcRouteDependencies {
  // existing fields stay
  authService: Pick<
    AuthService,
    | "getSessionSnapshot"
    | "sendEmailCode"
    | "loginWithEmailCode"
    | "loginWithLdap"
    | "logout"
  >;
}

export interface IpcRouteHandlers {
  // existing methods stay
  getAuthSession(): ReturnType<IpcRouteDependencies["authService"]["getSessionSnapshot"]>;
  sendEmailCode(input: unknown): ReturnType<IpcRouteDependencies["authService"]["sendEmailCode"]>;
  loginWithEmailCode(input: unknown): ReturnType<IpcRouteDependencies["authService"]["loginWithEmailCode"]>;
  loginWithLdap(input: unknown): ReturnType<IpcRouteDependencies["authService"]["loginWithLdap"]>;
  logout(): ReturnType<IpcRouteDependencies["authService"]["logout"]>;
}
```

Add handler implementations inside `createIpcRouteHandlers()`:

```ts
getAuthSession: () => dependencies.authService.getSessionSnapshot(),
sendEmailCode: (input) =>
  dependencies.authService.sendEmailCode(parseSendEmailCodeInput(input)),
loginWithEmailCode: (input) =>
  dependencies.authService.loginWithEmailCode(parseEmailCodeLoginInput(input)),
loginWithLdap: (input) =>
  dependencies.authService.loginWithLdap(parseLdapLoginInput(input)),
logout: () => dependencies.authService.logout(),
```

Add IPC registrations inside `registerIpcRoutes()`:

```ts
handle("voice:auth:get-session", () => handlers.getAuthSession());
handle("voice:auth:send-email-code", (_event, input: unknown) =>
  handlers.sendEmailCode(input)
);
handle("voice:auth:login-email-code", (_event, input: unknown) =>
  handlers.loginWithEmailCode(input)
);
handle("voice:auth:login-ldap", (_event, input: unknown) =>
  handlers.loginWithLdap(input)
);
handle("voice:auth:logout", () => handlers.logout());
```

- [ ] **Step 5: Add auth API to preload**

Modify `apps/desktop/src/preload/voiceApi.ts`:

```ts
export type AuthSessionStatus =
  | "authenticated"
  | "unauthenticated"
  | "expired"
  | "offline"
  | "error";

export interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  user?: {
    id: string;
    displayName: string;
    email?: string;
    authType: "email_code" | "ldap";
  };
  featureFlags?: Record<string, boolean>;
  message?: string;
}

export interface SendEmailCodeInput {
  email: string;
}

export interface EmailCodeLoginInput {
  email: string;
  code: string;
  rememberMe: boolean;
}

export interface LdapLoginInput {
  account: string;
  password: string;
  rememberMe: boolean;
}

export interface VoiceAIAPI {
  // existing methods stay
  getAuthSession(): Promise<AuthSessionSnapshot>;
  sendEmailCode(input: SendEmailCodeInput): Promise<{ cooldownSeconds: number }>;
  loginWithEmailCode(input: EmailCodeLoginInput): Promise<AuthSessionSnapshot>;
  loginWithLdap(input: LdapLoginInput): Promise<AuthSessionSnapshot>;
  logout(): Promise<AuthSessionSnapshot>;
  onAuthSessionChanged(callback: (snapshot: AuthSessionSnapshot) => void): () => void;
}
```

Add implementations:

```ts
getAuthSession: () => ipcRenderer.invoke("voice:auth:get-session"),
sendEmailCode: (input) => ipcRenderer.invoke("voice:auth:send-email-code", input),
loginWithEmailCode: (input) =>
  ipcRenderer.invoke("voice:auth:login-email-code", input),
loginWithLdap: (input) => ipcRenderer.invoke("voice:auth:login-ldap", input),
logout: () => ipcRenderer.invoke("voice:auth:logout"),
onAuthSessionChanged: (callback) => {
  const listener = (
    _event: Electron.IpcRendererEvent,
    snapshot: AuthSessionSnapshot
  ): void => {
    callback(snapshot);
  };
  ipcRenderer.on("voice:auth:session-changed", listener);
  return () => ipcRenderer.removeListener("voice:auth:session-changed", listener);
},
```

- [ ] **Step 6: Verify IPC tests and desktop typecheck**

Run:

```bash
pnpm vitest run apps/desktop/src/main/ipc/ipcRoutes.test.ts -- -t "auth"
pnpm --filter @voice/desktop typecheck
```

Expected: auth IPC tests PASS and desktop typecheck PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add apps/desktop/src/main/ipc/ipcSchemas.ts apps/desktop/src/main/ipc/ipcRoutes.ts apps/desktop/src/main/ipc/ipcRoutes.test.ts apps/desktop/src/preload/voiceApi.ts
git commit -m "feat(auth): expose auth IPC"
```

---

### Task 5: Login Setup Window

**Files:**
- Create: `apps/desktop/src/main/windows/createLoginSetupWindow.ts`
- Create: `apps/desktop/src/main/windows/createLoginSetupWindow.test.ts`

- [ ] **Step 1: Write failing window tests**

Create `apps/desktop/src/main/windows/createLoginSetupWindow.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

const electronMock = vi.hoisted(() => {
  const instances: Array<{
    loadFile: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
  }> = [];
  const BrowserWindow = vi.fn((options: unknown) => {
    const instance = {
      options,
      loadFile: vi.fn(),
      loadURL: vi.fn()
    };
    instances.push(instance);
    return instance;
  });
  return { BrowserWindow, instances };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow,
  app: {
    getAppPath: () => join(__dirname, "../../.."),
    isPackaged: false
  }
}));

vi.mock("./shortcutCaptureWindowGuard", () => ({
  blockHomeWindowAltSpaceMenu: vi.fn()
}));

describe("createLoginSetupWindow", () => {
  beforeEach(() => {
    electronMock.BrowserWindow.mockClear();
    electronMock.instances.length = 0;
    vi.unstubAllEnvs();
  });

  it("creates a frameless login setup window", async () => {
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow();

    expect(electronMock.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 947,
        height: 670,
        minWidth: 900,
        minHeight: 640,
        frame: false,
        autoHideMenuBar: true,
        show: false
      })
    );
  });

  it("loads the login setup route in production", async () => {
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow();

    expect(electronMock.instances[0]?.loadFile).toHaveBeenCalledWith(
      expect.stringContaining("index.html"),
      { hash: "login-setup" }
    );
  });

  it("loads the login setup route in development", async () => {
    vi.stubEnv("ELECTRON_RENDERER_URL", "http://localhost:5173");
    const { createLoginSetupWindow } = await import("./createLoginSetupWindow");

    createLoginSetupWindow();

    expect(electronMock.instances[0]?.loadURL).toHaveBeenCalledWith(
      "http://localhost:5173#/login-setup"
    );
  });
});
```

- [ ] **Step 2: Run failing window tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/windows/createLoginSetupWindow.test.ts
```

Expected: FAIL because `createLoginSetupWindow.ts` does not exist.

- [ ] **Step 3: Implement login setup window**

Create `apps/desktop/src/main/windows/createLoginSetupWindow.ts`:

```ts
import { join } from "node:path";
import { BrowserWindow } from "electron";
import { resolveRuntimeAppIconPath } from "./appIcon";
import { blockHomeWindowAltSpaceMenu } from "./shortcutCaptureWindowGuard";

export function createLoginSetupWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 947,
    height: 670,
    minWidth: 900,
    minHeight: 640,
    show: false,
    icon: resolveRuntimeAppIconPath(),
    backgroundColor: "#efefef",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, "../preload/index.mjs")
    }
  });

  blockHomeWindowAltSpaceMenu(window);

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/login-setup`);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "login-setup"
    });
  }

  return window;
}
```

- [ ] **Step 4: Verify window tests pass**

Run:

```bash
pnpm vitest run apps/desktop/src/main/windows/createLoginSetupWindow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add apps/desktop/src/main/windows/createLoginSetupWindow.ts apps/desktop/src/main/windows/createLoginSetupWindow.test.ts
git commit -m "feat(auth): add login setup route"
```

---

### Task 6: LoginSetupPage UI

**Files:**
- Create: `apps/desktop/src/renderer/features/login/LoginSetupPage.tsx`
- Create: `apps/desktop/src/renderer/features/login/login-setup.css`
- Modify: `apps/desktop/src/renderer/app/routes.ts`
- Modify: `apps/desktop/src/renderer/main.tsx`
- Modify: `apps/desktop/src/renderer/app/HomeShell.tsx`

- [ ] **Step 1: Create LoginSetupPage component**

Create `apps/desktop/src/renderer/features/login/LoginSetupPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import type {
  AuthSessionSnapshot,
  EmailCodeLoginInput,
  LdapLoginInput
} from "../../../preload/voiceApi";
import "./login-setup.css";

type SetupStep = "login" | "settings" | "experience" | "ready";
type LoginMode = "email" | "ldap";

const STEPS: Array<{ id: SetupStep; label: string }> = [
  { id: "login", label: "登录" },
  { id: "settings", label: "设置" },
  { id: "experience", label: "体验" },
  { id: "ready", label: "就绪" }
];

export function LoginSetupPage(): React.JSX.Element {
  const [step, setStep] = useState<SetupStep>("login");
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [session, setSession] = useState<AuthSessionSnapshot>({ status: "unauthenticated" });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code);
  const canSubmitEmail = emailValid && codeValid && !submitting;
  const canSubmitLdap = account.trim().length > 0 && password.length > 0 && !submitting;

  useEffect(() => {
    let cancelled = false;
    void window.voiceAI.getAuthSession().then((snapshot) => {
      if (!cancelled) {
        setSession(snapshot);
        if (snapshot.status === "offline") {
          setMessage(snapshot.message ?? "网络异常，请检查连接后重试");
        }
      }
    });
    const unsubscribe = window.voiceAI.onAuthSessionChanged((snapshot) => {
      setSession(snapshot);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }
    const handle = window.setTimeout(
      () => setCooldownRemaining((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearTimeout(handle);
  }, [cooldownRemaining]);

  const activeStepIndex = useMemo(
    () => STEPS.findIndex((entry) => entry.id === step),
    [step]
  );

  const sendCode = (): void => {
    if (!emailValid || cooldownRemaining > 0) {
      return;
    }
    setMessage(undefined);
    void window.voiceAI
      .sendEmailCode({ email: email.trim() })
      .then((result) => {
        setCooldownRemaining(result.cooldownSeconds || 60);
        setMessage("验证码已发送，请检查邮箱。");
      })
      .catch((error: unknown) => setMessage(getErrorMessage(error)));
  };

  const submitLogin = (): void => {
    setMessage(undefined);
    setSubmitting(true);
    const request =
      mode === "email"
        ? window.voiceAI.loginWithEmailCode({
            email: email.trim(),
            code,
            rememberMe
          } satisfies EmailCodeLoginInput)
        : window.voiceAI.loginWithLdap({
            account: account.trim(),
            password,
            rememberMe
          } satisfies LdapLoginInput);
    void request
      .then((snapshot) => {
        setSession(snapshot);
        if (snapshot.status === "authenticated") {
          setStep("settings");
          return;
        }
        setMessage(snapshot.message ?? "登录失败，请重试。");
      })
      .catch((error: unknown) => setMessage(getErrorMessage(error)))
      .finally(() => setSubmitting(false));
  };

  return (
    <main className="login-setup">
      <header className="login-setup__chrome">
        <span className="login-setup__brand">Voice Assistant 安装向导</span>
        <div className="login-setup__window-controls" aria-label="窗口控制">
          <button
            className="login-setup__window-button"
            type="button"
            aria-label="最小化"
            onClick={() => window.voiceAI.controlHomeWindow("minimize")}
          >
            <span className="login-setup__minimize" />
          </button>
          <button
            className="login-setup__window-button"
            type="button"
            aria-label="关闭"
            onClick={() => window.voiceAI.controlHomeWindow("close")}
          >
            <span className="login-setup__close" />
          </button>
        </div>
      </header>

      <nav className="login-setup__steps" aria-label="安装向导步骤">
        {STEPS.map((entry, index) => (
          <div
            key={entry.id}
            className={
              index <= activeStepIndex
                ? "login-setup__step login-setup__step--active"
                : "login-setup__step"
            }
          >
            <span>{entry.label}</span>
            {index < STEPS.length - 1 ? (
              <span className="login-setup__chevron">»</span>
            ) : null}
          </div>
        ))}
      </nav>

      <section className="login-setup__panel">
        {step === "login" ? (
          <LoginPanel
            mode={mode}
            email={email}
            code={code}
            account={account}
            password={password}
            rememberMe={rememberMe}
            message={message}
            cooldownRemaining={cooldownRemaining}
            canSubmitEmail={canSubmitEmail}
            canSubmitLdap={canSubmitLdap}
            submitting={submitting}
            session={session}
            onModeChange={setMode}
            onEmailChange={setEmail}
            onCodeChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            onAccountChange={setAccount}
            onPasswordChange={setPassword}
            onRememberMeChange={setRememberMe}
            onSendCode={sendCode}
          />
        ) : step === "settings" ? (
          <SetupPanel title="基础设置" description="确认语言、主题和开机启动设置。设置项将沿用当前应用配置。" />
        ) : step === "experience" ? (
          <SetupPanel title="体验检查" description="确认麦克风权限与快捷键可用后即可开始使用。" />
        ) : (
          <SetupPanel title="准备就绪" description="登录与初始化完成，可以进入主应用。" />
        )}
      </section>

      <footer className="login-setup__footer">
        <span className="login-setup__hint">
          {step === "login" ? "登录后云端同步配置与历史。" : ""}
        </span>
        <button
          className="login-setup__primary"
          type="button"
          disabled={
            step === "login"
              ? mode === "email"
                ? !canSubmitEmail
                : !canSubmitLdap
              : false
          }
          onClick={() => {
            if (step === "login") {
              submitLogin();
            } else if (step === "settings") {
              setStep("experience");
            } else if (step === "experience") {
              setStep("ready");
            } else {
              window.voiceAI.openHomeSection({ section: "home" });
            }
          }}
        >
          {step === "login" ? "登录" : step === "ready" ? "进入主应用" : "下一步"}
          <span aria-hidden="true"> →</span>
        </button>
      </footer>
    </main>
  );
}

function LoginPanel(props: {
  mode: LoginMode;
  email: string;
  code: string;
  account: string;
  password: string;
  rememberMe: boolean;
  message?: string;
  cooldownRemaining: number;
  canSubmitEmail: boolean;
  canSubmitLdap: boolean;
  submitting: boolean;
  session: AuthSessionSnapshot;
  onModeChange(mode: LoginMode): void;
  onEmailChange(value: string): void;
  onCodeChange(value: string): void;
  onAccountChange(value: string): void;
  onPasswordChange(value: string): void;
  onRememberMeChange(value: boolean): void;
  onSendCode(): void;
}): React.JSX.Element {
  return (
    <div className="login-setup__login">
      <div className="login-setup__tabs">
        <button
          type="button"
          className={props.mode === "email" ? "login-setup__tab login-setup__tab--active" : "login-setup__tab"}
          onClick={() => props.onModeChange("email")}
        >
          登录您的账户
        </button>
        <button
          type="button"
          className={props.mode === "ldap" ? "login-setup__tab login-setup__tab--active" : "login-setup__tab"}
          onClick={() => props.onModeChange("ldap")}
        >
          使用 AD 域登入
        </button>
      </div>
      <p className="login-setup__copy">
        {props.mode === "email"
          ? "使用邮箱 + 验证码快速登录，云端同步配置与历史。"
          : "使用企业 AD/LDAP 账号登录。密码只在主进程中加密后提交。"}
      </p>
      {props.mode === "email" ? (
        <div className="login-setup__form">
          <label>电子邮箱</label>
          <input
            value={props.email}
            placeholder="your@company.com"
            onChange={(event) => props.onEmailChange(event.currentTarget.value)}
          />
          <label>验证码</label>
          <div className="login-setup__code-row">
            <input
              value={props.code}
              placeholder="验证码"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => props.onCodeChange(event.currentTarget.value)}
            />
            <button
              type="button"
              disabled={props.cooldownRemaining > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email.trim())}
              onClick={props.onSendCode}
            >
              {props.cooldownRemaining > 0
                ? `${props.cooldownRemaining}s`
                : "发送验证码"}
            </button>
          </div>
          <p className="login-setup__field-note">请在160秒内输入验证码。</p>
        </div>
      ) : (
        <div className="login-setup__form">
          <label>AD 账号</label>
          <input
            value={props.account}
            placeholder="domain\\account"
            onChange={(event) => props.onAccountChange(event.currentTarget.value)}
          />
          <label>密码</label>
          <input
            value={props.password}
            type="password"
            placeholder="密码"
            onChange={(event) => props.onPasswordChange(event.currentTarget.value)}
          />
        </div>
      )}
      <label className="login-setup__remember">
        <input
          type="checkbox"
          checked={props.rememberMe}
          onChange={(event) => props.onRememberMeChange(event.currentTarget.checked)}
        />
        <span>记住登录状态</span>
      </label>
      {props.message ? <p className="login-setup__message">{props.message}</p> : null}
      {props.session.status === "offline" ? (
        <p className="login-setup__message">网络异常，请检查连接后重试。</p>
      ) : null}
    </div>
  );
}

function SetupPanel({
  title,
  description
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="login-setup__placeholder-panel">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

- [ ] **Step 2: Add login setup CSS**

Create `apps/desktop/src/renderer/features/login/login-setup.css`:

```css
.login-setup {
  min-height: 100vh;
  background: #efefef;
  color: #141414;
  font-family: "Microsoft JhengHei", "Microsoft YaHei", system-ui, sans-serif;
  display: grid;
  grid-template-rows: 58px auto 1fr 84px;
  padding: 0 18px;
  box-sizing: border-box;
}

.login-setup__chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  -webkit-app-region: drag;
}

.login-setup__brand {
  font-weight: 700;
  color: #4b4b4b;
}

.login-setup__window-controls {
  display: flex;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.login-setup__window-button {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.login-setup__minimize,
.login-setup__close {
  width: 18px;
  height: 18px;
  position: relative;
}

.login-setup__minimize::before {
  content: "";
  position: absolute;
  left: 2px;
  right: 2px;
  top: 9px;
  border-top: 2px solid #7a7a7a;
}

.login-setup__close::before,
.login-setup__close::after {
  content: "";
  position: absolute;
  left: 8px;
  top: 0;
  height: 18px;
  border-left: 2px solid #7a7a7a;
}

.login-setup__close::before {
  transform: rotate(45deg);
}

.login-setup__close::after {
  transform: rotate(-45deg);
}

.login-setup__steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #9a9a9a;
  font-weight: 700;
}

.login-setup__step {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 38px;
}

.login-setup__step--active {
  color: #2f80ed;
}

.login-setup__chevron {
  color: #b4b4b4;
  font-size: 24px;
}

.login-setup__panel {
  background: #fff;
  border-radius: 10px;
  padding: 28px 32px;
  min-height: 360px;
}

.login-setup__tabs {
  display: flex;
  align-items: baseline;
  gap: 28px;
}

.login-setup__tab {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 18px;
  font-weight: 700;
  color: #666;
  cursor: pointer;
}

.login-setup__tab--active {
  font-size: 26px;
  color: #111;
}

.login-setup__copy {
  margin: 24px 0 48px;
  color: #555;
}

.login-setup__form {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  max-width: 760px;
}

.login-setup__form label {
  text-align: right;
  font-weight: 700;
}

.login-setup__form input {
  height: 52px;
  border: 0;
  border-radius: 8px;
  background: #eee;
  padding: 0 20px;
  font-size: 16px;
}

.login-setup__code-row {
  display: grid;
  grid-template-columns: 1fr 132px;
  gap: 8px;
}

.login-setup__code-row button {
  border: 1px solid #b8b8b8;
  border-radius: 8px;
  background: #f8f8f8;
  font-weight: 700;
  cursor: pointer;
}

.login-setup__field-note {
  grid-column: 2;
  margin: 2px 0 0;
  color: #666;
}

.login-setup__remember {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 0 130px;
  color: #555;
}

.login-setup__message {
  margin: 14px 0 0 130px;
  color: #c8372d;
}

.login-setup__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login-setup__hint {
  color: #666;
}

.login-setup__primary {
  min-width: 170px;
  height: 48px;
  border: 0;
  border-radius: 24px;
  background: #2f80ed;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.login-setup__primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.login-setup__placeholder-panel {
  min-height: 300px;
  display: grid;
  align-content: center;
  justify-items: center;
  text-align: center;
  color: #333;
}
```

Do not modify `apps/desktop/src/renderer/styles/app.css` for this task. `LoginSetupPage.tsx` imports `./login-setup.css` directly, matching the local feature CSS pattern used elsewhere in the renderer.

- [ ] **Step 3: Add renderer route**

Modify `apps/desktop/src/renderer/app/routes.ts`:

```ts
export type AppRoute =
  | "home"
  | "settings"
  | "installer"
  | "uninstall"
  | "loginSetup"
  | "overlay";

export function resolveRoute(hash = window.location.hash || ""): AppRoute {
  if (hash.includes("login-setup")) {
    return "loginSetup";
  }
  if (hash.includes("home")) {
    return "home";
  }
  if (hash.includes("uninstall")) {
    return "uninstall";
  }
  if (hash.includes("installer")) {
    return "installer";
  }
  return hash.includes("settings") ? "settings" : "overlay";
}
```

Modify `apps/desktop/src/renderer/main.tsx`:

```tsx
import { LoginSetupPage } from "./features/login/LoginSetupPage";

// in render branch:
{route === "home" ? (
  <HomeShell ... />
) : route === "settings" ? (
  <SettingsPage />
) : route === "installer" ? (
  <InstallerPage />
) : route === "uninstall" ? (
  <UninstallPage />
) : route === "loginSetup" ? (
  <LoginSetupPage />
) : (
  <App />
)}
```

- [ ] **Step 4: Wire logout from HomeShell**

Modify the power button in `apps/desktop/src/renderer/app/HomeShell.tsx`:

```tsx
<button
  className="home-power"
  type="button"
  aria-label="退出登录"
  onClick={() => {
    void window.voiceAI.logout();
  }}
>
  <PowerIcon />
</button>
```

Also update `HomeShellText.exitApp` labels to `退出登录`, `登出`, and `Log out`.

- [ ] **Step 5: Verify desktop typecheck**

Run:

```bash
pnpm --filter @voice/desktop typecheck
```

Expected: PASS.

- [ ] **Step 6: Manual visual check**

Run:

```bash
pnpm --filter @voice/desktop dev
```

Open or trigger the login setup window through the bootstrap gate after Task 7. Expected UI: gray wizard shell, top steps, email/LDAP tabs, wide white panel, rounded blue bottom-right button, no text overflow at 947x670 and 900x640.

- [ ] **Step 7: Commit Task 6**

Run:

```bash
git add apps/desktop/src/renderer/features/login/LoginSetupPage.tsx apps/desktop/src/renderer/features/login/login-setup.css apps/desktop/src/renderer/app/routes.ts apps/desktop/src/renderer/main.tsx apps/desktop/src/renderer/app/HomeShell.tsx
git commit -m "feat(auth): add login setup page"
```

---

### Task 7: Bootstrap Strict Gate

**Files:**
- Modify: `apps/desktop/src/main/bootstrap.ts`
- Modify: `apps/desktop/src/main/bootstrap.test.ts`
- Modify: `apps/desktop/src/main/log/logSanitizer.ts`
- Modify: `apps/desktop/src/main/log/logSanitizer.test.ts`

- [ ] **Step 1: Add auth redaction tests**

Append to `apps/desktop/src/main/log/logSanitizer.test.ts`:

```ts
it("redacts auth credentials and verification codes", () => {
  expect(
    formatLogFields({
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      Authorization: "Bearer access-secret",
      password: "plain-password",
      code: "123456",
      email: "user@example.com"
    })
  ).toBe(
    "accessToken=*** refreshToken=*** Authorization=*** password=*** code=*** email=user@example.com"
  );
});
```

- [ ] **Step 2: Update sanitizer pattern**

Modify `apps/desktop/src/main/log/logSanitizer.ts`:

```ts
const SENSITIVE_KEY_PATTERN =
  /^(?:apiKey|api_key|authorization|password|secret|token|accessToken|refreshToken|code|accessCode|AccessCode)$/i;
```

Run:

```bash
pnpm vitest run apps/desktop/src/main/log/logSanitizer.test.ts
```

Expected: PASS.

- [ ] **Step 3: Write bootstrap gate tests**

In `apps/desktop/src/main/bootstrap.test.ts`, add focused tests around an extracted helper. First create the test against a helper that will be implemented in Step 4:

```ts
import { runStartupGate } from "./bootstrap";

it("opens login setup and does not start authenticated runtime when restore is unauthenticated", async () => {
  const calls: string[] = [];

  await runStartupGate({
    authService: {
      restoreSession: async () => ({ status: "unauthenticated" }),
      subscribe: () => () => undefined
    },
    startAuthenticatedRuntime: async () => {
      calls.push("runtime");
    },
    showLoginSetupWindow: (snapshot) => {
      calls.push(`login:${snapshot.status}`);
    }
  });

  expect(calls).toEqual(["login:unauthenticated"]);
});

it("starts authenticated runtime when restore succeeds", async () => {
  const calls: string[] = [];

  await runStartupGate({
    authService: {
      restoreSession: async () => ({
        status: "authenticated",
        user: { id: "user-1", displayName: "Alex", authType: "email_code" }
      }),
      subscribe: () => () => undefined
    },
    startAuthenticatedRuntime: async () => {
      calls.push("runtime");
    },
    showLoginSetupWindow: (snapshot) => {
      calls.push(`login:${snapshot.status}`);
    }
  });

  expect(calls).toEqual(["runtime"]);
});

it("returns to login when auth service broadcasts unauthenticated after runtime started", async () => {
  let listener:
    | ((snapshot: { status: "authenticated" | "unauthenticated" }) => void)
    | undefined;
  const calls: string[] = [];

  await runStartupGate({
    authService: {
      restoreSession: async () => ({ status: "authenticated" }),
      subscribe: (callback) => {
        listener = callback;
        return () => undefined;
      }
    },
    startAuthenticatedRuntime: async () => {
      calls.push("runtime");
    },
    showLoginSetupWindow: (snapshot) => {
      calls.push(`login:${snapshot.status}`);
    },
    stopAuthenticatedRuntime: () => {
      calls.push("stop-runtime");
    }
  });
  listener?.({ status: "unauthenticated" });

  expect(calls).toEqual(["runtime", "stop-runtime", "login:unauthenticated"]);
});
```

- [ ] **Step 4: Extract and implement `runStartupGate` helper**

Modify `apps/desktop/src/main/bootstrap.ts` near helper exports:

```ts
import type { AuthService } from "./auth/authService";
import type { AuthSessionSnapshot } from "./auth/authTypes";

export async function runStartupGate(options: {
  authService: Pick<AuthService, "restoreSession" | "subscribe">;
  startAuthenticatedRuntime(): Promise<void> | void;
  stopAuthenticatedRuntime?(): Promise<void> | void;
  showLoginSetupWindow(snapshot: AuthSessionSnapshot): void;
}): Promise<void> {
  let runtimeStarted = false;
  const startRuntime = async (): Promise<void> => {
    if (runtimeStarted) {
      return;
    }
    runtimeStarted = true;
    await options.startAuthenticatedRuntime();
  };
  const stopRuntime = async (): Promise<void> => {
    if (!runtimeStarted) {
      return;
    }
    runtimeStarted = false;
    await options.stopAuthenticatedRuntime?.();
  };

  options.authService.subscribe((snapshot) => {
    if (snapshot.status === "authenticated") {
      void startRuntime();
      return;
    }
    void stopRuntime().then(() => options.showLoginSetupWindow(snapshot));
  });

  const snapshot = await options.authService.restoreSession();
  if (snapshot.status === "authenticated") {
    await startRuntime();
    return;
  }
  options.showLoginSetupWindow(snapshot);
}
```

- [ ] **Step 5: Wire AuthService into bootstrap**

Modify imports in `apps/desktop/src/main/bootstrap.ts`:

```ts
import { createAuthHttpClient } from "./auth/authHttpClient";
import { createAuthService } from "./auth/authService";
import { createAuthSessionStore } from "./auth/authSessionStore";
import { encryptLdapPassword } from "./auth/ldapCrypto";
import { createLoginSetupWindow } from "./windows/createLoginSetupWindow";
```

After `storeAdapter`, `configStore`, `initialSettings`, and `installationId` exist, create auth dependencies:

```ts
const resolveAuthBaseUrl = (): string =>
  firstConfiguredValue(
    process.env.AOA_BACKEND_BASE_URL,
    mainAppConfig.backendBaseUrl,
    configStore.get().backend.baseUrl
  ) ?? configStore.get().backend.baseUrl;

const authService = createAuthService({
  client: createAuthHttpClient({ baseUrl: resolveAuthBaseUrl() }),
  sessionStore: createAuthSessionStore({
    adapter: storeAdapter,
    safeStorage
  }),
  getDeviceContext: () => ({
    installationId,
    deviceName: os.hostname(),
    platform: "windows",
    appVersion: app.getVersion(),
    locale: configStore.get().ui.language
  }),
  encryptLdapPassword
});
```

Pass `authService` into `registerIpcRoutes`.

Create login setup window helper inside `bootstrap()`:

```ts
let loginSetupWindow: BrowserWindow | undefined;

function openLoginSetupWindow(snapshot: AuthSessionSnapshot): void {
  if (loginSetupWindow && !loginSetupWindow.isDestroyed()) {
    loginSetupWindow.show();
    loginSetupWindow.focus();
    loginSetupWindow.webContents.send("voice:auth:session-changed", snapshot);
    return;
  }
  loginSetupWindow = createLoginSetupWindow();
  loginSetupWindow.once("ready-to-show", () => {
    loginSetupWindow?.show();
    loginSetupWindow?.focus();
    loginSetupWindow?.webContents.send("voice:auth:session-changed", snapshot);
  });
  loginSetupWindow.on("closed", () => {
    loginSetupWindow = undefined;
  });
}
```

Move the existing business runtime setup from the current overlay creation point into an inner function named `startAuthenticatedRuntime()`. The moved block starts at `const overlayWindow = createOverlayWindow({ theme: initialSettings.ui.theme });` and includes these current responsibilities:

- create and follow the overlay window
- subscribe transcription events
- configure shortcut manager and shortcut capture
- register `voice:open-home-section-request`
- register `voice:open-microphone-help-request`
- register `voice:report-recording-state`
- register `voice:set-shortcut-capture-active`
- run `updateService.checkForUpdates()`
- create tray
- define and use `openHomeWindow()`
- honor `shouldOpenHomeOnLaunch(process.argv)`
- show shortcut conflicts

Keep `registerIpcRoutes(...)` outside `startAuthenticatedRuntime()` so the login window can use auth IPC before the authenticated runtime starts.

```ts
let stopAuthenticatedRuntime: (() => void) | undefined;

async function startAuthenticatedRuntime(): Promise<void> {
  if (stopAuthenticatedRuntime) {
    return;
  }
  if (loginSetupWindow && !loginSetupWindow.isDestroyed()) {
    loginSetupWindow.close();
  }

  // Mechanically move the current authenticated-runtime block into this function.
  // Move the block that starts with:
  //   const overlayWindow = createOverlayWindow({ theme: initialSettings.ui.theme });
  // and ends with:
  //   console.log("[bootstrap] 啟動完成");
  // The moved code must remain in the same relative order.

  stopAuthenticatedRuntime = () => {
    cancelPendingOverlayHide();
    void audioDuckingService.restore();
    overlayWindowFollower.stop();
    shortcutCaptureSession.stop();
    escCancelController.dispose();
    shortcutManager.dispose();
    if (!overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
    if (homeWindow && !homeWindow.isDestroyed()) {
      homeWindow.close();
    }
    tray.destroy();
  };
}
```

At the previous point where overlay/tray/shortcuts were created immediately, call:

```ts
await runStartupGate({
  authService,
  startAuthenticatedRuntime,
  stopAuthenticatedRuntime: () => {
    stopAuthenticatedRuntime?.();
    stopAuthenticatedRuntime = undefined;
  },
  showLoginSetupWindow: openLoginSetupWindow
});
```

- [ ] **Step 6: Broadcast auth session changes to windows**

Inside `bootstrap()` after `authService` exists:

```ts
authService.subscribe((snapshot) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send("voice:auth:session-changed", snapshot);
    }
  }
});
```

Keep this subscription separate from `runStartupGate` so all windows receive the current auth snapshot.

- [ ] **Step 7: Verify bootstrap and sanitizer tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/bootstrap.test.ts apps/desktop/src/main/log/logSanitizer.test.ts
```

Expected: PASS for new auth gate and sanitizer coverage.

- [ ] **Step 8: Verify desktop typecheck**

Run:

```bash
pnpm --filter @voice/desktop typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit Task 7**

Run:

```bash
git add apps/desktop/src/main/bootstrap.ts apps/desktop/src/main/bootstrap.test.ts apps/desktop/src/main/log/logSanitizer.ts apps/desktop/src/main/log/logSanitizer.test.ts
git commit -m "feat(auth): gate app startup"
```

---

### Task 8: Final Verification And Manual QA

**Files:**
- All files modified in Tasks 1-7.

- [ ] **Step 1: Run focused auth tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/auth/authHttpClient.test.ts apps/desktop/src/main/auth/authSessionStore.test.ts apps/desktop/src/main/auth/ldapCrypto.test.ts apps/desktop/src/main/auth/authService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run IPC, window, bootstrap, and sanitizer tests**

Run:

```bash
pnpm vitest run apps/desktop/src/main/ipc/ipcRoutes.test.ts apps/desktop/src/main/windows/createLoginSetupWindow.test.ts apps/desktop/src/main/bootstrap.test.ts apps/desktop/src/main/log/logSanitizer.test.ts
```

Expected: PASS for touched test suites. If unrelated pre-existing tests fail, capture the failing test names and confirm they do not come from auth changes before proceeding.

- [ ] **Step 3: Run desktop typecheck**

Run:

```bash
pnpm --filter @voice/desktop typecheck
```

Expected: PASS.

- [ ] **Step 4: Run full test suite if focused tests pass**

Run:

```bash
pnpm test
```

Expected: PASS, or only documented pre-existing failures unrelated to auth.

- [ ] **Step 5: Manual app QA**

Run:

```bash
pnpm --filter @voice/desktop dev
```

Manual checks:

- With no stored session, only the login setup window opens.
- Home window, overlay, tray actions, and global shortcuts do not start before login.
- Email login calls `voice:auth:send-email-code` and `voice:auth:login-email-code`; after success, the login setup window closes and home opens.
- LDAP login calls `voice:auth:login-ldap`; password is never printed in terminal logs.
- Restart with a valid stored refresh token opens the main app without showing login.
- Restart with network failure during refresh shows the login setup window and network message.
- Clicking logout from home closes authenticated runtime and returns to login setup.
- Login setup UI fits at `947x670` and `900x640` without overlapping text.

- [ ] **Step 6: Inspect diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: changed files match this plan, and `git diff --check` emits no whitespace errors.

- [ ] **Step 7: Final commit if Task 8 produced fixes**

If Task 8 required corrections, commit them:

```bash
git add <fixed-files>
git commit -m "fix(auth): polish login gate"
```

If Task 8 produced no code changes, no commit is needed.

---

## Spec Coverage Checklist

- Strict startup gate: Task 7.
- Email code login: Tasks 1, 3, 4, 6.
- LDAP login with main-process encryption: Tasks 1, 2, 3, 4, 6.
- Official backend auth endpoints: Task 1.
- Refresh token encrypted persistence: Tasks 2 and 3.
- Offline restore stays at login: Task 3 and Task 7.
- Login wizard shell: Tasks 5 and 6.
- Installed app process boundary: Task 7.
- Token does not leave main process: Tasks 3 and 4.
- Logout and return to login: Tasks 3, 6, and 7.
- Main-process tests, no frontend tests: Tasks 1-4, 5, 7, 8.

## Notes For Execution

- The working tree currently has many unrelated changes. Stage only files listed in each task.
- Run the focused tests after each task before committing.
- Do not add frontend tests unless the user explicitly asks.
- Keep CodeGraph in mind for structural lookups; do not grep for symbols when CodeGraph can answer.
