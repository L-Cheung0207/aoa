import type { KeyboardHookHandle, NativeHotkeyAction } from "@voice/native-helper";
import type { ShortcutConfig, ShortcutRegistrar } from "./shortcutManager";

export interface NativeKeyboardHookApi {
  configureKeyboardShortcuts?(direct: string, processSelection: string, translate: string): void;
  startKeyboardHook(onAction: (action: NativeHotkeyAction) => void): KeyboardHookHandle;
}

export interface GenericShortcutApi {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

export interface NativeShortcutCaptureInterceptor {
  isActive(): boolean;
  onAccelerator(accelerator: string): void;
}

export type NativeShortcutRecordingAction = Exclude<
  NativeHotkeyAction,
  "shortcutHelp" | "shortcutHelpDismiss"
>;

export const ACCELERATOR_TO_ACTION: Record<string, NativeShortcutRecordingAction> = {
  RightAlt: "direct",
  "RightAlt+Space": "processSelection",
  "RightAlt+RightShift": "translate"
};

export const ACTION_TO_ACCELERATOR: Record<NativeShortcutRecordingAction, string> = {
  direct: "RightAlt",
  processSelection: "RightAlt+Space",
  translate: "RightAlt+RightShift"
};

const VIRTUAL_ACCELERATORS = new Set(["shortcutHelp", "shortcutHelpDismiss"]);

const DOM_SYMBOL_KEY_ACCELERATORS: Record<string, string> = {
  Minus: "-",
  Equal: "=",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`"
};

export function createNativeShortcutRegistrar(
  api: NativeKeyboardHookApi,
  genericShortcut?: GenericShortcutApi,
  captureInterceptor?: NativeShortcutCaptureInterceptor
): ShortcutRegistrar {
  const callbacks = new Map<string, () => void>();
  const genericAccelerators = new Set<string>();
  let actionToAccelerator = { ...ACTION_TO_ACCELERATOR };
  let handle: KeyboardHookHandle | undefined;
  let nativeAvailable = true;
  let failureReason: string | undefined;

  const dispatch = (action: NativeHotkeyAction): void => {
    if (isVirtualAccelerator(action)) {
      callbacks.get(action)?.();
      return;
    }

    const accelerator = actionToAccelerator[action];
    const callback = callbacks.get(accelerator);
    console.log(
      `[shortcut] dispatch action=${action} accelerator=${accelerator} hasCallback=${Boolean(callback)}`
    );
    if (captureInterceptor?.isActive() === true && accelerator) {
      captureInterceptor.onAccelerator(accelerator);
      return;
    }
    callback?.();
  };

  const ensureHook = (): boolean => {
    if (handle) {
      return true;
    }
    try {
      handle = api.startKeyboardHook(dispatch);
      console.log("[shortcut] native keyboard hook started");
      return true;
    } catch (error) {
      failureReason = formatShortcutRegistrarError(error);
      console.error("[shortcut] native keyboard hook failed to start", error);
      handle = undefined;
      nativeAvailable = false;
      return false;
    }
  };

  const stopHookIfIdle = (): void => {
    if (callbacks.size === 0) {
      handle?.stop();
      handle = undefined;
    }
  };

  return {
    configureShortcuts: (config: ShortcutConfig) => {
      const normalizedConfig = {
        toggleRecording: normalizeElectronAccelerator(config.toggleRecording),
        processSelection: normalizeElectronAccelerator(config.processSelection),
        translateDictation: normalizeElectronAccelerator(config.translateDictation)
      };
      actionToAccelerator = {
        direct: normalizedConfig.toggleRecording,
        processSelection: normalizedConfig.processSelection,
        translate: normalizedConfig.translateDictation
      };
      try {
        api.configureKeyboardShortcuts?.(
          normalizedConfig.toggleRecording,
          normalizedConfig.processSelection,
          normalizedConfig.translateDictation
        );
        nativeAvailable = true;
        failureReason = undefined;
      } catch (error) {
        failureReason = formatShortcutRegistrarError(error);
        console.warn("[shortcut] native shortcut configuration unavailable", error);
        nativeAvailable = false;
      }
    },
    getFailureReason: () => failureReason,
    register: (accelerator, callback) => {
      const normalizedAccelerator = normalizeElectronAccelerator(accelerator);
      if (isVirtualAccelerator(normalizedAccelerator)) {
        if (!nativeAvailable) {
          return false;
        }
        if (!ensureHook()) {
          return false;
        }
        callbacks.set(normalizedAccelerator, callback);
        return true;
      }

      if (
        !nativeAvailable ||
        !isConfiguredNativeAccelerator(normalizedAccelerator, actionToAccelerator)
      ) {
        return registerGenericShortcut(normalizedAccelerator, callback);
      }

      if (!ensureHook()) {
        return registerGenericShortcut(normalizedAccelerator, callback);
      }
      callbacks.set(normalizedAccelerator, callback);
      return true;
    },
    unregister: (accelerator) => {
      const normalizedAccelerator = normalizeElectronAccelerator(accelerator);
      if (isVirtualAccelerator(normalizedAccelerator)) {
        callbacks.delete(normalizedAccelerator);
        stopHookIfIdle();
        return;
      }

      if (genericAccelerators.delete(normalizedAccelerator)) {
        genericShortcut?.unregister(normalizedAccelerator);
        return;
      }

      if (!isConfiguredNativeAccelerator(normalizedAccelerator, actionToAccelerator)) {
        return;
      }

      callbacks.delete(normalizedAccelerator);
      stopHookIfIdle();
    },
    unregisterAll: () => {
      callbacks.clear();
      handle?.stop();
      handle = undefined;
      for (const accelerator of genericAccelerators) {
        genericShortcut?.unregister(accelerator);
      }
      genericAccelerators.clear();
    }
  };

  function registerGenericShortcut(
    accelerator: string,
    callback: () => void,
  ): boolean {
    if (isNativeOnlyAccelerator(accelerator)) {
      failureReason ??= "Native keyboard hook is unavailable.";
      console.warn(
        `[shortcut] native-only accelerator "${accelerator}" requires native keyboard hook`
      );
      return false;
    }
    if (!genericShortcut) {
      console.warn(`[shortcut] unsupported accelerator "${accelerator}"`);
      return false;
    }
    let ok = false;
    try {
      ok = genericShortcut.register(accelerator, callback);
    } catch (error) {
      console.warn(
        `[shortcut] failed to register generic accelerator "${accelerator}"`,
        error
      );
      return false;
    }
    if (ok) {
      genericAccelerators.add(accelerator);
    }
    return ok;
  }
}

function formatShortcutRegistrarError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeElectronAccelerator(accelerator: string): string {
  return accelerator
    .split("+")
    .map((part) => {
      if (part === "MetaRight") {
        return "RightAlt";
      }
      return DOM_SYMBOL_KEY_ACCELERATORS[part] ?? part;
    })
    .join("+");
}

function isVirtualAccelerator(accelerator: string): accelerator is Extract<
  NativeHotkeyAction,
  "shortcutHelp" | "shortcutHelpDismiss"
> {
  return VIRTUAL_ACCELERATORS.has(accelerator);
}

function isConfiguredNativeAccelerator(
  accelerator: string,
  actionToAccelerator: Record<NativeShortcutRecordingAction, string>
): boolean {
  return Object.values(actionToAccelerator).includes(accelerator);
}

function isNativeOnlyAccelerator(accelerator: string): boolean {
  const parts = accelerator.split("+");
  return parts.some(
    (part) => part === "RightAlt" || part === "AltGr" || part === "RightShift"
  );
}
