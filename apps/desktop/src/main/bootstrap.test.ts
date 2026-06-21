import { readFileSync } from "node:fs";
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
  resolveInstalledAppLaunchTarget,
  resolvePostInstallLaunchTarget,
  runLoggedTrayAction,
  resolveShortcutTriggerOverlayLayout,
  resolveShortcutTriggerOverlayAction,
  resolveOverlayVisibility,
  resolveOverlayWindowLayout,
  shouldRunScheduledOverlayHide,
  shouldOpenHomeOnLaunch,
  shouldOpenPostInstallLoginOnLaunch,
  firstConfiguredValue,
  createAuthenticatedIpcMainAdapter,
  createDevelopmentAwareBackendClient,
  createLazyUpdateService,
  wireLoginSetupWindowVisibility,
  resolveDevelopmentRuntime,
  resolvePackagedResourceRuntime,
  resolveAuthDevicePlatform,
  runAuthenticatedDirectIpc,
  runStartupGate,
  resolveVersionCheckEndpoint,
  resolvePackagedVersionPhase,
  redactUrlForLog,
  summarizeArgvForLog,
  shouldReplayMicErrorOverlay,
  shouldShowShortcutHelpForState,
  createLoginSetupShortcutCaptureController,
  createElectronNativeWindowHandleCandidates,
  isCurrentAppWindowHandle,
  normalizeNativeWindowHandleToken,
} from "./bootstrap";

vi.mock("electron", () => ({
  app: {
    setAppUserModelId: vi.fn(),
    setName: vi.fn(),
    setLoginItemSettings: vi.fn(),
    getAppPath: vi.fn(() => "D:/repo/aoa/apps/desktop"),
  },
  nativeTheme: {
    themeSource: "system",
  },
}));

