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
  genericShortcut?: GenericShortcutApi
): ShortcutRegistrar {
  const callbacks = new Map<string, () => void>();
  const genericAccelerators = new Set<string>();
  let actionToAccelerator = { ...ACTION_TO_ACCELERATOR };
  let handle: KeyboardHookHandle | undefined;

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
      console.error("[shortcut] native keyboard hook failed to start", error);
      handle = undefined;
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
      actionToAccelerator = {
        direct: normalizeElectronAccelerator(config.toggleRecording),
        processSelection: normalizeElectronAccelerator(config.processSelection),
        translate: normalizeElectronAccelerator(config.translateDictation)
      };
      api.configureKeyboardShortcuts?.(
        config.toggleRecording,
        config.processSelection,
        config.translateDictation
      );
    },
    register: (accelerator, callback) => {
      const normalizedAccelerator = normalizeElectronAccelerator(accelerator);
      if (isVirtualAccelerator(normalizedAccelerator)) {
        if (!ensureHook()) {
          return false;
        }
        callbacks.set(normalizedAccelerator, callback);
        return true;
      }

      if (!isConfiguredNativeAccelerator(normalizedAccelerator, actionToAccelerator)) {
        if (!genericShortcut) {
          console.warn(`[shortcut] unsupported accelerator "${normalizedAccelerator}"`);
          return false;
        }
        let ok = false;
        try {
          ok = genericShortcut.register(normalizedAccelerator, callback);
        } catch (error) {
          console.warn(
            `[shortcut] failed to register generic accelerator "${normalizedAccelerator}"`,
            error
          );
          return false;
        }
        if (ok) {
          genericAccelerators.add(normalizedAccelerator);
        }
        return ok;
      }

      if (!ensureHook()) {
        return false;
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

      if (!isConfiguredNativeAccelerator(normalizedAccelerator, actionToAccelerator)) {
        if (genericAccelerators.delete(normalizedAccelerator)) {
          genericShortcut?.unregister(normalizedAccelerator);
        }
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
}

function normalizeElectronAccelerator(accelerator: string): string {
  return accelerator
    .split("+")
    .map((part) => DOM_SYMBOL_KEY_ACCELERATORS[part] ?? part)
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
