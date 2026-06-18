export type BackendJsonMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type BackendJsonFetch = (
  input: string,
  init: RequestInit
) => Promise<Response>;

export type BackendJsonErrorCode =
  | "network_error"
  | "empty_json"
  | "invalid_json"
  | "http_error";

export class BackendJsonError extends Error {
  readonly name = "BackendJsonError";

  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface RequestBackendJsonOptions<T> {
  method: BackendJsonMethod;
  headers?: Record<string, string> | undefined;
  body?: unknown;
  normalize(input: unknown): T;
  allowEmptySuccess?: boolean | undefined;
  mapHttpError?: ((status: number, body: unknown) => Error) | undefined;
  mapTransportError?:
    | ((error: BackendJsonError, cause: unknown) => Error)
    | undefined;
}

export async function requestBackendJson<T>(
  fetchImpl: BackendJsonFetch,
  url: string,
  options: RequestBackendJsonOptions<T>
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, createRequestInit(options));
  } catch (error) {
    const networkError = new BackendJsonError(
      0,
      "network_error",
      "Network request failed"
    );
    throw options.mapTransportError?.(networkError, error) ?? networkError;
  }

  const body = await readBackendJsonBody(
    response,
    options.allowEmptySuccess === true,
    options.mapTransportError
  );
  if (!response.ok) {
    throw (
      options.mapHttpError?.(response.status, body) ??
      new BackendJsonError(response.status, "http_error", "Backend request failed")
    );
  }

  return options.normalize(unwrapBackendData(body));
}

export function unwrapBackendData(input: unknown): unknown {
  if (isRecord(input) && Object.prototype.hasOwnProperty.call(input, "data")) {
    return input.data;
  }
  return input;
}

function createRequestInit<T>(options: RequestBackendJsonOptions<T>): RequestInit {
  const headers: Record<string, string> = {
    accept: "application/json",
    ...options.headers,
  };
  const init: RequestInit = {
    method: options.method,
    headers,
  };
  if (options.body !== undefined) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
    init.body = JSON.stringify(options.body);
  }
  return init;
}

async function readBackendJsonBody(
  response: Response,
  allowEmpty: boolean,
  mapTransportError:
    | ((error: BackendJsonError, cause: unknown) => Error)
    | undefined
): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    if (allowEmpty) {
      return undefined;
    }
    const error = new BackendJsonError(
      response.status,
      "empty_json",
      "Backend returned empty JSON"
    );
    throw mapTransportError?.(error, undefined) ?? error;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    const error = new BackendJsonError(
      response.status,
      "invalid_json",
      "Backend returned invalid JSON"
    );
    throw mapTransportError?.(error, cause) ?? error;
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