describe("bootstrap backend client wiring", () => {
  it("uses the real HTTP backend client instead of the mock backend", () => {
    const source = readFileSync(
      new URL("./bootstrap.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("createHttpBackendClient");
    expect(source).toContain("authService.getAccessTokenForRequest()");
    expect(source).not.toContain("createMockBackendClient");
  });
});

describe("bootstrap runtime mode", () => {
  it("treats renderer dev server runs as development even when Electron reports packaged", () => {
    expect(
      resolveDevelopmentRuntime({
        isPackaged: true,
        electronRendererUrl: "http://localhost:5173",
      }),
    ).toBe(true);
  });

  it("keeps installed packaged runs out of development mode", () => {
    expect(
      resolveDevelopmentRuntime({
        isPackaged: true,
        electronRendererUrl: undefined,
      }),
    ).toBe(false);
  });

  it("uses development resource paths when a branded dev bundle reports packaged", () => {
    expect(
      resolvePackagedResourceRuntime({
        isDevelopmentRuntime: true,
      }),
    ).toBe(false);
  });

  it("uses packaged resource paths outside development runtime", () => {
    expect(
      resolvePackagedResourceRuntime({
        isDevelopmentRuntime: false,
      }),
    ).toBe(true);
  });

  it("maps Node platforms to auth device platforms", () => {
    expect(resolveAuthDevicePlatform("darwin")).toBe("mac");
    expect(resolveAuthDevicePlatform("linux")).toBe("linux");
    expect(resolveAuthDevicePlatform("win32")).toBe("windows");
  });
});

describe("login setup shortcut capture controller", () => {
  it("clears setup shortcut capture on login setup completion and resumes global shortcuts once", () => {
    let shortcutCaptureDepth = 0;
    const suspendGlobalShortcuts = vi.fn();
    const resumeGlobalShortcuts = vi.fn();
    const ensureWindowGuards = vi.fn();
    const startShortcutCaptureSession = vi.fn();
    const stopShortcutCaptureSession = vi.fn();
    const controller = createLoginSetupShortcutCaptureController({
      getShortcutCaptureDepth: () => shortcutCaptureDepth,
      suspendGlobalShortcuts,
      resumeGlobalShortcuts,
      ensureWindowGuards,
      startShortcutCaptureSession,
      stopShortcutCaptureSession,
    });

    controller.setActive(true);
    controller.clear();
    controller.setActive(false);

    expect(controller.isActive()).toBe(false);
    expect(suspendGlobalShortcuts).toHaveBeenCalledTimes(1);
    expect(resumeGlobalShortcuts).toHaveBeenCalledTimes(1);
    expect(resumeGlobalShortcuts).toHaveBeenCalledWith({
      broadcastConflicts: false,
    });
    expect(ensureWindowGuards).toHaveBeenCalledTimes(1);
    expect(startShortcutCaptureSession).toHaveBeenCalledTimes(1);
    expect(stopShortcutCaptureSession).toHaveBeenCalledTimes(1);

    shortcutCaptureDepth = 1;
    controller.setActive(true);
    controller.clear();
    expect(suspendGlobalShortcuts).toHaveBeenCalledTimes(1);
    expect(resumeGlobalShortcuts).toHaveBeenCalledTimes(1);
    expect(stopShortcutCaptureSession).toHaveBeenCalledTimes(2);
  });
});

describe("current app window handle detection", () => {
  const createNativeHandleBuffer = (handle: bigint): Buffer => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(handle, 0);
    return buffer;
  };

  const createWindow = (
    handle: bigint,
    options: { destroyed?: boolean } = {},
  ) => ({
    isDestroyed: () => options.destroyed === true,
    getNativeWindowHandle: () => createNativeHandleBuffer(handle),
  });

  it("matches macOS foreground process identifiers", () => {
    expect(
      isCurrentAppWindowHandle("4321", {
        processIds: [1234, 4321],
        windows: [],
        matchProcessIds: true,
      }),
    ).toBe(true);
  });

  it("matches Windows HWND values from Electron native window handles", () => {
    expect(
      isCurrentAppWindowHandle("12345", {
        processIds: [],
        windows: [createWindow(12345n)],
      }),
    ).toBe(true);
  });

  it("ignores destroyed Electron windows and external handles", () => {
    expect(
      isCurrentAppWindowHandle("12345", {
        processIds: [4321],
        windows: [createWindow(12345n, { destroyed: true })],
      }),
    ).toBe(false);
    expect(
      isCurrentAppWindowHandle("67890", {
        processIds: [4321],
        windows: [createWindow(12345n)],
      }),
    ).toBe(false);
  });

  it("does not treat process identifiers as handles on Windows-style matching", () => {
    expect(
      isCurrentAppWindowHandle("4321", {
        processIds: [4321],
        windows: [],
        matchProcessIds: false,
      }),
    ).toBe(false);
  });

  it("normalizes decimal and hex handle formats", () => {
    expect(normalizeNativeWindowHandleToken("0x3039")).toBe("12345");
    expect(
      createElectronNativeWindowHandleCandidates(
        createNativeHandleBuffer(12345n),
      ).has("12345"),
    ).toBe(true);
  });
});

describe("development-aware backend client", () => {
  it("returns local bootstrap data for development auth bypass sessions", async () => {
    const realBackendClient = {
      bootstrap: vi.fn(async () => {
        throw new Error("real backend should not be called");
      }),
      getServiceStatus: vi.fn(),
      createTranscriptionSession: vi.fn(),
      postprocess: vi.fn(),
    };
    const backendClient = createDevelopmentAwareBackendClient({
      backendClient: realBackendClient,
      isDevelopmentRuntime: true,
      getAuthSessionSnapshot: () => ({
        status: "authenticated",
        featureFlags: {
          developmentAuthBypass: true,
        },
      }),
    });

    await expect(
      backendClient.bootstrap({
        installationId: "install-dev",
        deviceName: "dev-machine",
        platform: "windows",
        appVersion: "0.1.0",
      }),
    ).resolves.toEqual({
      clientId: "dev-install-dev",
      serviceStatus: "ok",
      featureFlags: {
        realtimeTranscription: true,
        history: true,
      },
      anonymousQuota: {
        transcriptionSecondsRemaining: 3600,
      },
    });
    expect(realBackendClient.bootstrap).not.toHaveBeenCalled();
  });

  it("delegates bootstrap outside development auth bypass sessions", async () => {
    const realSnapshot = {
      clientId: "real-client",
      serviceStatus: "ok" as const,
      featureFlags: {
        realtimeTranscription: false,
        history: true,
      },
      anonymousQuota: {
        transcriptionSecondsRemaining: 120,
      },
    };
    const realBackendClient = {
      bootstrap: vi.fn(async () => realSnapshot),
      getServiceStatus: vi.fn(),
      createTranscriptionSession: vi.fn(),
      postprocess: vi.fn(),
    };
    const request = {
      installationId: "install-real",
      deviceName: "user-machine",
      platform: "windows" as const,
      appVersion: "0.1.0",
    };

    await expect(
      createDevelopmentAwareBackendClient({
        backendClient: realBackendClient,
        isDevelopmentRuntime: false,
        getAuthSessionSnapshot: () => ({
          status: "authenticated",
          featureFlags: {
            developmentAuthBypass: true,
          },
        }),
      }).bootstrap(request),
    ).resolves.toBe(realSnapshot);

    expect(realBackendClient.bootstrap).toHaveBeenCalledWith(request);
  });
});

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
    expect(resolveShortcutTriggerOverlayAction("direct", "success")).toBe(
      "defer",
    );
    expect(
      resolveShortcutTriggerOverlayAction("processSelection", "idle"),
    ).toBe("defer");
    expect(
      resolveShortcutTriggerOverlayAction("processSelection", "listening"),
    ).toBe("show");
  });

  it("keeps the microphone error layout stable when the shortcut is pressed again", () => {
    expect(
      resolveShortcutTriggerOverlayLayout("error", "direct", {
        reason: "mic",
      }),
    ).toBe("micError");
    expect(shouldReplayMicErrorOverlay("error", "mic")).toBe(true);
    expect(shouldReplayMicErrorOverlay("error", "transcription")).toBe(false);
    expect(shouldReplayMicErrorOverlay("idle", "mic")).toBe(false);
  });

  it("keeps the compact layout when a shortcut stops active listening", () => {
    expect(resolveShortcutTriggerOverlayLayout("listening", "direct")).toBe(
      "translatePill",
    );
    expect(
      resolveShortcutTriggerOverlayLayout("listening", "translate", {
        activeMode: "translate",
      }),
    ).toBe("translatePill");
  });

  it("keeps the listening layout when a shortcut targets a different active mode", () => {
    expect(
      resolveShortcutTriggerOverlayLayout("listening", "translate", {
        activeMode: "processSelection",
      }),
    ).toBe("translatePill");
  });

  it("keeps the compact layout when a shortcut is pressed during processing", () => {
    expect(resolveShortcutTriggerOverlayLayout("processing", "direct")).toBe(
      "translatePill",
    );
    expect(resolveShortcutTriggerOverlayLayout("inserting", "translate")).toBe(
      "translatePill",
    );
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
      openAsHidden: true,
    });

    applyLaunchAtLogin(false);
    expect(app.setLoginItemSettings).toHaveBeenLastCalledWith({
      openAtLogin: false,
      openAsHidden: true,
    });
  });

  it("keeps tall enough layouts for listening and thinking states", () => {
    expect(resolveOverlayWindowLayout("listening", "direct")).toBe(
      "translatePill",
    );
    expect(
      resolveOverlayWindowLayout("listening", "direct", {
        recordingLimitWarning: true,
      }),
    ).toBe("recordingLimitWarning");
    expect(resolveOverlayWindowLayout("listening", "translate")).toBe(
      "translatePill",
    );
    expect(resolveOverlayWindowLayout("listening", "processSelection")).toBe(
      "translatePill",
    );
    expect(resolveOverlayWindowLayout("listening", undefined)).toBe(
      "translatePill",
    );
    expect(resolveOverlayWindowLayout("processing", "translate")).toBe(
      "translatePill",
    );
    expect(resolveOverlayWindowLayout("inserting", "processSelection")).toBe(
      "translatePill",
    );
    expect(
      resolveOverlayWindowLayout("processing", "translate", {
        busyHintVisible: true,
      }),
    ).toBe("busyHint");
    expect(
      resolveOverlayWindowLayout("error", undefined, { reason: "mic" }),
    ).toBe("micError");
    expect(
      resolveOverlayWindowLayout("error", undefined, {
        reason: "no_selection",
      }),
    ).toBe("selectionError");
    expect(resolveOverlayWindowLayout("canceled", "translate")).toBe(
      "canceledPill",
    );
    expect(resolveOverlayWindowLayout("result", "translate")).toBe("result");
    expect(resolveOverlayWindowLayout("shortcutHelp", undefined)).toBe(
      "shortcutHelp",
    );
  });

  it("formats shortcut labels for the long-press help panel", () => {
    expect(formatShortcutHelpLabel("RightAlt")).toBe("Alt");
    expect(formatShortcutHelpLabel("RightAlt+Space")).toBe("Alt+Space");
    expect(formatShortcutHelpLabel("RightAlt+RightShift")).toBe("Alt+Shift");
    expect(formatShortcutHelpLabel("MetaRight")).toBe("Right Cmd");
    expect(formatShortcutHelpLabel("MetaRight+/")).toBe("Right Cmd+/");
    expect(formatShortcutHelpLabel("MetaRight+RightShift")).toBe(
      "Right Cmd+Right Shift",
    );
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
      "http://config.example/check",
    );
    expect(
      resolveVersionCheckEndpoint({
        backendBaseUrl: "http://backend.example/aoa_api",
        versionCheckUrl: " http://updates.example/appVersion/check ",
      }),
    ).toBe("http://updates.example/appVersion/check");
    expect(
      resolveVersionCheckEndpoint({
        backendBaseUrl: " http://backend.example/aoa_api ",
        versionCheckUrl: undefined,
      }),
    ).toBe("http://backend.example/aoa_api/appVersion/check");
  });

  it("redacts secret URL parameters for bootstrap logs", () => {
    expect(
      redactUrlForLog(
        "wss://api.example/ws?AccessCode=secret&token=other&keep=yes",
      ),
    ).toBe("wss://api.example/ws?AccessCode=***&token=***&keep=yes");
  });

  it("sets the Windows app identity used by the taskbar", () => {
    configureAppIdentity("win32");

    expect(app.setName).toHaveBeenCalledWith("Voice Assistant");
    expect(app.setAppUserModelId).toHaveBeenCalledWith(
      "com.ctm.voice-assistant",
    );
  });

  it("summarizes argv for logs without exposing local paths", () => {
    const summary = summarizeArgvForLog([
      "C:/Users/Alex/AppData/Local/Programs/Voice Assistant/Voice Assistant.exe",
      "--install-dir=C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
      "/uninstall",
      "C:/Users/Alex/Documents/private.txt",
    ]);

    expect(summary).toEqual({
      count: 4,
      flags: ["--install-dir", "/uninstall"],
    });
    expect(JSON.stringify(summary)).not.toContain("Alex");
    expect(JSON.stringify(summary)).not.toContain("private.txt");
  });
});

