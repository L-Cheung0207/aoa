export type ShortcutValidationReason =
  | "reserved"
  | "single_key"
  | "alphanumeric_only"
  | "too_many_keys"
  | "consecutive_letters"
  | "consecutive_numbers"
  | "already_in_use";

export interface ShortcutValidationResult {
  ok: boolean;
  reason?: ShortcutValidationReason;
  message?: string;
}

export interface ShortcutValidationOptions {
  platform?: string;
  existingShortcuts?: string[] | undefined;
  currentShortcut?: string | undefined;
}

const SYSTEM_RESERVED_SHORTCUTS = new Set([
  "ALT+F4",
  "ALT+SPACE",
  "ALT+TAB",
  "ALT+SHIFT+TAB",
  "CTRL+ALT+DELETE",
  "CTRL+ESC",
  "CTRL+SHIFT+ESC",
  "SUPER+A",
  "SUPER+D",
  "SUPER+E",
  "SUPER+I",
  "SUPER+L",
  "SUPER+R",
  "SUPER+S",
  "SUPER+SPACE",
  "SUPER+TAB",
  "SUPER+SHIFT+S",
  "SUPER+PRINTSCREEN"
]);

const COMMON_RESERVED_SHORTCUTS = new Set([
  "CTRL+A",
  "CTRL+C",
  "CTRL+D",
  "CTRL+F",
  "CTRL+H",
  "CTRL+J",
  "CTRL+L",
  "CTRL+N",
  "CTRL+O",
  "CTRL+P",
  "CTRL+Q",
  "CTRL+R",
  "CTRL+S",
  "CTRL+T",
  "CTRL+U",
  "CTRL+V",
  "CTRL+W",
  "CTRL+X",
  "CTRL+Y",
  "CTRL+Z",
  "CTRL+SHIFT+T",
  "CTRL+TAB",
  "CTRL+SHIFT+TAB",
  "CTRL+SPACE",
  "SHIFT+SPACE",
  "ALT+SHIFT",
  "CTRL+SHIFT",
  "SPACE",
  "F5",
  "CTRL+F5",
  "PRINTSCREEN",
  "ALT+PRINTSCREEN"
]);

const PRODUCT_ALLOWED_SHORTCUTS = new Set([
  "RIGHTALT",
  "RIGHTALT+SPACE",
  "RIGHTALT+RIGHTSHIFT"
]);

const RIGHT_ALT_RESERVED_KEYS = new Set(["TAB", "ESC"]);

export function validateShortcut(
  shortcut: string,
  platformOrOptions: string | ShortcutValidationOptions = "win32"
): ShortcutValidationResult {
  const options =
    typeof platformOrOptions === "string"
      ? { platform: platformOrOptions }
      : platformOrOptions;
  const platform = options.platform ?? "win32";
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) {
    return {
      ok: false,
      reason: "single_key",
      message: "请按下快捷键"
    };
  }

  const parts = shortcutParts(normalized);
  if (parts.every(isTypelessAlphanumericOnlyPart)) {
    return {
      ok: false,
      reason: "alphanumeric_only",
      message: "此快捷键已保留供系统使用"
    };
  }

  if (parts.length > 3) {
    return {
      ok: false,
      reason: "too_many_keys",
      message: "快捷键最多支持 3 个按键"
    };
  }

  if (isAlreadyInUse(normalized, options)) {
    return {
      ok: false,
      reason: "already_in_use",
      message: "此快捷键已被使用"
    };
  }

  if (isRightAltReservedShortcut(parts)) {
    return {
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    };
  }

  if (parts.includes("RIGHTALT")) {
    return { ok: true };
  }

  if (PRODUCT_ALLOWED_SHORTCUTS.has(normalized)) {
    return { ok: true };
  }

  if (platform === "win32" && isWindowsReservedShortcut(normalized)) {
    return {
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    };
  }

  if (hasConsecutiveLetters(parts)) {
    return {
      ok: false,
      reason: "consecutive_letters",
      message: "请避免连续字母组合"
    };
  }

  if (hasConsecutiveNumbers(parts)) {
    return {
      ok: false,
      reason: "consecutive_numbers",
      message: "请避免连续数字组合"
    };
  }

  return { ok: true };
}

