import {
  encryptLdapPassword as defaultEncryptLdapPassword,
  type EncryptedLdapPassword,
} from "./ldapCrypto";
import type { AuthSessionStore } from "./authSessionStore";
import {
  AuthHttpError,
  type AuthDeviceContext,
  type AuthHttpClient,
  type AuthSessionSnapshot,
  type AuthTokenResponse,
  type EmailCodeLoginInput,
  type LdapLoginInput,
  type SendEmailCodeInput,
  type SendEmailCodeResult,
} from "./authTypes";

const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;
const SESSION_EXPIRED_MESSAGE = "Session expired";
const NETWORK_UNAVAILABLE_MESSAGE = "Network unavailable";
const DEVELOPMENT_ACCESS_TOKEN = "dev-access-token";
const DEVELOPMENT_REFRESH_TOKEN = "dev-refresh-token";
const DEVELOPMENT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365;

type AuthSessionListener = (snapshot: AuthSessionSnapshot) => void;

interface RuntimeAuthSession {
  user: AuthTokenResponse["user"];
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
  refreshExpiresAtMs: number;
  persistRefreshToken: boolean;
  featureFlags?: Record<string, boolean>;
}

export interface AuthService {
  getSessionSnapshot(): AuthSessionSnapshot;
  restoreSession(): Promise<AuthSessionSnapshot>;
  sendEmailCode(input: SendEmailCodeInput): Promise<SendEmailCodeResult>;
  loginWithEmailCode(input: EmailCodeLoginInput): Promise<AuthSessionSnapshot>;
  loginWithLdap(input: LdapLoginInput): Promise<AuthSessionSnapshot>;
  logout(): Promise<AuthSessionSnapshot>;
  getAccessTokenForRequest(): Promise<string>;
  clearSession(message?: string): AuthSessionSnapshot;
  subscribe(listener: AuthSessionListener): () => void;
}

export interface CreateAuthServiceOptions {
  client: AuthHttpClient;
  store: AuthSessionStore;
  device: AuthDeviceContext;
  allowDevelopmentBypass?: boolean;
  now?: () => number;
  encryptLdapPassword?: typeof defaultEncryptLdapPassword;
}

