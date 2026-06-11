import { describe, expect, it, vi } from "vitest";
import { app, nativeTheme } from "electron";
import {
  applyLaunchAtLogin,
  applyNativeTheme,
  formatShortcutHelpLabel,
  formatTrayTooltip,
  resolveShortcutTriggerOverlayLayout,
  resolveShortcutTriggerOverlayAction,
  resolveOverlayVisibility,
  resolveOverlayWindowLayout,
  shouldReplayMicErrorOverlay,
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
    expect(resolveOverlayVisibility("success")).toBe("hide");
    expect(resolveOverlayVisibility("listening")).toBe("show");
    expect(resolveOverlayVisibility("canceled")).toBe("show");
    expect(resolveOverlayVisibility("processing")).toBe("show");
    expect(resolveOverlayVisibility("inserting")).toBe("show");
    expect(resolveOverlayVisibility("result")).toBe("show");
  });

  it("shows microphone errors even when no recording pill was visible yet", () => {
    expect(resolveOverlayVisibility("error", "mic")).toBe("show");
    expect(resolveOverlayVisibility("error", "no_selection")).toBe("show");
    expect(resolveOverlayVisibility("error", "transcription")).toBe("keep");
  });

  it("defers idle starts to the renderer and shows already-active shortcuts", () => {
    expect(resolveShortcutTriggerOverlayAction()).toBe("show");
    expect(resolveShortcutTriggerOverlayAction("direct", "idle")).toBe("defer");
    expect(resolveShortcutTriggerOverlayAction("direct", "success")).toBe("defer");
    expect(resolveShortcutTriggerOverlayAction("processSelection", "idle")).toBe("defer");
    expect(resolveShortcutTriggerOverlayAction("processSelection", "listening")).toBe("show");
  });

  it("keeps the microphone error layout stable when the shortcut is pressed again", () => {
    expect(
      resolveShortcutTriggerOverlayLayout("error", "direct", {
        reason: "mic"
      })
    ).toBe("micError");
    expect(shouldReplayMicErrorOverlay("error", "mic")).toBe(true);
    expect(shouldReplayMicErrorOverlay("error", "transcription")).toBe(false);
    expect(shouldReplayMicErrorOverlay("idle", "mic")).toBe(false);
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

  it("keeps tall enough layouts for listening and thinking states", () => {
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
    expect(
      resolveOverlayWindowLayout("processing", "translate", {
        busyHintVisible: true
      })
    ).toBe("thinkingPill");
    expect(resolveOverlayWindowLayout("error", undefined, { reason: "mic" })).toBe("micError");
    expect(resolveOverlayWindowLayout("error", undefined, { reason: "no_selection" })).toBe("selectionError");
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
