import { describe, expect, it, vi } from "vitest";
import { logHttpRequest } from "./requestLog";

describe("request logging", () => {
  it("logs request metadata without exposing secrets or text payloads", () => {
    const logger = { log: vi.fn() };

    logHttpRequest(
      "https://api.example.com/check?token=secret&keep=yes",
      {
        selectedText: "private text",
        apiKey: "secret-key",
        page: 1
      },
      logger
    );

    expect(logger.log).toHaveBeenCalledWith(
      "[request] url=https://api.example.com/check?token=***&keep=yes params={\"selectedTextLength\":12,\"apiKey\":\"***\",\"page\":1}"
    );
  });
});
