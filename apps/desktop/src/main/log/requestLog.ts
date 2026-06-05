export function logHttpRequest(url: string, params: Record<string, unknown>): void {
  console.log("[request]", {
    url,
    params
  });
}
