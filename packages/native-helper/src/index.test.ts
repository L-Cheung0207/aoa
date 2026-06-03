import { describe, expect, it } from "vitest";
import {
  createNativeAddonLoader,
  createNativeHelperBinding,
  createNativeHelperModule,
  getNativeAddonCandidatePaths,
  type NativeHotkeyAction,
  type NativeAddonBinding
} from "./index";

describe("native helper package wrapper", () => {
  it("wraps sync napi addon functions as async helper methods", async () => {
    const calls: string[] = [];
    const addon: NativeAddonBinding = {
      pasteFromClipboard: () => {
        calls.push("paste");
      },
      copySelectionToClipboard: () => {
        calls.push("copy");
      },
      typeText: (text) => {
        calls.push(`type:${text}`);
      },
      getForegroundWindowHandle: () => "handle-1",
      focusWindow: (windowHandle) => {
        calls.push(`focus:${windowHandle}`);
      },
      recognizeRightAltHotkey: () => "direct"
    };

    const helper = createNativeHelperBinding(addon);

    await helper.pasteFromClipboard();
    await helper.copySelectionToClipboard();
    await helper.typeText("hello");
    expect(await helper.getForegroundWindowHandle()).toBe("handle-1");
    await helper.focusWindow("handle-1");

    expect(calls).toEqual(["paste", "copy", "type:hello", "focus:handle-1"]);
  });

  it("throws a clear error when the native addon is missing", async () => {
    const helper = createNativeHelperBinding(undefined);

    await expect(helper.pasteFromClipboard()).rejects.toThrow("NATIVE_HELPER_UNAVAILABLE");
  });

  it("creates package exports from a lazy addon loader", async () => {
    const calls: string[] = [];
    const helper = createNativeHelperModule(() => ({
      pasteFromClipboard: () => calls.push("paste"),
      copySelectionToClipboard: () => calls.push("copy"),
      typeText: (text) => calls.push(text),
      getForegroundWindowHandle: () => "lazy-handle",
      focusWindow: (windowHandle) => calls.push(windowHandle),
      recognizeRightAltHotkey: () => "direct"
    }));

    await helper.pasteFromClipboard();
    await helper.copySelectionToClipboard();
    await helper.typeText("typed");
    expect(await helper.getForegroundWindowHandle()).toBe("lazy-handle");
    await helper.focusWindow("lazy-handle");

    expect(calls).toEqual(["paste", "copy", "typed", "lazy-handle"]);
  });

  it("prefers packaged node binary before cargo debug dll candidates", () => {
    expect(getNativeAddonCandidatePaths("C:\\app\\packages\\native-helper")).toEqual([
      "C:\\app\\packages\\native-helper\\dist\\voice_native_helper.node",
      "C:\\app\\packages\\native-helper\\target\\debug\\voice_native_helper.node",
      "C:\\app\\packages\\native-helper\\target\\debug\\voice_native_helper.dll"
    ]);
  });

  it("loads the first existing native addon candidate", () => {
    const loaded: string[] = [];
    const loader = createNativeAddonLoader({
      packageRoot: "C:\\app\\packages\\native-helper",
      exists: (path) => path.endsWith("voice_native_helper.dll"),
      requireFile: (path) => {
        loaded.push(path);
        return {
          pasteFromClipboard: () => undefined,
          typeText: () => undefined,
          recognizeRightAltHotkey: () => "direct"
        };
      }
    });

    expect(loader()).toBeDefined();
    expect(loaded).toEqual([
      "C:\\app\\packages\\native-helper\\target\\debug\\voice_native_helper.dll"
    ]);
  });

  it("exposes hotkey recognition through the native helper binding", () => {
    const actions: Array<NativeHotkeyAction | undefined> = [];
    const helper = createNativeHelperBinding({
      pasteFromClipboard: () => undefined,
      typeText: () => undefined,
      recognizeRightAltHotkey: (keyCode, transition) => {
        actions.push(keyCode === 0xa5 && transition === "up" ? "direct" : undefined);
        return actions.at(-1);
      }
    });

    expect(helper.recognizeRightAltHotkey(0xa5, "up")).toBe("direct");
    expect(actions).toEqual(["direct"]);
  });

  it("keeps hotkey recognizer state across wrapper calls", () => {
    let rightAltDown = false;
    const helper = createNativeHelperBinding({
      pasteFromClipboard: () => undefined,
      typeText: () => undefined,
      recognizeRightAltHotkey: (keyCode, transition) => {
        if (keyCode === 0xa5 && transition === "down") {
          rightAltDown = true;
          return undefined;
        }
        if (rightAltDown && keyCode === 0x20 && transition === "down") {
          return "processSelection";
        }
        return undefined;
      }
    });

    expect(helper.recognizeRightAltHotkey(0xa5, "down")).toBeUndefined();
    expect(helper.recognizeRightAltHotkey(0x20, "down")).toBe("processSelection");
  });

  it("starts a keyboard hook and dispatches addon callbacks to the provided listener", () => {
    let emit: ((action: NativeHotkeyAction) => void) | undefined;
    let stopCount = 0;
    const helper = createNativeHelperBinding({
      pasteFromClipboard: () => undefined,
      typeText: () => undefined,
      startKeyboardHook: (callback) => {
        emit = callback;
      },
      stopKeyboardHook: () => {
        stopCount += 1;
      }
    });

    const received: NativeHotkeyAction[] = [];
    const handle = helper.startKeyboardHook((action) => received.push(action));

    expect(typeof emit).toBe("function");
    emit?.("direct");
    emit?.("processSelection");
    expect(received).toEqual(["direct", "processSelection"]);

    handle.stop();
    expect(stopCount).toBe(1);

    emit?.("translate");
    expect(received).toEqual(["direct", "processSelection"]);

    handle.stop();
    expect(stopCount).toBe(1);
  });

  it("throws a clear error when the addon does not implement keyboard hook methods", () => {
    const helper = createNativeHelperBinding({
      pasteFromClipboard: () => undefined,
      typeText: () => undefined
    });

    expect(() => helper.startKeyboardHook(() => undefined)).toThrow("NATIVE_HELPER_UNAVAILABLE");
    expect(() => helper.stopKeyboardHook()).toThrow("NATIVE_HELPER_UNAVAILABLE");
  });

  it("stops keyboard hook through the top-level binding", () => {
    let stopCount = 0;
    const helper = createNativeHelperBinding({
      pasteFromClipboard: () => undefined,
      typeText: () => undefined,
      startKeyboardHook: () => undefined,
      stopKeyboardHook: () => {
        stopCount += 1;
      }
    });

    helper.startKeyboardHook(() => undefined);
    helper.stopKeyboardHook();
    expect(stopCount).toBe(1);
  });
});
