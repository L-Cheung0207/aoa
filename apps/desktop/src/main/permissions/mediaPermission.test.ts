import { afterEach, describe, expect, it, vi } from "vitest";
import { installMediaPermissionHandlers } from "./mediaPermission";

describe("media permission handlers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("grants audio capture permission and denies unrelated permissions", () => {
    const session = {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn()
    };

    installMediaPermissionHandlers(session);

    const requestHandler = session.setPermissionRequestHandler.mock.calls[0]?.[0];
    const checkHandler = session.setPermissionCheckHandler.mock.calls[0]?.[0];
    expect(requestHandler).toBeTypeOf("function");
    expect(checkHandler).toBeTypeOf("function");

    const audioCallback = vi.fn();
    requestHandler?.({}, "media", audioCallback, { mediaTypes: ["audio"] });
    expect(audioCallback).toHaveBeenCalledWith(true);

    const videoCallback = vi.fn();
    requestHandler?.({}, "media", videoCallback, { mediaTypes: ["video"] });
    expect(videoCallback).toHaveBeenCalledWith(false);

    const clipboardCallback = vi.fn();
    requestHandler?.({}, "clipboard-read", clipboardCallback, {});
    expect(clipboardCallback).toHaveBeenCalledWith(false);

    expect(checkHandler?.({}, "media", "file:///", { mediaType: "audio" })).toBe(true);
    expect(checkHandler?.({}, "media", "file:///", { mediaType: "video" })).toBe(false);
    expect(checkHandler?.({}, "geolocation", "file:///", {})).toBe(false);
  });

  it("logs media permission decisions with permission and media types", () => {
    const logs: string[] = [];
    const session = {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn()
    };

    installMediaPermissionHandlers(session, {
      logger: {
        log: (message) => logs.push(message)
      }
    });

    const requestHandler = session.setPermissionRequestHandler.mock.calls[0]?.[0];
    const checkHandler = session.setPermissionCheckHandler.mock.calls[0]?.[0];
    requestHandler?.({}, "media", vi.fn(), { mediaTypes: ["audio"] });
    checkHandler?.({}, "media", "file:///", { mediaTypes: ["video"] });

    expect(logs).toEqual([
      "[permission] media request permission=media mediaTypes=audio granted=true",
      "[permission] media check permission=media mediaTypes=video granted=false"
    ]);
  });

  it("logs to console by default so production permission decisions are captured", () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message: unknown) => {
      logs.push(String(message));
    });
    const session = {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn()
    };

    installMediaPermissionHandlers(session);

    const requestHandler = session.setPermissionRequestHandler.mock.calls[0]?.[0];
    requestHandler?.({}, "media", vi.fn(), { mediaTypes: ["audio"] });

    expect(logs).toEqual([
      "[permission] media request permission=media mediaTypes=audio granted=true"
    ]);
  });
});
