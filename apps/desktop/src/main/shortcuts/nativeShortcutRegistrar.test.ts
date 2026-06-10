import { describe, expect, it, vi } from "vitest";
import type { KeyboardHookHandle, NativeHotkeyAction } from "@voice/native-helper";
import { createNativeShortcutRegistrar } from "./nativeShortcutRegistrar";

function createHookApi(options: { failTimes?: number } = {}): {
  configureKeyboardShortcuts: (direct: string, processSelection: string, translate: string) => void;
  startKeyboardHook: (onAction: (action: NativeHotkeyAction) => void) => KeyboardHookHandle;
  dispatch(action: NativeHotkeyAction): void;
  configuredShortcuts: Array<[string, string, string]>;
  startCount: number;
  stopCount: number;
  remainingFailures: number;
} {
  const state = {
    listener: undefined as ((action: NativeHotkeyAction) => void) | undefined,
    configuredShortcuts: [] as Array<[string, string, string]>,
    startCount: 0,
    stopCount: 0,
    remainingFailures: options.failTimes ?? 0
  };

  return {
    configureKeyboardShortcuts: (direct, processSelection, translate) => {
      state.configuredShortcuts.push([direct, processSelection, translate]);
    },
    startKeyboardHook: (onAction) => {
      if (state.remainingFailures > 0) {
        state.remainingFailures -= 1;
        throw new Error("HOOK_START_FAILED");
      }
      state.startCount += 1;
      state.listener = onAction;
      return {
        stop: () => {
          state.stopCount += 1;
          state.listener = undefined;
        }
      };
    },
    dispatch: (action) => {
      state.listener?.(action);
    },
    get configuredShortcuts() {
      return state.configuredShortcuts;
    },
    get startCount() {
      return state.startCount;
    },
    get stopCount() {
      return state.stopCount;
    },
    get remainingFailures() {
      return state.remainingFailures;
    }
  };
}

