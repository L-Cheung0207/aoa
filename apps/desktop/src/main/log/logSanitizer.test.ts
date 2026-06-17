import { describe, expect, it } from "vitest";
import {
  formatLogFields,
  sanitizeForLog,
  sanitizeUrlForLog
} from "./logSanitizer";

describe("logSanitizer", () => {
  it("redacts known secrets in URLs", () => {
    expect(
      sanitizeUrlForLog(
        "wss://example.test/ws?AccessCode=abc123&token=secret&keep=yes"
      )
    ).toBe("wss://example.test/ws?AccessCode=***&token=***&keep=yes");
  });

  it("summarizes sensitive text and audio fields without logging raw payloads", () => {
    const sanitized = sanitizeForLog({
      text: "hello world",
      selectedText: "private selection",
      audio: {
        pcm: new Int16Array([1, 2, 3]),
        sampleRate: 16000
      },
      nested: {
        apiKey: "secret-key",
        safe: "ok"
      }
    });

    expect(sanitized).toEqual({
      textLength: 11,
      selectedTextLength: 17,
      audio: {
        pcmLength: 3,
        sampleRate: 16000
      },
      nested: {
        apiKey: "***",
        safe: "ok"
      }
    });
  });

  it("formats sanitized fields as stable key value pairs", () => {
    expect(
      formatLogFields({
        channel: "voice:copy-text",
        durationMs: 4,
        input: {
          text: "do not log me"
        }
      })
    ).toBe("channel=voice:copy-text durationMs=4 input={\"textLength\":13}");
  });
});
