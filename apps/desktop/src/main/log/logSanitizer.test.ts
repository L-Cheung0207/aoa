import { afterEach, describe, expect, it } from "vitest";
import {
  configureLogSanitizer,
  formatLogFields,
  sanitizeForLog,
  sanitizeUrlForLog,
} from "./logSanitizer";

describe("logSanitizer", () => {
  afterEach(() => {
    configureLogSanitizer({ revealSensitive: false });
  });
  it("redacts known secrets in URLs", () => {
    expect(
      sanitizeUrlForLog(
        "wss://example.test/ws?AccessCode=abc123&token=secret&keep=yes",
      ),
    ).toBe("wss://example.test/ws?AccessCode=***&token=***&keep=yes");
  });

  it("reveals sensitive URL parameters when development logging is enabled", () => {
    expect(
      sanitizeUrlForLog(
        "wss://example.test/ws?AccessCode=abc123&token=secret&keep=yes",
        { revealSensitive: true }
      )
    ).toBe("wss://example.test/ws?AccessCode=abc123&token=secret&keep=yes");
  });

  it("summarizes sensitive text and audio fields without logging raw payloads", () => {
    const sanitized = sanitizeForLog({
      text: "hello world",
      selectedText: "private selection",
      audio: {
        pcm: new Int16Array([1, 2, 3]),
        sampleRate: 16000,
      },
      nested: {
        apiKey: "secret-key",
        safe: "ok",
      },
    });

    expect(sanitized).toEqual({
      textLength: 11,
      selectedTextLength: 17,
      audio: {
        pcmLength: 3,
        sampleRate: 16000,
      },
      nested: {
        apiKey: "***",
        safe: "ok",
      },
    });
  });

  it("reveals sensitive text fields but keeps audio summarized when development logging is enabled", () => {
    const sanitized = sanitizeForLog(
      {
        text: "hello world",
        selectedText: "private selection",
        token: "secret-token",
        audio: {
          pcm: new Int16Array([1, 2, 3]),
          sampleRate: 16000
        }
      },
      { revealSensitive: true }
    );

    expect(sanitized).toEqual({
      text: "hello world",
      selectedText: "private selection",
      token: "secret-token",
      audio: {
        pcmLength: 3,
        sampleRate: 16000
      }
    });
  });

  it("formats sanitized fields as stable key value pairs", () => {
    expect(
      formatLogFields({
        channel: "voice:copy-text",
        durationMs: 4,
        input: {
          text: "do not log me",
        },
      }),
    ).toBe('channel=voice:copy-text durationMs=4 input={"textLength":13}');
  });

  it("redacts auth secrets from formatted fields while preserving email", () => {
    expect(
      formatLogFields({
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        Authorization: "Bearer access-secret",
        password: "password-secret",
        code: "123456",
        email: "user@example.test",
      }),
    ).toBe(
      "accessToken=*** refreshToken=*** Authorization=*** password=*** code=*** email=user@example.test",
    );
  });

  it("redacts auth and proxy secret key variants", () => {
    expect(
      formatLogFields({
        clientSecret: "client-secret",
        sessionToken: "session-secret",
        ldapPassword: "ldap-secret",
        authToken: "auth-secret",
        proxyPassword: "proxy-secret",
        passwordCipher: "cipher-secret",
        access_token: "access-secret",
        refresh_token: "refresh-secret",
        code: "123456",
        email: "user@example.test",
      }),
    ).toBe(
      "clientSecret=*** sessionToken=*** ldapPassword=*** authToken=*** proxyPassword=*** passwordCipher=*** access_token=*** refresh_token=*** code=*** email=user@example.test",
    );
  });

  it("redacts sensitive keys before value type handling", () => {
    expect(
      formatLogFields({
        code: 123456,
        authToken: 123,
        Authorization: true,
        durationMs: 42,
        enabled: false,
        nested: {
          refreshToken: 123,
          attempts: 3,
        },
      }),
    ).toBe(
      'code=*** authToken=*** Authorization=*** durationMs=42 enabled=false nested={"refreshToken":"***","attempts":3}',
    );
  });

  it("redacts sensitive keys from malformed or relative URL strings", () => {
    expect(
      sanitizeUrlForLog(
        "/login?clientSecret=client-secret&sessionToken=session-secret&ldapPassword=ldap-secret&authToken=auth-secret&proxyPassword=proxy-secret&passwordCipher=cipher-secret&access_token=access-secret&refresh_token=refresh-secret&code=123456&Authorization=Bearer-secret&email=user@example.test",
      ),
    ).toBe(
      "/login?clientSecret=***&sessionToken=***&ldapPassword=***&authToken=***&proxyPassword=***&passwordCipher=***&access_token=***&refresh_token=***&code=***&Authorization=***&email=user@example.test",
    );
  });

  it("redacts relative URL values inside formatted fields", () => {
    expect(
      formatLogFields({
        url: "/login?code=123456&accessToken=access-secret&email=user@example.test",
      }),
    ).toBe("url=/login?code=***&accessToken=***&email=user@example.test");
  });

  it("formats top-level text fields as lengths unless development logging is enabled", () => {
    expect(formatLogFields({ finalText: "private final" })).toBe("finalTextLength=13");
    expect(
      formatLogFields({ finalText: "private final" }, { revealSensitive: true })
    ).toBe("finalText=\"private final\"");
  });

  it("formats raw sensitive fields when development logging is enabled", () => {
    expect(
      formatLogFields(
        {
          channel: "voice:copy-text",
          input: {
            text: "log me in dev",
            token: "secret-token",
            pcm: new Int16Array([1, 2])
          }
        },
        { revealSensitive: true }
      )
    ).toBe(
      "channel=voice:copy-text input={\"text\":\"log me in dev\",\"token\":\"secret-token\",\"pcm\":{\"pcmLength\":2}}"
    );
  });

  it("redacts top-level sensitive fields unless development logging is enabled", () => {
    expect(formatLogFields({ token: "secret-token" })).toBe("token=***");
    expect(formatLogFields({ token: "secret-token" }, { revealSensitive: true })).toBe(
      "token=secret-token"
    );
  });

  it("uses configured default reveal mode when no call-site option is provided", () => {
    configureLogSanitizer({ revealSensitive: true });

    expect(
      formatLogFields({
        input: {
          selectedText: "dev selected text",
          token: "dev-token"
        }
      })
    ).toBe("input={\"selectedText\":\"dev selected text\",\"token\":\"dev-token\"}");
  });
});
