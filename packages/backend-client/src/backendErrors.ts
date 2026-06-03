import type { BackendErrorPayload, ClientFacingError } from "./types";

const backendUnavailableError: ClientFacingError = {
  code: "backend_unavailable",
  title: "服务暂时不可用",
  message: "服务暂时不可用，请稍后再试"
};

const errorMap: Record<string, ClientFacingError> = {
  CLIENT_BLOCKED: {
    code: "client_blocked",
    title: "客户端暂不可用",
    message: "当前客户端暂不可用"
  },
  ANONYMOUS_QUOTA_EXCEEDED: {
    code: "quota_exceeded",
    title: "额度已用完",
    message: "当前版本试用额度已用完"
  },
  RATE_LIMITED: {
    code: "rate_limited",
    title: "请求过快",
    message: "请求过快，请稍后再试"
  },
  AI_SESSION_EXPIRED: {
    code: "ai_session_expired",
    title: "语音会话已过期",
    message: "语音会话已过期，请重试"
  },
  BACKEND_UNAVAILABLE: backendUnavailableError,
  NETWORK_ERROR: {
    code: "network_error",
    title: "网络连接失败",
    message: "网络连接失败"
  }
};

export function mapBackendError(error: BackendErrorPayload): ClientFacingError {
  return errorMap[error.code] ?? backendUnavailableError;
}