export function createAuthService(
  options: CreateAuthServiceOptions,
): AuthService {
  const now = options.now ?? Date.now;
  const encryptLdapPassword =
    options.encryptLdapPassword ?? defaultEncryptLdapPassword;
  const listeners = new Set<AuthSessionListener>();
  const staleRefreshErrors = new WeakSet<AuthHttpError>();

  let runtimeSession: RuntimeAuthSession | undefined;
  let refreshInFlight: Promise<RuntimeAuthSession> | undefined;
  let authEpoch = 0;

  const notify = (snapshot: AuthSessionSnapshot): void => {
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("[auth] session listener failed", error);
      }
    }
  };

  const bumpAuthEpoch = (): number => {
    authEpoch += 1;
    refreshInFlight = undefined;
    return authEpoch;
  };

  const createAuthenticatedSnapshot = (
    session: RuntimeAuthSession,
  ): AuthSessionSnapshot => {
    const snapshot: AuthSessionSnapshot = {
      status: "authenticated",
      user: copyAuthUser(session.user),
    };

    if (session.featureFlags !== undefined) {
      snapshot.featureFlags = { ...session.featureFlags };
    }

    return snapshot;
  };

  const createUnauthenticatedSnapshot = (
    message?: string,
  ): AuthSessionSnapshot => {
    const snapshot: AuthSessionSnapshot = { status: "unauthenticated" };
    if (message !== undefined) {
      snapshot.message = message;
    }
    return snapshot;
  };

  const createExpiredSnapshot = (): AuthSessionSnapshot => ({
    status: "expired",
    message: SESSION_EXPIRED_MESSAGE,
  });

  const createSessionExpiredError = (): AuthHttpError => {
    const error = new AuthHttpError(
      401,
      "session_expired",
      SESSION_EXPIRED_MESSAGE,
    );
    staleRefreshErrors.add(error);
    return error;
  };

  const buildRuntimeSession = (
    response: AuthTokenResponse,
    persistRefreshToken: boolean,
  ): RuntimeAuthSession => {
    const issuedAtMs = now();
    return {
      user: copyAuthUser(response.user),
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAtMs: issuedAtMs + response.expiresInSeconds * 1000,
      refreshExpiresAtMs: issuedAtMs + response.refreshExpiresInSeconds * 1000,
      persistRefreshToken,
      ...(response.featureFlags === undefined
        ? {}
        : { featureFlags: { ...response.featureFlags } }),
    };
  };

  const createDevelopmentTokenResponse = (
    input: EmailCodeLoginInput | LdapLoginInput,
  ): AuthTokenResponse => {
    const authType = "account" in input ? "ldap" : "email_code";
    const fallbackEmail = "dev@example.test";
    const trimmedEmail =
      "email" in input && input.email.trim().length > 0
        ? input.email.trim()
        : fallbackEmail;
    return {
      user: {
        id: "dev-user",
        displayName: "Developer",
        ...(authType === "email_code"
          ? { email: trimmedEmail }
          : { email: fallbackEmail }),
        authType,
      },
      accessToken: DEVELOPMENT_ACCESS_TOKEN,
      refreshToken: DEVELOPMENT_REFRESH_TOKEN,
      expiresInSeconds: DEVELOPMENT_TOKEN_TTL_SECONDS,
      refreshExpiresInSeconds: DEVELOPMENT_TOKEN_TTL_SECONDS,
      featureFlags: {
        developmentAuthBypass: true,
      },
    };
  };

  const commitRuntimeSession = (
    nextSession: RuntimeAuthSession,
  ): AuthSessionSnapshot => {
    runtimeSession = nextSession;
    const snapshot = createAuthenticatedSnapshot(nextSession);
    notify(snapshot);
    return snapshot;
  };

  const applyTokenResponse = (
    response: AuthTokenResponse,
    persistRefreshToken: boolean,
    expectedEpoch?: number,
  ): AuthSessionSnapshot => {
    if (expectedEpoch !== undefined && authEpoch !== expectedEpoch) {
      throw createSessionExpiredError();
    }

    const nextSession = buildRuntimeSession(response, persistRefreshToken);
    options.store.write(response, { persistRefreshToken });
    return commitRuntimeSession(nextSession);
  };

  const applyRestoreTokenResponse = (
    response: AuthTokenResponse,
    guard: { epoch: number; refreshToken: string },
  ): AuthSessionSnapshot => {
    const storedSession = options.store.read();
    if (
      authEpoch !== guard.epoch ||
      storedSession?.refreshToken !== guard.refreshToken
    ) {
      throw createSessionExpiredError();
    }

    const nextSession = buildRuntimeSession(response, true);
    options.store.write(response, { persistRefreshToken: true });

    if (authEpoch !== guard.epoch) {
      throw createSessionExpiredError();
    }

    return commitRuntimeSession(nextSession);
  };

  const applyRefreshTokenResponse = (
    response: AuthTokenResponse,
    guard: { epoch: number; refreshToken: string },
  ): RuntimeAuthSession => {
    const currentSession = runtimeSession;
    if (
      authEpoch !== guard.epoch ||
      !currentSession ||
      currentSession.refreshToken !== guard.refreshToken
    ) {
      throw createSessionExpiredError();
    }

    const nextSession = buildRuntimeSession(
      response,
      currentSession.persistRefreshToken,
    );
    options.store.write(response, {
      persistRefreshToken: currentSession.persistRefreshToken,
    });
    commitRuntimeSession(nextSession);
    return nextSession;
  };

  const clearExpiredSession = (): AuthSessionSnapshot => {
    bumpAuthEpoch();
    runtimeSession = undefined;
    options.store.clear();
    const snapshot = createExpiredSnapshot();
    notify(snapshot);
    return snapshot;
  };

  const refreshRuntimeSession = (
    session: RuntimeAuthSession,
  ): Promise<RuntimeAuthSession> => {
    if (session.refreshExpiresAtMs <= now()) {
      clearExpiredSession();
      throw createSessionExpiredError();
    }

    if (!refreshInFlight) {
      const guard = {
        epoch: authEpoch,
        refreshToken: session.refreshToken,
      };
      const inFlight = options.client
        .refresh({
          refreshToken: session.refreshToken,
          device: options.device,
        })
        .then((response) => applyRefreshTokenResponse(response, guard))
        .catch((error) => {
          const currentSession = runtimeSession;
          if (
            authEpoch === guard.epoch &&
            currentSession?.refreshToken === guard.refreshToken &&
            !isNetworkError(error)
          ) {
            clearExpiredSession();
          }
          throw error;
        })
        .finally(() => {
          if (refreshInFlight === inFlight) {
            refreshInFlight = undefined;
          }
        });
      refreshInFlight = inFlight;
    }

    return refreshInFlight;
  };

  return {
    getSessionSnapshot: () =>
      runtimeSession
        ? createAuthenticatedSnapshot(runtimeSession)
        : createUnauthenticatedSnapshot(),

    restoreSession: async () => {
      const storedSession = options.store.read();
      if (!storedSession) {
        runtimeSession = undefined;
        refreshInFlight = undefined;
        if (options.allowDevelopmentBypass) {
          runtimeSession = buildRuntimeSession(
            createDevelopmentTokenResponse({
              email: "dev@example.test",
              code: "dev",
              acceptedLicense: true,
            }),
            false,
          );
          return createAuthenticatedSnapshot(runtimeSession);
        }
        return createUnauthenticatedSnapshot();
      }

      const refreshExpiresAtMs = Date.parse(storedSession.refreshExpiresAt);
      if (!Number.isFinite(refreshExpiresAtMs) || refreshExpiresAtMs <= now()) {
        return clearExpiredSession();
      }

      try {
        const restoreGuard = {
          epoch: authEpoch,
          refreshToken: storedSession.refreshToken,
        };
        const response = await options.client.refresh({
          refreshToken: storedSession.refreshToken,
          device: options.device,
        });
        return applyRestoreTokenResponse(response, restoreGuard);
      } catch (error) {
        if (error instanceof AuthHttpError && staleRefreshErrors.has(error)) {
          throw error;
        }
        runtimeSession = undefined;
        refreshInFlight = undefined;
        if (isNetworkError(error)) {
          return {
            status: "offline",
            user: copyAuthUser(storedSession.user),
            message: NETWORK_UNAVAILABLE_MESSAGE,
          };
        }

        return clearExpiredSession();
      }
    },

    sendEmailCode: (input) =>
      options.client.sendEmailCode({
        ...input,
        device: options.device,
      }),

    loginWithEmailCode: async (input) => {
      const loginEpoch = bumpAuthEpoch();
      if (options.allowDevelopmentBypass) {
        return commitRuntimeSession(
          buildRuntimeSession(createDevelopmentTokenResponse(input), false),
        );
      }

      const response = await options.client.loginWithEmailCode({
        ...input,
        device: options.device,
      });
      return applyTokenResponse(response, true, loginEpoch);
    },

    loginWithLdap: async (input) => {
      const loginEpoch = bumpAuthEpoch();
      if (options.allowDevelopmentBypass) {
        return commitRuntimeSession(
          buildRuntimeSession(createDevelopmentTokenResponse(input), false),
        );
      }

      const publicKey = await options.client.getLdapPublicKey();
      const encryptedPassword: EncryptedLdapPassword =
        await encryptLdapPassword({
          password: input.password,
          publicKeyPem: publicKey.publicKeyPem,
          keyId: publicKey.keyId,
        });
      const response = await options.client.loginWithLdap({
        account: input.account,
        passwordCipher: encryptedPassword.passwordCipher,
        keyId: encryptedPassword.keyId,
        nonce: encryptedPassword.nonce,
        timestamp: encryptedPassword.timestamp,
        acceptedLicense: input.acceptedLicense,
        device: options.device,
      });

      return applyTokenResponse(response, true, loginEpoch);
    },

    logout: async () => {
      const sessionToLogout = runtimeSession;
      bumpAuthEpoch();
      runtimeSession = undefined;
      options.store.clear();
      const snapshot = createUnauthenticatedSnapshot();
      notify(snapshot);

      if (sessionToLogout) {
        try {
          await options.client.logout({
            accessToken: sessionToLogout.accessToken,
            refreshToken: sessionToLogout.refreshToken,
            device: options.device,
          });
        } catch {
          // Local logout must complete even when backend logout fails.
        }
      }

      return snapshot;
    },

    getAccessTokenForRequest: async () => {
      const session = runtimeSession;
      if (!session) {
        throw new AuthHttpError(401, "session_expired", "Not authenticated");
      }

      if (session.expiresAtMs > now() + ACCESS_TOKEN_REFRESH_SKEW_MS) {
        return session.accessToken;
      }

      const refreshedSession = await refreshRuntimeSession(session);
      return refreshedSession.accessToken;
    },

    clearSession: (message) => {
      bumpAuthEpoch();
      runtimeSession = undefined;
      options.store.clear();
      const snapshot = createUnauthenticatedSnapshot(message);
      notify(snapshot);
      return snapshot;
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function isNetworkError(error: unknown): boolean {
  return error instanceof AuthHttpError && error.code === "network_error";
}

function copyAuthUser(
  user: AuthTokenResponse["user"],
): AuthTokenResponse["user"] {
  return {
    id: user.id,
    displayName: user.displayName,
    ...(user.email === undefined ? {} : { email: user.email }),
    authType: user.authType,
  };
}
