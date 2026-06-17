import { describe, expect, it, vi } from "vitest";
import { testWebSocket } from "./connectivityService";

function createLogger() {
  const logs: string[] = [];
  const warnings: string[] = [];
  return {
    logs,
    warnings,
    logger: {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message),
    },
  };
}

describe("connectivityService logging", () => {
  it("logs websocket test request lifecycle with redacted URLs", async () => {
    const { logs, warnings, logger } = createLogger();
    const sockets: Array<{
      listeners: Partial<Record<"open" | "error", (error?: Error) => void>>;
      terminate: ReturnType<typeof vi.fn>;
    }> = [];

    const promise = testWebSocket(
      {
        url: "wss://api.example/ws?AccessCode=secret&keep=yes",
        proxy: "proxy.example:8080",
        proxyUsername: "alex",
        proxyPassword: "secret-password",
      },
      {
        logger,
        createWebSocket: (_url, _options) => {
          const socket = {
            listeners: {},
            terminate: vi.fn(),
            once: vi.fn((event: "open" | "error", listener: (error?: Error) => void) => {
              socket.listeners[event] = listener;
              return socket;
            }),
          };
          sockets.push(socket);
          return socket;
        },
      },
    );

    sockets[0]?.listeners.open?.();

    await expect(promise).resolves.toMatchObject({
      ok: true,
      message: "WS connection succeeded",
    });
    expect(logs).toEqual([
      "[connectivity] websocket test start url=wss://api.example/ws?AccessCode=***&keep=yes proxy=http://alex:***@proxy.example:8080/ agent=enabled",
      expect.stringMatching(
        /^\[connectivity\] websocket test result status=ok elapsedMs=\d+$/,
      ),
    ]);
    expect(warnings).toEqual([]);
    expect([...logs, ...warnings].join("\n")).not.toContain("secret");
    expect(sockets[0]?.terminate).toHaveBeenCalledTimes(1);
  });

  it("logs websocket test failures", async () => {
    const { logs, warnings, logger } = createLogger();
    const error = new Error("connect failed");

    await expect(
      testWebSocket(
        { url: "wss://api.example/ws?token=secret" },
        {
          logger,
          createWebSocket: () => {
            throw error;
          },
        },
      ),
    ).resolves.toEqual({
      ok: false,
      message: "WS initialization failed: connect failed",
    });

    expect(logs).toEqual([
      "[connectivity] websocket test start url=wss://api.example/ws?token=*** proxy=none agent=disabled",
    ]);
    expect(warnings).toEqual([
      '[connectivity] websocket test result status=error error="WS initialization failed: connect failed"',
    ]);
    expect([...logs, ...warnings].join("\n")).not.toContain("token=secret");
  });
});
