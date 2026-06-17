import { describe, expect, it, vi } from "vitest";
import { app, nativeTheme } from "electron";
import {
  applyLaunchAtLogin,
  applyNativeTheme,
  configureAppIdentity,
  formatShortcutHelpLabel,
  handoffInstallerLaunch,
  launchInstalledAppHome,
  parseSilentUpdateInstallDir,
  formatTrayTooltip,
  handleOpenMicrophoneHelpRequest,
  runLoggedBootstrapAction,
  logDirectIpcError,
  logDirectIpcRequest,
  logDirectIpcResponse,
  runLoggedTrayAction,
  resolveShortcutTriggerOverlayLayout,
  resolveShortcutTriggerOverlayAction,
  resolveOverlayVisibility,
  resolveOverlayWindowLayout,
  shouldRunScheduledOverlayHide,
  shouldOpenHomeOnLaunch,
  firstConfiguredValue,
  resolveVersionCheckEndpoint,
  resolvePackagedVersionPhase,
  redactUrlForLog,
  summarizeArgvForLog,
  shouldReplayMicErrorOverlay,
  shouldShowShortcutHelpForState
} from "./bootstrap";

vi.mock("electron", () => ({
  app: {
    setAppUserModelId: vi.fn(),
    setName: vi.fn(),
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

  it("drops stale delayed hides after the overlay has become active again", () => {
    expect(shouldRunScheduledOverlayHide("success")).toBe(true);
    expect(shouldRunScheduledOverlayHide("idle")).toBe(true);
    expect(shouldRunScheduledOverlayHide("processing")).toBe(false);
    expect(shouldRunScheduledOverlayHide("listening")).toBe(false);
    expect(shouldRunScheduledOverlayHide("error", "transcription")).toBe(false);
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

  it("keeps the compact layout when a shortcut stops active listening", () => {
    expect(resolveShortcutTriggerOverlayLayout("listening", "direct")).toBe("translatePill");
    expect(
      resolveShortcutTriggerOverlayLayout("listening", "translate", {
        activeMode: "translate"
      })
    ).toBe("translatePill");
  });

  it("keeps the listening layout when a shortcut targets a different active mode", () => {
    expect(
      resolveShortcutTriggerOverlayLayout("listening", "translate", {
        activeMode: "processSelection"
      })
    ).toBe("translatePill");
  });

  it("keeps the compact layout when a shortcut is pressed during processing", () => {
    expect(resolveShortcutTriggerOverlayLayout("processing", "direct")).toBe("translatePill");
    expect(resolveShortcutTriggerOverlayLayout("inserting", "translate")).toBe("translatePill");
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
    expect(resolveOverlayWindowLayout("processing", "translate")).toBe("translatePill");
    expect(resolveOverlayWindowLayout("inserting", "processSelection")).toBe("translatePill");
    expect(
      resolveOverlayWindowLayout("processing", "translate", {
        busyHintVisible: true
      })
    ).toBe("busyHint");
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

  it("shows shortcut help while idle or after a successful recording", () => {
    expect(shouldShowShortcutHelpForState("idle")).toBe(true);
    expect(shouldShowShortcutHelpForState("success")).toBe(true);
    expect(shouldShowShortcutHelpForState("listening")).toBe(false);
    expect(shouldShowShortcutHelpForState("processing")).toBe(false);
    expect(shouldShowShortcutHelpForState("inserting")).toBe(false);
    expect(shouldShowShortcutHelpForState("result")).toBe(false);
    expect(shouldShowShortcutHelpForState("error")).toBe(false);
    expect(shouldShowShortcutHelpForState("canceled")).toBe(false);
  });

  it("hides the overlay and opens the microphone help in the home window", () => {
    const overlayWindow = {
      isDestroyed: vi.fn(() => false),
      isVisible: vi.fn(() => true),
      hide: vi.fn(),
    };
    const overlayWindowFollower = {
      stop: vi.fn(),
    };
    const cancelPendingOverlayHide = vi.fn();
    const openHomeWindow = vi.fn();

    handleOpenMicrophoneHelpRequest({
      overlayWindow,
      overlayWindowFollower,
      cancelPendingOverlayHide,
      openHomeWindow,
    });

    expect(cancelPendingOverlayHide).toHaveBeenCalledTimes(1);
    expect(overlayWindowFollower.stop).toHaveBeenCalledTimes(1);
    expect(overlayWindow.hide).toHaveBeenCalledTimes(1);
    expect(openHomeWindow).toHaveBeenCalledWith({
      section: "home",
      showMicrophoneHelp: true,
    });
  });

  it("resolves packaged version phase from build-time configuration", () => {
    expect(resolvePackagedVersionPhase(undefined)).toBe("ALPHA");
    expect(resolvePackagedVersionPhase("")).toBe("ALPHA");
    expect(resolvePackagedVersionPhase(" beta ")).toBe("BETA");
    expect(resolvePackagedVersionPhase("RELEASE")).toBe("RELEASE");
    expect(resolvePackagedVersionPhase("PREVIEW")).toBe("ALPHA");
  });

  it("resolves update endpoint with environment-style overrides first", () => {
    expect(firstConfiguredValue("", " http://config.example/check ")).toBe(
      "http://config.example/check"
    );
    expect(
      resolveVersionCheckEndpoint({
        backendBaseUrl: "http://backend.example/aoa_api",
        versionCheckUrl: " http://updates.example/appVersion/check "
      })
    ).toBe("http://updates.example/appVersion/check");
    expect(
      resolveVersionCheckEndpoint({
        backendBaseUrl: " http://backend.example/aoa_api ",
        versionCheckUrl: undefined
      })
    ).toBe("http://backend.example/aoa_api/appVersion/check");
  });

  it("redacts secret URL parameters for bootstrap logs", () => {
    expect(
      redactUrlForLog("wss://api.example/ws?AccessCode=secret&token=other&keep=yes")
    ).toBe("wss://api.example/ws?AccessCode=***&token=***&keep=yes");
  });

  it("sets the Windows app identity used by the taskbar", () => {
    configureAppIdentity("win32");

    expect(app.setName).toHaveBeenCalledWith("Voice Assistant");
    expect(app.setAppUserModelId).toHaveBeenCalledWith("com.ctm.voice-assistant");
  });

  it("summarizes argv for logs without exposing local paths", () => {
    const summary = summarizeArgvForLog([
      "C:/Users/Alex/AppData/Local/Programs/Voice Assistant/Voice Assistant.exe",
      "--install-dir=C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
      "/uninstall",
      "C:/Users/Alex/Documents/private.txt"
    ]);

    expect(summary).toEqual({
      count: 4,
      flags: ["--install-dir", "/uninstall"]
    });
    expect(JSON.stringify(summary)).not.toContain("Alex");
    expect(JSON.stringify(summary)).not.toContain("private.txt");
  });
});

describe("installer launch handoff", () => {
  it("parses the silent update install directory from installer-shell arguments", () => {
    expect(
      parseSilentUpdateInstallDir([
        "Voice Assistant Setup.exe",
        "--silent-update",
        "--install-dir=C:/Users/Alex/AppData/Local/Programs/Voice Assistant"
      ])
    ).toBe("C:/Users/Alex/AppData/Local/Programs/Voice Assistant");
    expect(
      parseSilentUpdateInstallDir([
        "Voice Assistant Setup.exe",
        "--install-dir",
        "C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
        "--silent-update"
      ])
    ).toBe("C:/Users/Alex/AppData/Local/Programs/Voice Assistant");
    expect(parseSilentUpdateInstallDir(["Voice Assistant Setup.exe"])).toBeUndefined();
    expect(
      parseSilentUpdateInstallDir(["Voice Assistant Setup.exe", "--silent-update"])
    ).toBeUndefined();
  });

  it("detects explicit home launch arguments", () => {
    expect(shouldOpenHomeOnLaunch(["app.exe", "--open-home"])).toBe(true);
    expect(shouldOpenHomeOnLaunch(["app.exe", "/open-home"])).toBe(true);
    expect(shouldOpenHomeOnLaunch(["app.exe"])).toBe(false);
  });

  it("starts the installed app with a home launch argument", () => {
    const child = { unref: vi.fn() };
    const spawnProcess = vi.fn(() => child);

    launchInstalledAppHome({
      installDir: "C:/Tools/Voice Assistant",
      spawnProcess: spawnProcess as never,
    });

    expect(spawnProcess).toHaveBeenCalledWith(
      expect.stringContaining("Voice Assistant.exe"),
      ["--open-home"],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      }),
    );
    expect(child.unref).toHaveBeenCalled();
  });

  it("hides and destroys the installer window before deferred launch and immediate exit", () => {
    vi.useFakeTimers();
    const window = {
      isDestroyed: vi.fn(() => false),
      hide: vi.fn(),
      destroy: vi.fn(),
    };
    const launch = vi.fn();
    const exitApp = vi.fn();

    handoffInstallerLaunch({
      installerWindow: window,
      installDir: "C:/Tools/Voice Assistant",
      launch,
      exitApp,
    });

    expect(window.hide).toHaveBeenCalled();
    expect(window.destroy).toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
    expect(exitApp).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();

    expect(launch).toHaveBeenCalledWith({
      installDir: "C:/Tools/Voice Assistant",
    });
    expect(exitApp).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });
});

describe("direct bootstrap IPC logging", () => {
  it("logs direct IPC request lifecycle with sanitized summaries", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message)
    };

    logDirectIpcRequest(logger, "voice:installer-install", {
      installDir: "C:/Tools",
      createDesktopShortcut: true,
      selectedText: "secret text"
    });
    logDirectIpcResponse(logger, "voice:installer-install", "ok");
    logDirectIpcError(logger, "voice:installer-install", new Error("install failed"));

    expect(logs).toEqual([
      "[ipc-direct] request channel=voice:installer-install input={\"installDir\":\"C:/Tools\",\"createDesktopShortcut\":true,\"selectedTextLength\":11}",
      "[ipc-direct] response channel=voice:installer-install status=ok"
    ]);
    expect(warnings).toEqual([
      "[ipc-direct] response channel=voice:installer-install status=error error=\"install failed\""
    ]);
    expect([...logs, ...warnings].join("\n")).not.toContain("secret text");
  });

  it("logs launch actions with summarized argv", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message)
    };
    const action = vi.fn();

    runLoggedBootstrapAction(
      logger,
      "open-home-on-launch",
      {
        argv: summarizeArgvForLog([
          "C:/Users/Alex/AppData/Local/Programs/Voice Assistant/Voice Assistant.exe",
          "--open-home",
          "C:/Users/Alex/Documents/private.txt"
        ])
      },
      action
    );

    expect(action).toHaveBeenCalledTimes(1);
    expect(logs).toEqual([
      "[bootstrap-action] action=open-home-on-launch input={\"argv\":{\"count\":3,\"flags\":[\"--open-home\"]}}",
      "[bootstrap-action] action=open-home-on-launch status=ok"
    ]);
    expect(warnings).toEqual([]);
    expect(logs.join("\n")).not.toContain("Alex");
    expect(logs.join("\n")).not.toContain("private.txt");
  });
});

describe("tray action logging", () => {
  it("logs tray action lifecycle with sanitized summaries", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message)
    };
    const action = vi.fn();

    runLoggedTrayAction(
      logger,
      "open-about",
      {
        section: "about",
        token: "secret"
      },
      action
    );

    expect(action).toHaveBeenCalledTimes(1);
    expect(logs).toEqual([
      "[tray] action action=open-about input={\"section\":\"about\",\"token\":\"***\"}",
      "[tray] action action=open-about status=ok"
    ]);
    expect(warnings).toEqual([]);
    expect(logs.join("\n")).not.toContain("secret");
  });

  it("logs tray action failures before rethrowing", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message)
    };
    const error = new Error("quit failed");

    expect(() =>
      runLoggedTrayAction(logger, "quit", undefined, () => {
        throw error;
      })
    ).toThrow(error);

    expect(logs).toEqual(["[tray] action action=quit"]);
    expect(warnings).toEqual([
      "[tray] action action=quit status=error error=\"quit failed\""
    ]);
  });
});
