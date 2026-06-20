import { validateShortcut } from "@voice/shared/shortcuts/reservedShortcutPolicy";

export const SUPPORTED_SHORTCUTS = [
  "RightAlt",
  "RightAlt+Space",
  "RightAlt+RightShift",
] as const;

export type SupportedShortcut = (typeof SUPPORTED_SHORTCUTS)[number];

const SHORTCUT_LABELS: Record<SupportedShortcut, string> = {
  RightAlt: "Right Alt",
  "RightAlt+Space": "Right Alt + Space",
  "RightAlt+RightShift": "Right Alt + Right Shift",
};

const SYMBOL_KEY_LABELS: Record<string, string> = {
  "-": "-",
  "=": "=",
  ",": ",",
  ".": ".",
  "/": "/",
  "\\": "\\",
  ";": ";",
  "'": "'",
  "[": "[",
  "]": "]",
  "`": "`",
};

const SYMBOL_KEY_ACCELERATORS: Record<string, string> = {
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
  Backquote: "`",
};

const RIGHT_ALT_FALLBACK_CAPTURE_MS = 600;

export type ShortcutDisplayPlatform = "mac" | "windows" | "other";

export function detectShortcutDisplayPlatform(): ShortcutDisplayPlatform {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  if (platform.includes("mac") || userAgent.includes("mac os")) {
    return "mac";
  }
  if (platform.includes("win") || userAgent.includes("windows")) {
    return "windows";
  }
  return "other";
}

export function formatShortcutLabel(
  value: string,
  platform: ShortcutDisplayPlatform = detectShortcutDisplayPlatform(),
): string {
  if (value in SHORTCUT_LABELS) {
    return SHORTCUT_LABELS[value as SupportedShortcut];
  }

  return value
    .split("+")
    .filter(Boolean)
    .map((part) => {
      switch (part) {
        case "Ctrl":
        case "Alt":
        case "Shift":
          return part;
        case "MetaRight":
          return "Right Cmd";
        case "RightShift":
          return "Right Shift";
        case "Super":
          return platform === "mac" ? "Cmd" : "Win";
        case "AltGr":
        case "RightAlt":
          return "Right Alt";
        default:
          if (part in SYMBOL_KEY_LABELS) {
            return SYMBOL_KEY_LABELS[part];
          }
          return part.length === 1 ? part.toUpperCase() : part;
      }
    })
    .join(" + ");
}

export function normalizeShortcutForStorage(value: string): string {
  return value
    .split("+")
    .filter(Boolean)
    .map((part) => {
      switch (part) {
        case "MetaRight":
          return "RightAlt";
        case "RightShift":
        case "ShiftRight":
          return "RightShift";
        default:
          return part;
      }
    })
    .join("+");
}

export function isSupportedShortcut(value: string): boolean {
  return validateShortcut(normalizeShortcutForStorage(value), "win32").ok;
}

export interface ShortcutCaptureHandlers {
  capture(accelerator: string): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  reset(): void;
}

export interface CreateShortcutCaptureHandlersOptions {
  currentShortcut?: string;
  existingShortcuts?: string[];
  onCapture(accelerator: string): void;
  onCancel(): void;
  onInvalid?(message: string): void;
}

const INVALID_SHORTCUT_MESSAGE = "请按下一个快捷键";

export function createShortcutCaptureHandlers(
  options: CreateShortcutCaptureHandlersOptions,
): ShortcutCaptureHandlers {
  const pressedModifiers = new Set<string>();
  let rightAltFallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;

  const reset = (): void => {
    if (rightAltFallbackTimer) {
      clearTimeout(rightAltFallbackTimer);
      rightAltFallbackTimer = undefined;
    }
    pressedModifiers.clear();
    finished = false;
  };

  const clearRightAltFallback = (): void => {
    if (!rightAltFallbackTimer) {
      return;
    }
    clearTimeout(rightAltFallbackTimer);
    rightAltFallbackTimer = undefined;
  };

  const finish = (accelerator: string): void => {
    if (finished) {
      return;
    }
    clearRightAltFallback();

    const normalizedAccelerator = normalizeShortcutForStorage(accelerator);
    const validation = validateShortcut(normalizedAccelerator, {
      platform: "win32",
      currentShortcut:
        options.currentShortcut !== undefined
          ? normalizeShortcutForStorage(options.currentShortcut)
          : undefined,
      existingShortcuts: options.existingShortcuts?.map(normalizeShortcutForStorage),
    });
    if (!validation.ok) {
      options.onInvalid?.(validation.message ?? INVALID_SHORTCUT_MESSAGE);
      return;
    }

    finished = true;
    options.onCapture(normalizedAccelerator);
    reset();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    if (event.code === "Escape" && pressedModifiers.has("RightAlt")) {
      finish("RightAlt+Esc");
      return;
    }

    if (event.code === "Escape") {
      options.onCancel();
      reset();
      return;
    }

    const modifier = modifierFromEvent(event);
    if (modifier) {
      syncHeldModifiersFromEvent(event, pressedModifiers, modifier);
      if (pressedModifiers.has("RightAlt") && event.code === "ShiftRight") {
        finish("RightAlt+RightShift");
        return;
      }
      pressedModifiers.add(modifier);
      if (
        modifier === "RightAlt" &&
        pressedModifiers.size === 1 &&
        !rightAltFallbackTimer
      ) {
        rightAltFallbackTimer = setTimeout(() => {
          if (
            pressedModifiers.size === 1 &&
            pressedModifiers.has("RightAlt") &&
            !finished
          ) {
            finish("RightAlt");
          }
        }, RIGHT_ALT_FALLBACK_CAPTURE_MS);
      }
      return;
    }

    syncHeldModifiersFromEvent(event, pressedModifiers);
    if (pressedModifiers.has("RightAlt") && event.code === "Space") {
      finish("RightAlt+Space");
      return;
    }

    const key = keyFromEvent(event);
    if (!key) {
      options.onInvalid?.(INVALID_SHORTCUT_MESSAGE);
      return;
    }

    finish(buildAccelerator(pressedModifiers, key));
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    if (event.code === "AltRight" || event.key === "AltGraph") {
      if (
        pressedModifiers.has("RightAlt") &&
        !finished &&
        pressedModifiers.size === 1
      ) {
        finish("RightAlt");
        return;
      }
      clearRightAltFallback();
      pressedModifiers.delete("RightAlt");
      return;
    }

    const modifier = modifierFromEvent(event);
    if (modifier) {
      if (pressedModifiers.has(modifier) && !finished) {
        if (pressedModifiers.size === 1) {
          finish(modifier);
          return;
        }
        if (pressedModifiers.size > 1) {
          finish(buildModifierAccelerator(pressedModifiers));
          return;
        }
      }
      pressedModifiers.delete(modifier);
    }
  };

  return {
    capture: finish,
    handleKeyDown,
    handleKeyUp,
    reset,
  };
}