describe("native shortcut registrar", () => {
  it("routes Right ALT actions from the native hook to the matching accelerator callback", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);

    const toggle = vi.fn();
    const process = vi.fn();
    const translate = vi.fn();

    expect(registrar.register("RightAlt", toggle)).toBe(true);
    expect(registrar.register("RightAlt+Space", process)).toBe(true);
    expect(registrar.register("RightAlt+RightShift", translate)).toBe(true);
    expect(api.startCount).toBe(1);

    api.dispatch("direct");
    api.dispatch("processSelection");
    api.dispatch("translate");

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(process).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it("routes the native shortcut help action to the virtual help callback", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);
    const onShortcutHelp = vi.fn();

    expect(registrar.register("shortcutHelp", onShortcutHelp)).toBe(true);
    expect(api.startCount).toBe(1);

    api.dispatch("shortcutHelp");

    expect(onShortcutHelp).toHaveBeenCalledTimes(1);
  });

  it("routes the native shortcut help dismiss action to the virtual dismiss callback", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);
    const onShortcutHelpDismiss = vi.fn();

    expect(registrar.register("shortcutHelpDismiss", onShortcutHelpDismiss)).toBe(true);
    expect(api.startCount).toBe(1);

    api.dispatch("shortcutHelpDismiss");

    expect(onShortcutHelpDismiss).toHaveBeenCalledTimes(1);
  });

  it("routes native actions to the currently configured accelerators", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);
    const direct = vi.fn();
    const processSelection = vi.fn();
    const translate = vi.fn();

    registrar.configureShortcuts?.({
      toggleRecording: "A",
      processSelection: "Ctrl+Space",
      translateDictation: "Shift+T"
    });

    expect(registrar.register("A", direct)).toBe(true);
    expect(registrar.register("Ctrl+Space", processSelection)).toBe(true);
    expect(registrar.register("Shift+T", translate)).toBe(true);
    expect(api.configuredShortcuts).toEqual([["A", "Ctrl+Space", "Shift+T"]]);

    api.dispatch("direct");
    api.dispatch("processSelection");
    api.dispatch("translate");

    expect(direct).toHaveBeenCalledTimes(1);
    expect(processSelection).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it("routes configured RightAlt regular-key shortcuts through the native hook", () => {
    const api = createHookApi();
    const genericRegister = vi.fn();
    const registrar = createNativeShortcutRegistrar(api, {
      register: genericRegister,
      unregister: vi.fn()
    });
    const direct = vi.fn();
    const processSelection = vi.fn();
    const translate = vi.fn();

    registrar.configureShortcuts?.({
      toggleRecording: "AltGr+A",
      processSelection: "RightAlt+F5",
      translateDictation: "RightAlt+Right"
    });

    expect(registrar.register("AltGr+A", direct)).toBe(true);
    expect(registrar.register("RightAlt+F5", processSelection)).toBe(true);
    expect(registrar.register("RightAlt+Right", translate)).toBe(true);
    expect(api.configuredShortcuts).toEqual([
      ["AltGr+A", "RightAlt+F5", "RightAlt+Right"]
    ]);
    expect(api.startCount).toBe(1);
    expect(genericRegister).not.toHaveBeenCalled();

    api.dispatch("direct");
    api.dispatch("processSelection");
    api.dispatch("translate");

    expect(direct).toHaveBeenCalledTimes(1);
    expect(processSelection).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown accelerators without starting the hook", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);

    expect(registrar.register("Ctrl+A", vi.fn())).toBe(false);
    expect(api.startCount).toBe(0);
  });

  it("routes non-RightAlt accelerators through the generic shortcut registrar", () => {
    const api = createHookApi();
    const genericRegistered: Array<{ accelerator: string; callback: () => void }> = [];
    const genericUnregistered: string[] = [];
    const registrar = createNativeShortcutRegistrar(api, {
      register: (accelerator, callback) => {
        genericRegistered.push({ accelerator, callback });
        return true;
      },
      unregister: (accelerator) => {
        genericUnregistered.push(accelerator);
      }
    });
    const callback = vi.fn();

    expect(registrar.register("Ctrl+Shift+K", callback)).toBe(true);
    expect(api.startCount).toBe(0);
    expect(genericRegistered.map((entry) => entry.accelerator)).toEqual(["Ctrl+Shift+K"]);

    genericRegistered[0]?.callback();
    expect(callback).toHaveBeenCalledTimes(1);

    registrar.unregister("Ctrl+Shift+K");
    expect(genericUnregistered).toEqual(["Ctrl+Shift+K"]);
  });

  it("normalizes DOM symbol key names before using the generic shortcut registrar", () => {
    const api = createHookApi();
    const genericRegistered: Array<{ accelerator: string; callback: () => void }> = [];
    const registrar = createNativeShortcutRegistrar(api, {
      register: (accelerator, callback) => {
        genericRegistered.push({ accelerator, callback });
        return true;
      },
      unregister: vi.fn()
    });

    expect(registrar.register("Ctrl+Semicolon", vi.fn())).toBe(true);
    expect(genericRegistered.map((entry) => entry.accelerator)).toEqual(["Ctrl+;"]);
    expect(api.startCount).toBe(0);
  });

  it("normalizes legacy single DOM symbol shortcuts before registration", () => {
    const api = createHookApi();
    const genericRegistered: string[] = [];
    const registrar = createNativeShortcutRegistrar(api, {
      register: (accelerator) => {
        genericRegistered.push(accelerator);
        return true;
      },
      unregister: vi.fn()
    });

    expect(registrar.register("Semicolon", vi.fn())).toBe(true);
    expect(genericRegistered).toEqual([";"]);
  });

  it("reports generic shortcut registration errors as registration failures", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api, {
      register: () => {
        throw new TypeError("conversion failure from Invalid");
      },
      unregister: vi.fn()
    });

    expect(registrar.register("Invalid", vi.fn())).toBe(false);
    expect(api.startCount).toBe(0);
  });

  it("returns false when the native hook fails to start", () => {
    const api = createHookApi({ failTimes: 1 });
    const registrar = createNativeShortcutRegistrar(api);

    expect(registrar.register("RightAlt", vi.fn())).toBe(false);
    expect(api.startCount).toBe(0);

    // Subsequent register attempts should retry and succeed once the hook works.
    expect(registrar.register("RightAlt", vi.fn())).toBe(true);
    expect(api.startCount).toBe(1);
  });

  it("stops the hook after the last accelerator is unregistered", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);

    registrar.register("RightAlt", vi.fn());
    registrar.register("RightAlt+Space", vi.fn());

    registrar.unregister("RightAlt");
    expect(api.stopCount).toBe(0);

    registrar.unregister("RightAlt+Space");
    expect(api.stopCount).toBe(1);
  });

  it("stops the hook and clears bindings on unregisterAll", () => {
    const api = createHookApi();
    const registrar = createNativeShortcutRegistrar(api);

    const callback = vi.fn();
    registrar.register("RightAlt", callback);
    registrar.unregisterAll();

    expect(api.stopCount).toBe(1);

    // After unregisterAll, dispatched events must not invoke the old callback.
    api.dispatch("direct");
    expect(callback).not.toHaveBeenCalled();

    // Re-register should start a fresh hook.
    registrar.register("RightAlt", callback);
    expect(api.startCount).toBe(2);
  });
});
