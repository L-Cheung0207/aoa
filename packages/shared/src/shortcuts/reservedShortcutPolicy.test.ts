import { describe, expect, it } from "vitest";
import { normalizeShortcut, validateShortcut } from "./reservedShortcutPolicy";

describe("reserved shortcut policy", () => {
  it("allows non-reserved modified shortcuts", () => {
    expect(validateShortcut("Ctrl+Shift+K")).toEqual({ ok: true });
    expect(validateShortcut("Alt+Q")).toEqual({ ok: true });
    expect(validateShortcut("Ctrl+K+M")).toEqual({ ok: true });
    expect(validateShortcut("Ctrl+1+3")).toEqual({ ok: true });
  });

  it("allows the existing RightAlt single-key shortcut", () => {
    expect(validateShortcut("RightAlt")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+Space")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+RightShift")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+A")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+1")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+F5")).toEqual({ ok: true });
    expect(validateShortcut("RightAlt+Ctrl+C")).toEqual({ ok: true });
    expect(validateShortcut("AltGr+P")).toEqual({ ok: true });
  });

  it("rejects RightAlt combinations reserved by the system", () => {
    expect(validateShortcut("RightAlt+Tab")).toMatchObject({
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    });
    expect(validateShortcut("RightAlt+Esc")).toMatchObject({
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    });
    expect(validateShortcut("RightAlt+Super+L")).toMatchObject({
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    });
    expect(validateShortcut("RightAlt+Alt+Tab")).toMatchObject({
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    });
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
    expect(validateShortcut("Space")).toEqual({
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    });
  });

  it("rejects Typeless alphanumeric-only shortcuts", () => {
    expect(validateShortcut("A")).toMatchObject({
      ok: false,
      reason: "alphanumeric_only",
      message: "此快捷键已保留供系统使用"
    });
    expect(validateShortcut("1")).toMatchObject({
      ok: false,
      reason: "alphanumeric_only"
    });
    expect(validateShortcut("A+B")).toMatchObject({
      ok: false,
      reason: "alphanumeric_only"
    });
    expect(validateShortcut("`")).toMatchObject({
      ok: false,
      reason: "alphanumeric_only"
    });
  });

  it("rejects Typeless structural blacklist shortcuts", () => {
    expect(validateShortcut("Ctrl+Alt+Shift+K")).toMatchObject({
      ok: false,
      reason: "too_many_keys"
    });
    expect(validateShortcut("RightAlt+Ctrl+Shift+C")).toMatchObject({
      ok: false,
      reason: "too_many_keys",
      message: "快捷键最多支持 3 个按键"
    });
    expect(validateShortcut("Ctrl+A+B")).toMatchObject({
      ok: false,
      reason: "consecutive_letters"
    });
    expect(validateShortcut("Ctrl+1+2")).toMatchObject({
      ok: false,
      reason: "consecutive_numbers"
    });
  });

  it("allows non-alphanumeric single-key shortcuts", () => {
    expect(validateShortcut("Alt")).toEqual({ ok: true });
    expect(validateShortcut("Shift")).toEqual({ ok: true });
    expect(validateShortcut("Ctrl")).toEqual({ ok: true });
  });

  it("rejects shortcuts already used by another setting", () => {
    expect(
      validateShortcut("Ctrl+Shift+K", {
        existingShortcuts: ["RightAlt", "Ctrl+Shift+K"],
        currentShortcut: "RightAlt"
      })
    ).toMatchObject({
      ok: false,
      reason: "already_in_use"
    });

    expect(
      validateShortcut("Ctrl+Shift+K", {
        existingShortcuts: ["Ctrl+Shift+K"],
        currentShortcut: "Ctrl+Shift+K"
      })
    ).toMatchObject({
      ok: false,
      reason: "already_in_use",
      message: "此快捷键已被使用"
    });

    expect(
      validateShortcut("Ctrl+Shift+K", {
        existingShortcuts: ["RightAlt"],
        currentShortcut: "Ctrl+Shift+K"
      })
    ).toEqual({ ok: true });
  });

  it("normalizes equivalent shortcut spellings", () => {
    expect(normalizeShortcut("Control + Shift + k")).toBe("CTRL+SHIFT+K");
    expect(normalizeShortcut("Win+Print Screen")).toBe("SUPER+PRINTSCREEN");
    expect(normalizeShortcut("AltGr+P")).toBe("RIGHTALT+P");
  });
});
