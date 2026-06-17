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
