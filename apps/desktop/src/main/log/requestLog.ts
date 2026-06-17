import { formatLogFields } from "./logSanitizer";

export interface RequestLogger {
  log(message: string): void;
}

export function logHttpRequest(
  url: string,
  params: Record<string, unknown>,
  logger: RequestLogger = console
): void {
  logger.log(`[request] ${formatLogFields({ url, params })}`);
}
