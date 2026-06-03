import { describe, expect, it, vi } from "vitest";
import { app, nativeTheme } from "electron";
import {
  applyLaunchAtLogin,
  applyNativeTheme,
  formatShortcutHelpLabel,
  formatTrayTooltip,
  resolveShortcutTriggerOverlayAction,
  resolveOverlayVisibility,
  resolveOverlayWindowLayout,
  shouldShowShortcutHelpForState
} from "./bootstrap";

vi.mock("electron", () => ({
  app: {
    setLoginItemSettings: vi.fn()
  },
  nativeTheme: {
    themeSource: "system"
  }
}));

describe("bootstrap overlay visibility", () => {
  it("keeps the overlay visible for the LLM result state", () => {
    expect(resolveOverlayVisibility("result")).toBe("show");
    expect(formatTrayTooltip("result")).toBe("Voice AI · 結果");
  });

  it("hides the overlay for idle and shows it only after listening is reported", () => {
    expect(resolveOverlayVisibility("idle")).toBe("hide");
    expect(resolveOverlayVisibility("listening")).toBe("show");
  });

  it("defers overlay display until the renderer reports a recording state", () => {
    expect(resolveShortcutTriggerOverlayAction()).toBe("defer");
  });

  it("syncs native menus with the configured app theme", () => {
    applyNativeTheme("dark");
    expect(nativeTheme.themeSource).toBe("dark");

    applyNativeTheme("light");
    expect(nativeTheme.themeSource).toBe("light");
  });

  it("syncs launch-at-login with Electron login item settings", () => {
    applyLaunchAtLogin(true);
    expect(app.setLoginItemSettings).toHaveBeenLastCalledWith({
      openAtLogin: true,
      openAsHidden: true
    });

    applyLaunchAtLogin(false);
    expect(app.setLoginItemSettings).toHaveBeenLastCalledWith({
      openAtLogin: false,
      openAsHidden: true
    });
  });

  it("keeps the taller pill layout throughout listening to avoid jitter", () => {
    expect(resolveOverlayWindowLayout("listening", "direct")).toBe("translatePill");
    expect(
      resolveOverlayWindowLayout("listening", "direct", {
        recordingLimitWarning: true
      })
    ).toBe("recordingLimitWarning");
    expect(resolveOverlayWindowLayout("listening", "translate")).toBe("translatePill");
    expect(resolveOverlayWindowLayout("listening", "processSelection")).toBe("translatePill");
    expect(resolveOverlayWindowLayout("listening", undefined)).toBe("translatePill");
    expect(resolveOverlayWindowLayout("processing", "translate")).toBe("thinkingPill");
    expect(resolveOverlayWindowLayout("inserting", "processSelection")).toBe("thinkingPill");
    expect(resolveOverlayWindowLayout("canceled", "translate")).toBe("canceledPill");
    expect(resolveOverlayWindowLayout("result", "translate")).toBe("result");
    expect(resolveOverlayWindowLayout("shortcutHelp", undefined)).toBe("shortcutHelp");
  });

  it("formats shortcut labels for the long-press help panel", () => {
    expect(formatShortcutHelpLabel("RightAlt")).toBe("Alt");
    expect(formatShortcutHelpLabel("RightAlt+Space")).toBe("Alt+Space");
    expect(formatShortcutHelpLabel("RightAlt+RightShift")).toBe("Alt+Shift");
  });

  it("shows shortcut help only while no recording state is active", () => {
    expect(shouldShowShortcutHelpForState("idle")).toBe(true);
    expect(shouldShowShortcutHelpForState("success")).toBe(false);
    expect(shouldShowShortcutHelpForState("listening")).toBe(false);
    expect(shouldShowShortcutHelpForState("processing")).toBe(false);
    expect(shouldShowShortcutHelpForState("inserting")).toBe(false);
    expect(shouldShowShortcutHelpForState("result")).toBe(false);
    expect(shouldShowShortcutHelpForState("error")).toBe(false);
    expect(shouldShowShortcutHelpForState("canceled")).toBe(false);
  });
});
