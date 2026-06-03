import { describe, expect, it } from "vitest";
import {
  createNativeBridge,
  type NativeHelperBinding,
  type RuntimePlatform
} from "./nativeBridge";

describe("native bridge", () => {
  it("uses the Windows helper binding to paste and type text", async () => {
    const calls: string[] = [];
    const helper: NativeHelperBinding = {
      pasteFromClipboard: async () => {
        calls.push("paste");
      },
      copySelectionToClipboard: async () => {
        calls.push("copy");
      },
      typeText: async (text) => {
        calls.push(`type:${text}`);
      },
      getForegroundWindowHandle: async () => "12345",
      focusWindow: async (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
      }
    };
    const bridge = createNativeBridge({
      platform: "win32",
      loadHelper: () => helper
    });

    await bridge.pasteFromClipboard();
    await bridge.copySelectionToClipboard();
    await bridge.typeText("hello");
    expect(await bridge.getForegroundWindowHandle()).toBe("12345");
    await bridge.focusWindow("12345");

    expect(calls).toEqual(["paste", "copy", "type:hello", "focus:12345"]);
  });

  it("reports unsupported platform without crashing the app", async () => {
    const bridge = createNativeBridge({
      platform: "darwin" as RuntimePlatform,
      loadHelper: () => undefined
    });

    await expect(bridge.pasteFromClipboard()).rejects.toThrow("UNSUPPORTED_PLATFORM");
    await expect(bridge.copySelectionToClipboard()).rejects.toThrow(
      "UNSUPPORTED_PLATFORM"
    );
    await expect(bridge.typeText("hello")).rejects.toThrow("UNSUPPORTED_PLATFORM");
  });

  it("reports helper unavailable when the Windows binding cannot be loaded", async () => {
    const bridge = createNativeBridge({
      platform: "win32",
      loadHelper: () => undefined
    });

    await expect(bridge.pasteFromClipboard()).rejects.toThrow("NATIVE_HELPER_UNAVAILABLE");
    await expect(bridge.copySelectionToClipboard()).rejects.toThrow(
      "NATIVE_HELPER_UNAVAILABLE"
    );
  });

  it("loads the helper through the provided module loader", async () => {
    const calls: string[] = [];
    const bridge = createNativeBridge({
      platform: "win32",
      requireModule: (specifier) => {
        calls.push(specifier);
        return {
          pasteFromClipboard: async () => undefined,
          copySelectionToClipboard: async () => {
            calls.push("copy");
          },
          typeText: async (text: string) => {
            calls.push(text);
          },
          getForegroundWindowHandle: async () => "loaded-window",
          focusWindow: async () => undefined
        };
      }
    });

    await bridge.copySelectionToClipboard();
    await bridge.typeText("loaded");

    expect(calls).toEqual(["@voice/native-helper", "copy", "@voice/native-helper", "loaded"]);
  });
});