export function isReservedShortcut(
  shortcut: string,
  platform: string = "win32"
): boolean {
  return validateShortcut(shortcut, platform).reason === "reserved";
}

export function normalizeShortcut(shortcut: string): string {
  const parts = shortcut
    .split("+")
    .map((part) => normalizeShortcutPart(part))
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) {
    return "";
  }

  const modifiers = parts.filter(isShortcutModifier);
  const keys = parts.filter((part) => !isShortcutModifier(part));
  const orderedModifiers = [
    "CTRL",
    "ALT",
    "SHIFT",
    "SUPER",
    "COMMAND",
    "META",
    "CMD",
    "RIGHTALT"
  ].filter((modifier) => modifiers.includes(modifier));
  return [...orderedModifiers, ...keys].join("+");
}

function isWindowsReservedShortcut(normalized: string): boolean {
  return SYSTEM_RESERVED_SHORTCUTS.has(normalized) || COMMON_RESERVED_SHORTCUTS.has(normalized);
}

function shortcutParts(normalized: string): string[] {
  return normalized.split("+").filter(Boolean);
}

function isShortcutModifier(part: string): boolean {
  return [
    "CTRL",
    "ALT",
    "SHIFT",
    "SUPER",
    "COMMAND",
    "META",
    "CMD",
    "RIGHTALT"
  ].includes(part);
}

function isTypelessAlphanumericOnlyPart(part: string): boolean {
  return /^[A-Z0-9`]$/.test(part);
}

function isRightAltReservedShortcut(parts: string[]): boolean {
  return (
    parts.includes("RIGHTALT") &&
    parts.some((part) => RIGHT_ALT_RESERVED_KEYS.has(part))
  );
}

function hasConsecutiveLetters(parts: string[]): boolean {
  const letters = parts
    .filter((part) => /^[A-Z]$/.test(part))
    .map((part) => part.charCodeAt(0))
    .sort((left, right) => left - right);
  return hasAdjacentValues(letters);
}

function hasConsecutiveNumbers(parts: string[]): boolean {
  const numbers = parts
    .filter((part) => /^[0-9]$/.test(part))
    .map((part) => Number.parseInt(part, 10))
    .sort((left, right) => left - right);
  return hasAdjacentValues(numbers);
}

function hasAdjacentValues(values: number[]): boolean {
  for (let index = 0; index < values.length - 1; index += 1) {
    const current = values[index];
    const next = values[index + 1];
    if (current !== undefined && next !== undefined && next - current === 1) {
      return true;
    }
  }
  return false;
}

function isAlreadyInUse(
  normalized: string,
  options: ShortcutValidationOptions
): boolean {
  return (options.existingShortcuts ?? [])
    .map((shortcut) => normalizeShortcut(shortcut))
    .includes(normalized);
}

function normalizeShortcutPart(part: string): string | undefined {
  const trimmed = part.trim();
  if (!trimmed) {
    return undefined;
  }

  const upper = trimmed.toUpperCase();
  switch (upper) {
    case "CONTROL":
    case "CTRL":
      return "CTRL";
    case "OPTION":
    case "ALT":
      return "ALT";
    case "SHIFT":
      return "SHIFT";
    case "WIN":
    case "WINDOWS":
    case "SUPER":
      return "SUPER";
    case "COMMAND":
    case "CMD":
      return "COMMAND";
    case "META":
      return "META";
    case "RIGHT ALT":
    case "RIGHTALT":
    case "ALTGR":
    case "ALT GRAPH":
      return "RIGHTALT";
    case "RIGHT SHIFT":
    case "RIGHTSHIFT":
      return "RIGHTSHIFT";
    case "ESCAPE":
      return "ESC";
    case "ARROWUP":
      return "UP";
    case "ARROWDOWN":
      return "DOWN";
    case "ARROWLEFT":
      return "LEFT";
    case "ARROWRIGHT":
      return "RIGHT";
    case "PRINTSCREEN":
    case "PRINT SCREEN":
      return "PRINTSCREEN";
    default:
      return upper;
  }
}