describe("installer launch handoff", () => {
  it("resolves the packaged Windows installed app launch target", () => {
    expect(
      resolveInstalledAppLaunchTarget({
        installDir: "C:/Tools/Voice Assistant",
        platform: "win32",
      }),
    ).toEqual({
      executablePath: "C:/Tools/Voice Assistant/Voice Assistant.exe",
      args: ["--open-home"],
    });
  });

  it("resolves the packaged macOS installed app launch target", () => {
    expect(
      resolveInstalledAppLaunchTarget({
        installDir: "/Applications",
        platform: "darwin",
      }),
    ).toEqual({
      executablePath:
        "/Applications/Voice Assistant.app/Contents/MacOS/Voice Assistant",
      args: ["--open-home"],
    });
  });

  it("accepts a packaged macOS app bundle as the install target", () => {
    expect(
      resolveInstalledAppLaunchTarget({
        installDir: "/Applications/Voice Assistant.app",
        platform: "darwin",
      }),
    ).toEqual({
      executablePath:
        "/Applications/Voice Assistant.app/Contents/MacOS/Voice Assistant",
      args: ["--open-home"],
    });
  });

  it("resolves macOS development launches through the current Electron runtime", () => {
    expect(
      resolvePostInstallLaunchTarget({
        installDir: "/Applications/Voice Assistant",
        isDevelopmentRuntime: true,
        platform: "darwin",
        appPath: "/Volumes/repo/aoa/apps/desktop",
        execPath: "/Volumes/repo/aoa/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      }),
    ).toEqual({
      executablePath:
        "/Volumes/repo/aoa/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      args: ["/Volumes/repo/aoa/apps/desktop", "--open-home"],
    });
  });

  it("keeps Windows development installer handoff pointed at the installed app", () => {
    expect(
      resolvePostInstallLaunchTarget({
        installDir: "C:/Tools/Voice Assistant",
        isDevelopmentRuntime: true,
        platform: "win32",
        appPath: "D:/repo/aoa/apps/desktop",
        execPath: "D:/repo/aoa/apps/desktop/.dev-electron/electron-dist/Voice Assistant Dev.exe",
      }),
    ).toEqual({
      executablePath: "C:/Tools/Voice Assistant/Voice Assistant.exe",
      args: ["--open-home"],
    });
  });

  it("parses the silent update install directory from installer-shell arguments", () => {
    expect(
      parseSilentUpdateInstallDir([
        "Voice Assistant Setup.exe",
        "--silent-update",
        "--install-dir=C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
      ]),
    ).toBe("C:/Users/Alex/AppData/Local/Programs/Voice Assistant");
    expect(
      parseSilentUpdateInstallDir([
        "Voice Assistant Setup.exe",
        "--install-dir",
        "C:/Users/Alex/AppData/Local/Programs/Voice Assistant",
        "--silent-update",
      ]),
    ).toBe("C:/Users/Alex/AppData/Local/Programs/Voice Assistant");
    expect(
      parseSilentUpdateInstallDir(["Voice Assistant Setup.exe"]),
    ).toBeUndefined();
    expect(
      parseSilentUpdateInstallDir([
        "Voice Assistant Setup.exe",
        "--silent-update",
      ]),
    ).toBeUndefined();
  });

  it("detects explicit home launch arguments", () => {
    expect(shouldOpenHomeOnLaunch(["app.exe", "--open-home"])).toBe(true);
    expect(shouldOpenHomeOnLaunch(["app.exe", "/open-home"])).toBe(true);
    expect(shouldOpenHomeOnLaunch(["app.exe"])).toBe(false);
  });

  it("detects explicit post-install login launch arguments", () => {
    expect(
      shouldOpenPostInstallLoginOnLaunch(["app.exe", "--post-install-login"]),
    ).toBe(true);
    expect(
      shouldOpenPostInstallLoginOnLaunch(["app.exe", "/post-install-login"]),
    ).toBe(true);
    expect(shouldOpenPostInstallLoginOnLaunch(["app.exe", "--open-home"])).toBe(
      false,
    );
  });

  it("starts the installed app with a home launch argument", () => {
    const child = {
      once: vi.fn(() => child),
      unref: vi.fn(),
    };
    const spawnProcess = vi.fn(() => child);

    launchInstalledAppHome({
      target: {
        executablePath: "C:/Tools/Voice Assistant/Voice Assistant.exe",
        args: ["--open-home"],
      },
      spawnProcess: spawnProcess as never,
      existsSync: () => true,
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
    expect(child.once).toHaveBeenCalledWith("error", expect.any(Function));
    expect(child.unref).toHaveBeenCalled();
  });

  it("checks the installed app executable before spawning", () => {
    const spawnProcess = vi.fn();

    expect(() =>
      launchInstalledAppHome({
        target: {
          executablePath: "C:/Tools/Voice Assistant/Voice Assistant.exe",
          args: ["--open-home"],
        },
        spawnProcess: spawnProcess as never,
        existsSync: () => false,
      }),
    ).toThrow(
      "Installed app executable not found: C:/Tools/Voice Assistant/Voice Assistant.exe",
    );
    expect(spawnProcess).not.toHaveBeenCalled();
  });

  it("rejects installer handoff without closing the installer when the installed app is missing", async () => {
    const window = {
      isDestroyed: vi.fn(() => false),
      hide: vi.fn(),
      destroy: vi.fn(),
    };
    const launch = vi.fn(() => {
      throw new Error(
        "Installed app executable not found: C:/Tools/Voice Assistant/Voice Assistant.exe",
      );
    });
    const exitApp = vi.fn();

    expect(() =>
      handoffInstallerLaunch({
        installerWindow: window,
        installDir: "C:/Tools/Voice Assistant",
        launch,
        exitApp,
      }),
    ).toThrow("Installed app executable not found");

    expect(window.hide).not.toHaveBeenCalled();
    expect(window.destroy).not.toHaveBeenCalled();
    expect(exitApp).not.toHaveBeenCalled();
  });

  it("hides and destroys the installer window after queuing the installed app launch", () => {
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
      platform: "win32",
      launch,
      exitApp,
    });

    expect(launch).toHaveBeenCalledWith({
      target: {
        executablePath: "C:/Tools/Voice Assistant/Voice Assistant.exe",
        args: ["--open-home"],
      },
    });
    expect(window.hide).toHaveBeenCalled();
    expect(window.destroy).toHaveBeenCalled();
    expect(exitApp).toHaveBeenCalledWith(0);
  });
});

describe("startup auth gate", () => {
  type SessionSnapshot = Parameters<
    Parameters<typeof runStartupGate>[0]["showLoginSetupWindow"]
  >[0];

  function createGateAuthService(initialSnapshot: SessionSnapshot) {
    let listener: ((snapshot: SessionSnapshot) => void) | undefined;
    return {
      service: {
        restoreSession: vi.fn(async () => initialSnapshot),
        subscribe: vi.fn(
          (nextListener: (snapshot: SessionSnapshot) => void) => {
            listener = nextListener;
            return vi.fn();
          },
        ),
      },
      emit: (snapshot: SessionSnapshot) => {
        listener?.(snapshot);
      },
    };
  }

  const authenticatedSnapshot: SessionSnapshot = {
    status: "authenticated",
    user: {
      id: "user-1",
      displayName: "Ada",
      email: "ada@example.test",
      authType: "email_code",
    },
  };

  it("shows login setup and skips runtime after unauthenticated restore", async () => {
    const { service } = createGateAuthService({ status: "unauthenticated" });
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
    });

    expect(showLoginSetupWindow).toHaveBeenCalledWith({
      status: "unauthenticated",
    });
    expect(startAuthenticatedRuntime).not.toHaveBeenCalled();
    expect(stopAuthenticatedRuntime).not.toHaveBeenCalled();
  });

  it("starts runtime only after authenticated restore", async () => {
    const { service } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
    });

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(showLoginSetupWindow).not.toHaveBeenCalled();
    expect(stopAuthenticatedRuntime).not.toHaveBeenCalled();
  });

  it("can open home after authenticated restore when requested", async () => {
    const { service } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    const openHomeWindowAfterLoginSetup = vi.fn();

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      openHomeWindowAfterLoginSetup,
      openHomeWindowOnAuthenticatedRestore: true,
    });

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(openHomeWindowAfterLoginSetup).toHaveBeenCalledTimes(1);
    expect(showLoginSetupWindow).not.toHaveBeenCalled();
  });

  it("can force login setup while runtime starts after authenticated restore", async () => {
    const { service } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    let completeLoginSetup: (() => Promise<void>) | undefined;

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      forceLoginSetupOnAuthenticatedRestore: true,
      onLoginSetupReady: (complete) => {
        completeLoginSetup = complete;
      },
    });

    expect(showLoginSetupWindow).toHaveBeenCalledWith(authenticatedSnapshot);
    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);

    await completeLoginSetup?.();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(stopAuthenticatedRuntime).not.toHaveBeenCalled();
  });

  it("stops runtime and returns to login after unauthenticated broadcast", async () => {
    const { service, emit } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
    });
    emit({ status: "unauthenticated" });
    await Promise.resolve();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(stopAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(showLoginSetupWindow).toHaveBeenCalledWith({
      status: "unauthenticated",
    });
  });

  it("starts runtime once during setup and ignores repeated authenticated broadcasts", async () => {
    const { service, emit } = createGateAuthService({
      status: "unauthenticated",
    });
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    let completeLoginSetup: (() => Promise<void>) | undefined;

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      onLoginSetupReady: (complete) => {
        completeLoginSetup = complete;
      },
    });
    emit(authenticatedSnapshot);
    emit(authenticatedSnapshot);
    await Promise.resolve();
    await Promise.resolve();
    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    await completeLoginSetup?.();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(stopAuthenticatedRuntime).not.toHaveBeenCalled();
  });

  it("keeps setup open while runtime starts after login", async () => {
    const { service, emit } = createGateAuthService({
      status: "unauthenticated",
    });
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    const openHomeWindowAfterLoginSetup = vi.fn();
    let completeLoginSetup: (() => Promise<void>) | undefined;

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      openHomeWindowAfterLoginSetup,
      onLoginSetupReady: (complete) => {
        completeLoginSetup = complete;
      },
    });
    emit(authenticatedSnapshot);
    await Promise.resolve();
    await Promise.resolve();

    expect(showLoginSetupWindow).toHaveBeenCalledWith(authenticatedSnapshot);
    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);

    await completeLoginSetup?.();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(stopAuthenticatedRuntime).not.toHaveBeenCalled();
    expect(openHomeWindowAfterLoginSetup).toHaveBeenCalledTimes(1);
  });

  it("cleans runtime after logout and starts fresh after second login setup", async () => {
    const { service, emit } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    const hideLoginSetupWindow = vi.fn();
    const openHomeWindowAfterLoginSetup = vi.fn();
    let completeLoginSetup: (() => Promise<void>) | undefined;

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      hideLoginSetupWindow,
      openHomeWindowAfterLoginSetup,
      onLoginSetupReady: (complete) => {
        completeLoginSetup = complete;
      },
    });

    emit({ status: "unauthenticated" });
    emit(authenticatedSnapshot);
    await Promise.resolve();
    await Promise.resolve();
    await completeLoginSetup?.();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(2);
    expect(stopAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(showLoginSetupWindow).toHaveBeenCalledWith({
      status: "unauthenticated",
    });
    expect(showLoginSetupWindow).toHaveBeenCalledWith(authenticatedSnapshot);
    expect(hideLoginSetupWindow).toHaveBeenCalledTimes(1);
    expect(openHomeWindowAfterLoginSetup).toHaveBeenCalledTimes(1);
  });

  it("does not open home when setup completion is not allowed", async () => {
    const { service } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn();
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    const openHomeWindowAfterLoginSetup = vi.fn();
    let completeLoginSetup: (() => Promise<void>) | undefined;

    await runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      openHomeWindowAfterLoginSetup,
      onLoginSetupReady: (complete) => {
        completeLoginSetup = complete;
      },
    });

    await completeLoginSetup?.();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(openHomeWindowAfterLoginSetup).not.toHaveBeenCalled();
  });

  it("cleans up a runtime start that finishes after unauthenticated broadcast", async () => {
    let resolveRuntimeStart: (() => void) | undefined;
    const { service, emit } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRuntimeStart = resolve;
        }),
    );
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();

    const gatePromise = runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    emit({ status: "unauthenticated" });
    await Promise.resolve();
    expect(stopAuthenticatedRuntime).not.toHaveBeenCalled();
    resolveRuntimeStart?.();
    await gatePromise;
    await Promise.resolve();

    expect(stopAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    expect(showLoginSetupWindow).toHaveBeenCalledWith({
      status: "unauthenticated",
    });
  });

  it("cleans a pending runtime before second login setup can complete", async () => {
    let resolveRuntimeStart: (() => void) | undefined;
    let startCallCount = 0;
    const { service, emit } = createGateAuthService(authenticatedSnapshot);
    const startAuthenticatedRuntime = vi.fn(() => {
      startCallCount += 1;
      if (startCallCount === 1) {
        return new Promise<void>((resolve) => {
          resolveRuntimeStart = resolve;
        });
      }
      return Promise.resolve();
    });
    const stopAuthenticatedRuntime = vi.fn();
    const showLoginSetupWindow = vi.fn();
    const hideLoginSetupWindow = vi.fn();
    let completeLoginSetup: (() => Promise<void>) | undefined;

    const gatePromise = runStartupGate({
      authService: service,
      startAuthenticatedRuntime,
      stopAuthenticatedRuntime,
      showLoginSetupWindow,
      hideLoginSetupWindow,
      onLoginSetupReady: (complete) => {
        completeLoginSetup = complete;
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    emit({ status: "unauthenticated" });
    await Promise.resolve();
    emit(authenticatedSnapshot);
    resolveRuntimeStart?.();
    await gatePromise;
    await Promise.resolve();
    await Promise.resolve();

    expect(showLoginSetupWindow).toHaveBeenCalledWith({
      status: "unauthenticated",
    });
    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(2);
    expect(stopAuthenticatedRuntime).toHaveBeenCalledTimes(1);
    const completePromise = completeLoginSetup?.();
    await Promise.resolve();
    await completePromise;
    await Promise.resolve();

    expect(startAuthenticatedRuntime).toHaveBeenCalledTimes(2);
    expect(hideLoginSetupWindow).toHaveBeenCalledTimes(1);
  });
});

describe("login setup window visibility", () => {
  function createWindowTarget() {
    const windowListeners = new Map<string, () => void>();
    const webContentsListeners = new Map<string, () => void>();
    return {
      target: {
        once: vi.fn((event: string, listener: () => void) => {
          windowListeners.set(event, listener);
        }),
        webContents: {
          once: vi.fn((event: string, listener: () => void) => {
            webContentsListeners.set(event, listener);
          }),
        },
      },
      emitWindow: (event: string) => windowListeners.get(event)?.(),
      emitWebContents: (event: string) => webContentsListeners.get(event)?.(),
    };
  }

  it("shows the login setup window after renderer load when ready-to-show is absent", () => {
    const { target, emitWebContents } = createWindowTarget();
    const showWindow = vi.fn();
    const timer = { id: 1 };
    const setTimeoutFn = vi.fn(() => timer.id);
    const clearTimeoutFn = vi.fn();

    wireLoginSetupWindowVisibility(target, showWindow, {
      setTimeoutFn: setTimeoutFn as never,
      clearTimeoutFn: clearTimeoutFn as never,
    });
    emitWebContents("did-finish-load");
    emitWebContents("did-fail-load");

    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(clearTimeoutFn).toHaveBeenCalledWith(timer.id);
  });

  it("uses a timeout fallback for hidden login setup windows", () => {
    const { target, emitWindow } = createWindowTarget();
    const showWindow = vi.fn();
    let timeoutListener: (() => void) | undefined;
    const setTimeoutFn = vi.fn((listener: () => void) => {
      timeoutListener = listener;
      return 7;
    });
    const clearTimeoutFn = vi.fn();

    wireLoginSetupWindowVisibility(target, showWindow, {
      setTimeoutFn: setTimeoutFn as never,
      clearTimeoutFn: clearTimeoutFn as never,
      timeoutMs: 25,
    });

    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 25);
    timeoutListener?.();
    emitWindow("ready-to-show");

    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(clearTimeoutFn).toHaveBeenCalledWith(7);
  });
});

