export type ShortcutValidationReason = "reserved" | "single_key";

export interface ShortcutValidationResult {
  ok: boolean;
  reason?: ShortcutValidationReason;
  message?: string;
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
  "F5",
  "CTRL+F5",
  "PRINTSCREEN",
  "ALT+PRINTSCREEN"
]);

export function validateShortcut(
  shortcut: string,
  platform: string = "win32"
): ShortcutValidationResult {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) {
    return {
      ok: false,
      reason: "single_key",
      message: "请按下快捷键"
    };
  }

  if (platform === "win32" && isWindowsReservedShortcut(normalized)) {
    return {
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
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

  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
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
  return [...orderedModifiers, key].join("+");
}

function isWindowsReservedShortcut(normalized: string): boolean {
  return SYSTEM_RESERVED_SHORTCUTS.has(normalized) || COMMON_RESERVED_SHORTCUTS.has(normalized);
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
