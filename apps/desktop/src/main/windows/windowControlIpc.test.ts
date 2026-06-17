import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerWindowControlIpc } from "./windowControlIpc";

const electronMock = vi.hoisted(() => {
  const BrowserWindow = {
    fromWebContents: vi.fn(),
  };
  return { BrowserWindow };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindow,
}));

describe("window control IPC", () => {
  beforeEach(() => {
    electronMock.BrowserWindow.fromWebContents.mockReset();
  });

  it("logs window control requests and handled responses", () => {
    const handlers = new Map<string, (event: { sender: unknown }, action: unknown) => void>();
    const logs: string[] = [];
    const window = {
      isDestroyed: vi.fn(() => false),
      isMaximized: vi.fn(() => false),
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      close: vi.fn(),
    };
    electronMock.BrowserWindow.fromWebContents.mockReturnValue(window);

    registerWindowControlIpc(
      {
        on: (channel, listener) => {
          handlers.set(channel, listener as never);
        },
      },
      {
        logger: {
          log: (message) => logs.push(message),
          warn: (message) => logs.push(message),
        },
      },
    );

    handlers.get("voice:home-window-control")?.({ sender: {} }, "minimize");

    expect(window.minimize).toHaveBeenCalledTimes(1);
    expect(logs).toEqual([
      "[ipc-direct] request channel=voice:home-window-control input={\"action\":\"minimize\"}",
      "[ipc-direct] response channel=voice:home-window-control status=ok action=minimize",
    ]);
  });

  it("logs ignored window control requests without throwing", () => {
    const handlers = new Map<string, (event: { sender: unknown }, action: unknown) => void>();
    const logs: string[] = [];
    electronMock.BrowserWindow.fromWebContents.mockReturnValue(undefined);

    registerWindowControlIpc(
      {
        on: (channel, listener) => {
          handlers.set(channel, listener as never);
        },
      },
      {
        logger: {
          log: (message) => logs.push(message),
          warn: (message) => logs.push(message),
        },
      },
    );

    handlers.get("voice:home-window-control")?.({ sender: {} }, "close");

    expect(logs).toEqual([
      "[ipc-direct] request channel=voice:home-window-control input={\"action\":\"close\"}",
      "[ipc-direct] response channel=voice:home-window-control status=ignored reason=no-window",
    ]);
  });
});
