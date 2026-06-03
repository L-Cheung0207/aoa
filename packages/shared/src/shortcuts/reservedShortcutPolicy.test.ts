import { describe, expect, it } from "vitest";
import { normalizeShortcut, validateShortcut } from "./reservedShortcutPolicy";

describe("reserved shortcut policy", () => {
  it("allows non-reserved modified shortcuts", () => {
    expect(validateShortcut("Ctrl+Shift+K")).toEqual({ ok: true });
    expect(validateShortcut("Alt+Q")).toEqual({ ok: true });
  });

  it("allows the existing RightAlt single-key shortcut", () => {
    expect(validateShortcut("RightAlt")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+Space")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+RightShift")).toEqual({ ok: true });
    expect(validateShortcut("AltGr+P")).toEqual({ ok: true });
  });

  it("rejects common system and editing shortcuts", () => {
    expect(validateShortcut("Ctrl+C")).toMatchObject({
      ok: false,
      reason: "reserved"
    });
    expect(validateShortcut("Alt+Tab")).toMatchObject({
      ok: false,
      reason: "reserved"
    });
    expect(validateShortcut("Win+L")).toMatchObject({
      ok: false,
      reason: "reserved"
    });
  });

  it("allows single-key shortcuts", () => {
    expect(validateShortcut("A")).toEqual({ ok: true });
    expect(validateShortcut("1")).toEqual({ ok: true });
    expect(validateShortcut("Space")).toEqual({ ok: true });
    expect(validateShortcut("Alt")).toEqual({ ok: true });
    expect(validateShortcut("Shift")).toEqual({ ok: true });
    expect(validateShortcut("Ctrl")).toEqual({ ok: true });
  });

  it("normalizes equivalent shortcut spellings", () => {
    expect(normalizeShortcut("Control + Shift + k")).toBe("CTRL+SHIFT+K");
    expect(normalizeShortcut("Win+Print Screen")).toBe("SUPER+PRINTSCREEN");
    expect(normalizeShortcut("AltGr+P")).toBe("RIGHTALT+P");
  });
});