function modifierFromEvent(event: KeyboardEvent): string | undefined {
  if (event.key === "AltGraph") {
    return "RightAlt";
  }

  switch (event.code) {
    case "ControlLeft":
    case "ControlRight":
      return "Ctrl";
    case "AltLeft":
      return "Alt";
    case "AltRight":
      return "RightAlt";
    case "ShiftLeft":
      return "Shift";
    case "ShiftRight":
      return "RightShift";
    case "MetaLeft":
      return "Super";
    case "MetaRight":
      return "MetaRight";
    default:
      return undefined;
  }
}

function syncHeldModifiersFromEvent(
  event: KeyboardEvent,
  modifiers: Set<string>,
  currentModifier?: string,
): void {
  if (
    currentModifier === "RightAlt" ||
    isAltGraphActive(event) ||
    isImplicitRightAltEvent(event, modifiers, currentModifier)
  ) {
    modifiers.delete("Ctrl");
    modifiers.delete("Alt");
    modifiers.add("RightAlt");
  } else {
    if (
      event.ctrlKey &&
      currentModifier !== "Ctrl" &&
      !modifiers.has("RightAlt")
    ) {
      modifiers.add("Ctrl");
    }
    if (
      event.altKey &&
      currentModifier !== "Alt" &&
      currentModifier !== "RightAlt" &&
      !modifiers.has("RightAlt")
    ) {
      modifiers.add("Alt");
    }
  }

  if (
    event.shiftKey &&
    currentModifier !== "Shift" &&
    currentModifier !== "RightShift" &&
    !modifiers.has("RightShift")
  ) {
    modifiers.add("Shift");
  }
  if (
    event.metaKey &&
    currentModifier !== "Super" &&
    currentModifier !== "MetaRight" &&
    !modifiers.has("MetaRight")
  ) {
    modifiers.add("Super");
  }
}

function isAltGraphActive(event: KeyboardEvent): boolean {
  if (typeof event.getModifierState !== "function") {
    return false;
  }
  return event.getModifierState("AltGraph");
}

function isImplicitRightAltEvent(
  event: KeyboardEvent,
  modifiers: Set<string>,
  currentModifier?: string,
): boolean {
  return (
    event.ctrlKey &&
    event.altKey &&
    currentModifier !== "Ctrl" &&
    currentModifier !== "Alt" &&
    !modifiers.has("RightAlt") &&
    !modifiers.has("Alt")
  );
}

function buildAccelerator(modifiers: Set<string>, key: string): string {
  const parts = Array.from(modifiers).map((modifier) =>
    modifier === "RightAlt" ? "AltGr" : modifier,
  );
  return [...parts, key].join("+");
}

function buildModifierAccelerator(modifiers: Set<string>): string {
  return Array.from(modifiers).join("+");
}

function keyFromEvent(event: KeyboardEvent): string | undefined {
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }
  if (/^Digit[0-9]$/.test(event.code)) {
    return event.code.slice(5);
  }
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) {
    return event.code;
  }

  switch (event.code) {
    case "Space":
    case "Tab":
    case "Enter":
    case "Backspace":
    case "Delete":
    case "Insert":
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return event.code;
    case "Escape":
      return "Esc";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case "Minus":
    case "Equal":
    case "Comma":
    case "Period":
    case "Slash":
    case "Backslash":
    case "Semicolon":
    case "Quote":
    case "BracketLeft":
    case "BracketRight":
    case "Backquote":
      return SYMBOL_KEY_ACCELERATORS[event.code];
    case "PrintScreen":
      return "PrintScreen";
    default:
      return undefined;
  }
}
