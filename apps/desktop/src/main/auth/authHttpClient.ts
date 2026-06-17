import {
  AuthHttpError,
  type AuthErrorCode,
  type AuthHttpClient,
  type AuthType,
  type AuthTokenResponse,
  type LdapPublicKeyResponse,
  type SendEmailCodeResult
} from "./authTypes";

export interface CreateAuthHttpClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

type HttpMethod = "GET" | "POST";

const BACKEND_ERROR_CODES = new Set<AuthErrorCode>([
  "invalid_email",
  "invalid_code",
  "invalid_credentials",
  "account_disabled",
  "rate_limited",
  "session_expired",
  "key_expired",
  "backend_unavailable"
]);

export function createAuthHttpClient(
  options: CreateAuthHttpClientOptions
): AuthHttpClient {
  const baseUrl = normalizeAuthBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? fetch;

  return {
    sendEmailCode(input): Promise<SendEmailCodeResult> {
      return requestJson(fetchImpl, baseUrl, "email-code/send", {
        method: "POST",
        body: { email: input.email, ...input.device },
        normalize: normalizeSendEmailCodeResult
      });
    },

    loginWithEmailCode(input): Promise<AuthTokenResponse> {
      return requestJson(fetchImpl, baseUrl, "login/email-code", {
        method: "POST",
        body: {
          email: input.email,
          code: input.code,
          rememberMe: input.rememberMe,
          ...input.device
        },
        normalize: normalizeAuthTokenResponse
      });
    },

    getLdapPublicKey(): Promise<LdapPublicKeyResponse> {
      return requestJson(fetchImpl, baseUrl, "crypto/public-key", {
        method: "GET",
        normalize: normalizeLdapPublicKeyResponse
      });
    },

    loginWithLdap(input): Promise<AuthTokenResponse> {
      return requestJson(fetchImpl, baseUrl, "login/ldap", {
        method: "POST",
        body: {
          account: input.account,
          passwordCipher: input.passwordCipher,
          keyId: input.keyId,
          nonce: input.nonce,
          timestamp: input.timestamp,
          rememberMe: input.rememberMe,
          ...input.device
        },
        normalize: normalizeAuthTokenResponse
      });
    },

    refresh(input): Promise<AuthTokenResponse> {
      return requestJson(fetchImpl, baseUrl, "refresh", {
        method: "POST",
        body: { refreshToken: input.refreshToken, ...input.device },
        normalize: normalizeAuthTokenResponse
      });
    },

    logout(input): Promise<{ ok: true }> {
      return requestJson(fetchImpl, baseUrl, "logout", {
        method: "POST",
        accessToken: input.accessToken,
        body: { refreshToken: input.refreshToken, ...input.device },
        normalize: normalizeLogoutResponse,
        allowEmptySuccess: true
      });
    }
  };
}

function normalizeAuthBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl.trim());
  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (pathSegments[pathSegments.length - 1] !== "aoa_api") {
    pathSegments.push("aoa_api");
  }
  url.pathname = `/${pathSegments.join("/")}`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function buildAuthUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}/auth/${endpoint.replace(/^\/+/, "")}`;
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  baseUrl: string,
  endpoint: string,
  options: {
    method: HttpMethod;
    body?: unknown;
    accessToken?: string | undefined;
    normalize(input: unknown): T;
    allowEmptySuccess?: boolean | undefined;
  }
): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/json"
  };
  const init: RequestInit = {
    method: options.method,
    headers
  };

  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetchImpl(buildAuthUrl(baseUrl, endpoint), init);
  } catch {
    throw new AuthHttpError(0, "network_error", "Network request failed");
  }

  const body = await readJsonBody(response, options.allowEmptySuccess === true);
  if (!response.ok) {
    throw createHttpError(response.status, body);
  }

  return options.normalize(body);
}

async function readJsonBody(
  response: Response,
  allowEmpty = false
): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    if (allowEmpty) {
      return undefined;
    }
    throw new AuthHttpError(
      response.status,
      "backend_unavailable",
      "Backend returned empty JSON"
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AuthHttpError(
      response.status,
      "backend_unavailable",
      "Backend returned invalid JSON"
    );
  }
}

function normalizeSendEmailCodeResult(body: unknown): SendEmailCodeResult {
  const payload = readPayloadRecord(body);
  return {
    cooldownSeconds: readRequiredNumber(payload.cooldownSeconds)
  };
}

function normalizeLdapPublicKeyResponse(body: unknown): LdapPublicKeyResponse {
  const payload = readPayloadRecord(body);
  return {
    keyId: readRequiredString(payload.keyId),
    alg: readLdapPublicKeyAlg(payload.alg),
    publicKeyPem: readRequiredString(payload.publicKeyPem),
    expiresAt: readRequiredString(payload.expiresAt)
  };
}

function normalizeAuthTokenResponse(body: unknown): AuthTokenResponse {
  const payload = readPayloadRecord(body);
  const featureFlags = readFeatureFlags(payload.featureFlags);
  return {
    user: normalizeAuthUser(payload.user),
    accessToken: readRequiredString(payload.accessToken),
    refreshToken: readRequiredString(payload.refreshToken),
    expiresInSeconds: readRequiredNumber(payload.expiresInSeconds),
    refreshExpiresInSeconds: readRequiredNumber(payload.refreshExpiresInSeconds),
    ...(featureFlags === undefined ? {} : { featureFlags })
  };
}

function normalizeLogoutResponse(): { ok: true } {
  return { ok: true };
}

function normalizeAuthUser(input: unknown): AuthTokenResponse["user"] {
  const payload = readPayloadRecord(input);
  const email = readOptionalString(payload.email);
  return {
    id: readRequiredString(payload.id),
    displayName: readRequiredString(payload.displayName),
    ...(email === undefined ? {} : { email }),
    authType: readAuthType(payload.authType)
  };
}

function readPayloadRecord(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) {
    throw new AuthHttpError(
      200,
      "backend_unavailable",
      "Backend returned invalid payload"
    );
  }
  return input;
}

function readRequiredString(input: unknown): string {
  if (typeof input !== "string") {
    throw new AuthHttpError(
      200,
      "backend_unavailable",
      "Backend returned invalid payload"
    );
  }
  return input;
}

function readOptionalString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function readRequiredNumber(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    throw new AuthHttpError(
      200,
      "backend_unavailable",
      "Backend returned invalid payload"
    );
  }
  return input;
}

function readAuthType(input: unknown): AuthType {
  if (input === "email_code" || input === "ldap") {
    return input;
  }
  throw new AuthHttpError(
    200,
    "backend_unavailable",
    "Backend returned invalid payload"
  );
}

function readLdapPublicKeyAlg(input: unknown): LdapPublicKeyResponse["alg"] {
  if (input === "RSA-OAEP-256" || input === "RSA-OAEP") {
    return input;
  }
  throw new AuthHttpError(
    200,
    "backend_unavailable",
    "Backend returned invalid payload"
  );
}

function readFeatureFlags(input: unknown): Record<string, boolean> | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!isRecord(input)) {
    throw new AuthHttpError(
      200,
      "backend_unavailable",
      "Backend returned invalid payload"
    );
  }

  const featureFlags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "boolean") {
      throw new AuthHttpError(
        200,
        "backend_unavailable",
        "Backend returned invalid payload"
      );
    }
    featureFlags[key] = value;
  }
  return featureFlags;
}

function createHttpError(status: number, body: unknown): AuthHttpError {
  const payload = readErrorPayload(body);
  return new AuthHttpError(status, payload.code, payload.message);
}

function readErrorPayload(body: unknown): {
  code: AuthErrorCode;
  message: string;
} {
  if (!isRecord(body)) {
    return { code: "backend_unavailable", message: "Authentication request failed" };
  }

  const code = readAuthErrorCode(body.code);
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : "Authentication request failed";
  return { code, message };
}

function readAuthErrorCode(input: unknown): AuthErrorCode {
  if (typeof input === "string" && BACKEND_ERROR_CODES.has(input as AuthErrorCode)) {
    return input as AuthErrorCode;
  }
  return "backend_unavailable";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
