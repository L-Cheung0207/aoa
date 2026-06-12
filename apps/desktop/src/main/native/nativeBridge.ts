import { createRequire } from "node:module";
import type { NativeInputBridge } from "../insertion/insertService";

export type RuntimePlatform = NodeJS.Platform;
export type NativeHelperModuleLoader = (specifier: string) => unknown;

export interface NativeHelperBinding {
  pasteFromClipboard(): Promise<void>;
  copySelectionToClipboard(): Promise<void>;
  typeText(text: string): Promise<void>;
  getForegroundWindowHandle(): Promise<string | undefined>;
  focusWindow(windowHandle: string): Promise<void>;
  isEditableTargetFocused(): Promise<boolean>;
  muteOtherAppsForRecording(excludedProcessIds: number[]): Promise<void>;
  restoreOtherAppsAudio(): Promise<void>;
}

export interface NativeBridge extends NativeInputBridge {
  copySelectionToClipboard(): Promise<void>;
  getForegroundWindowHandle(): Promise<string | undefined>;
  muteOtherAppsForRecording(excludedProcessIds: number[]): Promise<void>;
  restoreOtherAppsAudio(): Promise<void>;
}

export interface CreateNativeBridgeOptions {
  platform?: RuntimePlatform;
  loadHelper?: () => NativeHelperBinding | undefined;
  requireModule?: NativeHelperModuleLoader;
}

export function createNativeBridge(options: CreateNativeBridgeOptions = {}): NativeBridge {
  const platform = options.platform ?? process.platform;
  const loadHelper =
    options.loadHelper ?? (() => loadNativeHelperBinding(options.requireModule));

  return {
    pasteFromClipboard: async () => {
      const helper = getWindowsHelper(platform, loadHelper);
      await helper.pasteFromClipboard();
    },
    copySelectionToClipboard: async () => {
      const helper = getWindowsHelper(platform, loadHelper);
      await helper.copySelectionToClipboard();
    },
    typeText: async (text) => {
      const helper = getWindowsHelper(platform, loadHelper);
      await helper.typeText(text);
    },
    getForegroundWindowHandle: async () => {
      const helper = getWindowsHelper(platform, loadHelper);
      return helper.getForegroundWindowHandle();
    },
    focusWindow: async (windowHandle) => {
      const helper = getWindowsHelper(platform, loadHelper);
      await helper.focusWindow(windowHandle);
    },
    isEditableTargetFocused: async () => {
      const helper = getWindowsHelper(platform, loadHelper);
      return helper.isEditableTargetFocused();
    },
    muteOtherAppsForRecording: async (excludedProcessIds) => {
      const helper = getWindowsHelper(platform, loadHelper);
      await helper.muteOtherAppsForRecording(excludedProcessIds);
    },
    restoreOtherAppsAudio: async () => {
      const helper = getWindowsHelper(platform, loadHelper);
      await helper.restoreOtherAppsAudio();
    }
  };
}

function getWindowsHelper(
  platform: RuntimePlatform,
  loadHelper: () => NativeHelperBinding | undefined
): NativeHelperBinding {
  if (platform !== "win32") {
    throw new Error("UNSUPPORTED_PLATFORM: native input helper only supports Windows V1");
  }

  const helper = loadHelper();
  if (!helper) {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: Windows native helper binding was not loaded");
  }

  return helper;
}

function loadNativeHelperBinding(
  requireModule: NativeHelperModuleLoader = defaultRequireModule
): NativeHelperBinding | undefined {
  try {
    const candidate = requireModule("@voice/native-helper");
    return isNativeHelperBinding(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function defaultRequireModule(_specifier: string): unknown {
  const require = createRequire(import.meta.url);
  return require(_specifier);
}

function isNativeHelperBinding(candidate: unknown): candidate is NativeHelperBinding {
  if (typeof candidate !== "object" || candidate === null) {
    return false;
  }

  const maybeBinding = candidate as Partial<NativeHelperBinding>;
  return (
    typeof maybeBinding.pasteFromClipboard === "function" &&
    typeof maybeBinding.copySelectionToClipboard === "function" &&
    typeof maybeBinding.typeText === "function" &&
    typeof maybeBinding.getForegroundWindowHandle === "function" &&
    typeof maybeBinding.focusWindow === "function" &&
    typeof maybeBinding.isEditableTargetFocused === "function" &&
    typeof maybeBinding.muteOtherAppsForRecording === "function" &&
    typeof maybeBinding.restoreOtherAppsAudio === "function"
  );
}