describe("lazy update service", () => {
  it("does not create the real update service until a method is called and resets on dispose", async () => {
    const firstService = {
      checkForUpdates: vi.fn(async () => ({ status: "disabled" as const })),
      restartToUpdate: vi.fn(),
      dispose: vi.fn(),
    };
    const secondService = {
      checkForUpdates: vi.fn(async () => ({ status: "up-to-date" as const })),
      restartToUpdate: vi.fn(),
      dispose: vi.fn(),
    };
    const factory = vi
      .fn(() => firstService)
      .mockReturnValueOnce(firstService)
      .mockReturnValueOnce(secondService);
    const lazyService = createLazyUpdateService(factory);

    expect(factory).not.toHaveBeenCalled();

    await expect(lazyService.checkForUpdates()).resolves.toEqual({
      status: "disabled",
    });
    lazyService.restartToUpdate();
    lazyService.dispose?.();
    await expect(lazyService.checkForUpdates()).resolves.toEqual({
      status: "up-to-date",
    });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(firstService.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(firstService.restartToUpdate).toHaveBeenCalledTimes(1);
    expect(firstService.dispose).toHaveBeenCalledTimes(1);
    expect(secondService.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("does not create the real update service while runtime guard disables checks", async () => {
    const service = {
      checkForUpdates: vi.fn(async () => ({ status: "up-to-date" as const })),
      restartToUpdate: vi.fn(),
      dispose: vi.fn(),
    };
    let disabled = true;
    const factory = vi.fn(() => service);
    const lazyService = createLazyUpdateService(factory, {
      isDisabled: () => disabled,
    });

    await expect(lazyService.checkForUpdates()).resolves.toEqual({
      status: "disabled",
    });
    expect(factory).not.toHaveBeenCalled();

    disabled = false;
    await expect(lazyService.checkForUpdates()).resolves.toEqual({
      status: "up-to-date",
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(service.checkForUpdates).toHaveBeenCalledTimes(1);
  });
});

describe("authenticated IPC gate", () => {
  function createIpcMainAdapter() {
    const handlers = new Map<
      string,
      (event: unknown, input?: unknown) => unknown
    >();
    return {
      ipcMain: {
        handle: vi.fn((channel, listener) => {
          handlers.set(channel, listener);
        }),
      },
      invoke: (channel: string, input?: unknown) => {
        const handler = handlers.get(channel);
        if (!handler) {
          throw new Error(`missing handler ${channel}`);
        }
        return handler({}, input);
      },
    };
  }

  it("rejects runtime IPC when token validation fails and allows auth IPC", async () => {
    const { ipcMain, invoke } = createIpcMainAdapter();
    const getAccessTokenForRequest = vi.fn(async () => {
      throw new Error("expired");
    });
    const guarded = createAuthenticatedIpcMainAdapter(ipcMain, {
      getAccessTokenForRequest,
    });
    const runtimeHandler = vi.fn(() => "runtime-ok");
    const authHandler = vi.fn(() => "auth-ok");

    guarded.handle("voice:get-settings", runtimeHandler);
    guarded.handle("voice:auth:get-session", authHandler);

    await expect(invoke("voice:get-settings")).rejects.toThrow("expired");
    await expect(invoke("voice:auth:get-session")).resolves.toBe("auth-ok");
    expect(getAccessTokenForRequest).toHaveBeenCalledTimes(1);
    expect(runtimeHandler).not.toHaveBeenCalled();
    expect(authHandler).toHaveBeenCalledTimes(1);
  });

  it("does not validate tokens for auth IPC", async () => {
    const { ipcMain, invoke } = createIpcMainAdapter();
    const getAccessTokenForRequest = vi.fn(async () => "access-token");
    const guarded = createAuthenticatedIpcMainAdapter(ipcMain, {
      getAccessTokenForRequest,
    });
    const authHandler = vi.fn(() => "auth-ok");

    guarded.handle("voice:auth:logout", authHandler);

    await expect(invoke("voice:auth:logout")).resolves.toBe("auth-ok");
    expect(getAccessTokenForRequest).not.toHaveBeenCalled();
    expect(authHandler).toHaveBeenCalledTimes(1);
  });

  it("does not validate tokens for login setup completion IPC", async () => {
    const { ipcMain, invoke } = createIpcMainAdapter();
    const getAccessTokenForRequest = vi.fn(async () => {
      throw new Error("expired");
    });
    const guarded = createAuthenticatedIpcMainAdapter(ipcMain, {
      getAccessTokenForRequest,
    });
    const completeHandler = vi.fn(() => "complete-ok");

    guarded.handle("voice:auth:complete-login-setup", completeHandler);

    await expect(invoke("voice:auth:complete-login-setup")).resolves.toBe(
      "complete-ok",
    );
    expect(getAccessTokenForRequest).not.toHaveBeenCalled();
    expect(completeHandler).toHaveBeenCalledTimes(1);
  });

  it("does not validate tokens for login setup app info IPC", async () => {
    const { ipcMain, invoke } = createIpcMainAdapter();
    const getAccessTokenForRequest = vi.fn(async () => {
      throw new Error("expired");
    });
    const guarded = createAuthenticatedIpcMainAdapter(ipcMain, {
      getAccessTokenForRequest,
    });
    const appInfoHandler = vi.fn(() => ({ isPackaged: false }));

    guarded.handle("voice:get-app-info", appInfoHandler);

    await expect(invoke("voice:get-app-info")).resolves.toEqual({
      isPackaged: false,
    });
    expect(getAccessTokenForRequest).not.toHaveBeenCalled();
    expect(appInfoHandler).toHaveBeenCalledTimes(1);
  });

  it("allows runtime IPC after token validation succeeds", async () => {
    const { ipcMain, invoke } = createIpcMainAdapter();
    const getAccessTokenForRequest = vi.fn(async () => "access-token");
    const guarded = createAuthenticatedIpcMainAdapter(ipcMain, {
      getAccessTokenForRequest,
    });
    const runtimeHandler = vi.fn(() => "runtime-ok");

    guarded.handle("voice:get-settings", runtimeHandler);

    await expect(invoke("voice:get-settings")).resolves.toBe("runtime-ok");
    expect(getAccessTokenForRequest).toHaveBeenCalledTimes(1);
    expect(runtimeHandler).toHaveBeenCalledTimes(1);
  });
});

describe("authenticated direct IPC gate", () => {
  it("rejects direct IPC and skips listener when token validation fails", async () => {
    const getAccessTokenForRequest = vi.fn(async () => {
      throw new Error("expired");
    });
    const listener = vi.fn(() => "ok");

    await expect(
      runAuthenticatedDirectIpc({ getAccessTokenForRequest }, listener),
    ).rejects.toThrow("expired");

    expect(getAccessTokenForRequest).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("runs direct IPC listener after token validation succeeds", async () => {
    const getAccessTokenForRequest = vi.fn(async () => "access-token");
    const listener = vi.fn(() => "ok");

    await expect(
      runAuthenticatedDirectIpc({ getAccessTokenForRequest }, listener),
    ).resolves.toBe("ok");

    expect(getAccessTokenForRequest).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("direct bootstrap IPC logging", () => {
  it("logs direct IPC request lifecycle with sanitized summaries", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message),
    };

    logDirectIpcRequest(logger, "voice:installer-install", {
      installDir: "C:/Tools",
      createDesktopShortcut: true,
      selectedText: "secret text",
    });
    logDirectIpcResponse(logger, "voice:installer-install", "ok");
    logDirectIpcError(
      logger,
      "voice:installer-install",
      new Error("install failed"),
    );

    expect(logs).toEqual([
      '[ipc-direct] request channel=voice:installer-install input={"installDir":"C:/Tools","createDesktopShortcut":true,"selectedTextLength":11}',
      "[ipc-direct] response channel=voice:installer-install status=ok",
    ]);
    expect(warnings).toEqual([
      '[ipc-direct] response channel=voice:installer-install status=error error="install failed"',
    ]);
    expect([...logs, ...warnings].join("\n")).not.toContain("secret text");
  });

  it("logs launch actions with summarized argv", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message),
    };
    const action = vi.fn();

    runLoggedBootstrapAction(
      logger,
      "open-home-on-launch",
      {
        argv: summarizeArgvForLog([
          "C:/Users/Alex/AppData/Local/Programs/Voice Assistant/Voice Assistant.exe",
          "--open-home",
          "C:/Users/Alex/Documents/private.txt",
        ]),
      },
      action,
    );

    expect(action).toHaveBeenCalledTimes(1);
    expect(logs).toEqual([
      '[bootstrap-action] action=open-home-on-launch input={"argv":{"count":3,"flags":["--open-home"]}}',
      "[bootstrap-action] action=open-home-on-launch status=ok",
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
      warn: (message: string) => warnings.push(message),
    };
    const action = vi.fn();

    runLoggedTrayAction(
      logger,
      "open-about",
      {
        section: "about",
        token: "secret",
      },
      action,
    );

    expect(action).toHaveBeenCalledTimes(1);
    expect(logs).toEqual([
      '[tray] action action=open-about input={"section":"about","token":"***"}',
      "[tray] action action=open-about status=ok",
    ]);
    expect(warnings).toEqual([]);
    expect(logs.join("\n")).not.toContain("secret");
  });

  it("logs tray action failures before rethrowing", () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const logger = {
      log: (message: string) => logs.push(message),
      warn: (message: string) => warnings.push(message),
    };
    const error = new Error("quit failed");

    expect(() =>
      runLoggedTrayAction(logger, "quit", undefined, () => {
        throw error;
      }),
    ).toThrow(error);

    expect(logs).toEqual(["[tray] action action=quit"]);
    expect(warnings).toEqual([
      '[tray] action action=quit status=error error="quit failed"',
    ]);
  });
});
