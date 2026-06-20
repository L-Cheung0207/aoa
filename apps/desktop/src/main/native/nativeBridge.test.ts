import { describe, expect, it } from "vitest";
import {
  createNativeBridge,
  type NativeHelperBinding,
  type RuntimePlatform
} from "./nativeBridge";

describe("native bridge", () => {
  it.each(["win32", "darwin"] as RuntimePlatform[])(
    "uses the native helper binding on %s",
    async (platform) => {
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
      },
      isEditableTargetFocused: async () => {
        calls.push("editable");
        return true;
      },
      muteOtherAppsForRecording: async (excludedProcessIds) => {
        calls.push(`mute:${excludedProcessIds.join(",")}`);
      },
      restoreOtherAppsAudio: async () => {
        calls.push("restore-audio");
      }
    };
    const bridge = createNativeBridge({
      platform,
      loadHelper: () => helper
    });

    await bridge.pasteFromClipboard();
    await bridge.copySelectionToClipboard();
    await bridge.typeText("hello");
    expect(await bridge.getForegroundWindowHandle()).toBe("12345");
    await bridge.focusWindow("12345");
    await expect(bridge.isEditableTargetFocused()).resolves.toBe(true);
    await bridge.muteOtherAppsForRecording([100, 200]);
    await bridge.restoreOtherAppsAudio();

    expect(calls).toEqual([
      "paste",
      "copy",
      "type:hello",
      "focus:12345",
      "editable",
      "mute:100,200",
      "restore-audio"
    ]);
    }
  );

  it("reports unsupported platform without crashing the app", async () => {
    const bridge = createNativeBridge({
      platform: "linux" as RuntimePlatform,
      loadHelper: () => undefined
    });

    await expect(bridge.pasteFromClipboard()).rejects.toThrow("UNSUPPORTED_PLATFORM");
    await expect(bridge.copySelectionToClipboard()).rejects.toThrow(
      "UNSUPPORTED_PLATFORM"
    );
    await expect(bridge.typeText("hello")).rejects.toThrow("UNSUPPORTED_PLATFORM");
    await expect(bridge.isEditableTargetFocused()).rejects.toThrow(
      "UNSUPPORTED_PLATFORM"
    );
    await expect(bridge.muteOtherAppsForRecording([])).rejects.toThrow(
      "UNSUPPORTED_PLATFORM"
    );
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
    await expect(bridge.isEditableTargetFocused()).rejects.toThrow(
      "NATIVE_HELPER_UNAVAILABLE"
    );
    await expect(bridge.restoreOtherAppsAudio()).rejects.toThrow(
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
          focusWindow: async () => undefined,
          isEditableTargetFocused: async () => {
            calls.push("editable");
            return true;
          },
          muteOtherAppsForRecording: async (excludedProcessIds: number[]) => {
            calls.push(`mute:${excludedProcessIds.join(",")}`);
          },
          restoreOtherAppsAudio: async () => {
            calls.push("restore-audio");
          }
        };
      }
    });

    await bridge.copySelectionToClipboard();
    await bridge.typeText("loaded");
    await bridge.isEditableTargetFocused();
    await bridge.muteOtherAppsForRecording([42]);
    await bridge.restoreOtherAppsAudio();

    expect(calls).toEqual([
      "@voice/native-helper",
      "copy",
      "@voice/native-helper",
      "loaded",
      "@voice/native-helper",
      "editable",
      "@voice/native-helper",
      "mute:42",
      "@voice/native-helper",
      "restore-audio"
    ]);
  });
});
