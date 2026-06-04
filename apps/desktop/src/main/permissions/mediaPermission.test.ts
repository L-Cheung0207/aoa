import { describe, expect, it, vi } from "vitest";
import { installMediaPermissionHandlers } from "./mediaPermission";

describe("media permission handlers", () => {
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
});
