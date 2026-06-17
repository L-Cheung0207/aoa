import type { ConfigStorageAdapter } from "../config/configStore";
import type { AuthTokenResponse, AuthUserSnapshot } from "./authTypes";

const AUTH_SESSION_STORAGE_KEY = "auth.session";

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(encrypted: Buffer): string;
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
  write(
    response: AuthTokenResponse,
    options: { persistRefreshToken: boolean }
  ): void;
  read(): StoredAuthSession | undefined;
  clear(): void;
}

interface CreateAuthSessionStoreOptions {
  adapter: ConfigStorageAdapter;
  safeStorage: SafeStorageLike;
  now?: () => number;
}

interface PersistedAuthSessionV1 {
  v: 1;
  user: AuthUserSnapshot;
  refreshToken: string;
  refreshTokenProtection: "safeStorage";
  expiresAt: string;
  refreshExpiresAt: string;
  featureFlags?: Record<string, boolean>;
}

export function createAuthSessionStore(
  options: CreateAuthSessionStoreOptions
): AuthSessionStore {
  const now = options.now ?? Date.now;

  const isPersistentSessionAvailable = (): boolean =>
    options.safeStorage.isEncryptionAvailable();

  return {
    isPersistentSessionAvailable,
    write: (response, writeOptions) => {
      if (!writeOptions.persistRefreshToken) {
        options.adapter.delete(AUTH_SESSION_STORAGE_KEY);
        return;
      }

      if (!isPersistentSessionAvailable()) {
        options.adapter.delete(AUTH_SESSION_STORAGE_KEY);
        return;
      }

      options.adapter.delete(AUTH_SESSION_STORAGE_KEY);

      const issuedAtMs = now();
      const persisted: PersistedAuthSessionV1 = {
        v: 1,
        user: response.user,
        refreshToken: options.safeStorage
          .encryptString(response.refreshToken)
          .toString("base64"),
        refreshTokenProtection: "safeStorage",
        expiresAt: new Date(
          issuedAtMs + response.expiresInSeconds * 1000
        ).toISOString(),
        refreshExpiresAt: new Date(
          issuedAtMs + response.refreshExpiresInSeconds * 1000
        ).toISOString()
      };

      if (response.featureFlags !== undefined) {
        persisted.featureFlags = response.featureFlags;
      }

      options.adapter.set(AUTH_SESSION_STORAGE_KEY, persisted);
    },
    read: () => {
      const stored = options.adapter.get(AUTH_SESSION_STORAGE_KEY);
      if (!isPersistedAuthSessionV1(stored)) {
        return undefined;
      }
      if (!isPersistentSessionAvailable()) {
        return undefined;
      }

      try {
        const refreshToken = options.safeStorage.decryptString(
          Buffer.from(stored.refreshToken, "base64")
        );
        const featureFlags =
          stored.featureFlags === undefined
            ? undefined
            : copyFeatureFlags(stored.featureFlags);
        const session: StoredAuthSession = {
          user: copyAuthUserSnapshot(stored.user),
          refreshToken,
          expiresAt: stored.expiresAt,
          refreshExpiresAt: stored.refreshExpiresAt
        };

        if (featureFlags !== undefined) {
          session.featureFlags = featureFlags;
        }

        return session;
      } catch {
        return undefined;
      }
    },
    clear: () => {
      options.adapter.delete(AUTH_SESSION_STORAGE_KEY);
    }
  };
}

function isPersistedAuthSessionV1(
  value: unknown
): value is PersistedAuthSessionV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PersistedAuthSessionV1>;
  return (
    candidate.v === 1 &&
    isAuthUserSnapshot(candidate.user) &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshTokenProtection === "safeStorage" &&
    isValidIsoDateString(candidate.expiresAt) &&
    isValidIsoDateString(candidate.refreshExpiresAt) &&
    (candidate.featureFlags === undefined ||
      isFeatureFlags(candidate.featureFlags))
  );
}

function isAuthUserSnapshot(value: unknown): value is AuthUserSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AuthUserSnapshot>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.displayName === "string" &&
    (candidate.email === undefined || typeof candidate.email === "string") &&
    (candidate.authType === "email_code" || candidate.authType === "ldap")
  );
}

function isFeatureFlags(value: unknown): value is Record<string, boolean> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((flag) => typeof flag === "boolean");
}

function isValidIsoDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function copyAuthUserSnapshot(user: AuthUserSnapshot): AuthUserSnapshot {
  const copied: AuthUserSnapshot = {
    id: user.id,
    displayName: user.displayName,
    authType: user.authType
  };

  if (user.email !== undefined) {
    copied.email = user.email;
  }

  return copied;
}

function copyFeatureFlags(
  featureFlags: Record<string, boolean>
): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(featureFlags).filter(
      ([, enabled]) => enabled === true || enabled === false
    )
  );
}
