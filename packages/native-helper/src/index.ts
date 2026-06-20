import { createRequire } from "node:module";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export interface NativeAddonBinding {
  pasteFromClipboard(): void;
  copySelectionToClipboard?(): void;
  typeText(text: string): void;
  getForegroundWindowHandle?(): string | undefined;
  focusWindow?(windowHandle: string): void;
  isEditableTargetFocused?(): boolean;
  muteOtherAppsForRecording?(excludedProcessIds: number[]): void;
  restoreOtherAppsAudio?(): void;
  recognizeRightAltHotkey?(keyCode: number, transition: NativeKeyTransition): NativeHotkeyAction | undefined;
  configureKeyboardShortcuts?(direct: string, processSelection: string, translate: string): void;
  startKeyboardHook?(callback: (action: NativeHotkeyAction) => void): void;
  stopKeyboardHook?(): void;
  /** Windows 下走 WriteConsoleW 直连 console handle，绕开 Node pipe 的 CP 编码问题。 */
  writeLogLine?(text: string): void;
}

export interface KeyboardHookHandle {
  stop(): void;
}

export interface NativeHelperBinding {
  pasteFromClipboard(): Promise<void>;
  copySelectionToClipboard(): Promise<void>;
  typeText(text: string): Promise<void>;
  getForegroundWindowHandle(): Promise<string | undefined>;
  focusWindow(windowHandle: string): Promise<void>;
  isEditableTargetFocused(): Promise<boolean>;
  muteOtherAppsForRecording(excludedProcessIds: number[]): Promise<void>;
  restoreOtherAppsAudio(): Promise<void>;
  recognizeRightAltHotkey(
    keyCode: number,
    transition: NativeKeyTransition
  ): NativeHotkeyAction | undefined;
  configureKeyboardShortcuts(direct: string, processSelection: string, translate: string): void;
  startKeyboardHook(onAction: (action: NativeHotkeyAction) => void): KeyboardHookHandle;
  stopKeyboardHook(): void;
}

export type NativeAddonLoader = () => NativeAddonBinding | undefined;
export type NativeKeyTransition = "down" | "up";
export type NativeHotkeyAction =
  | "direct"
  | "processSelection"
  | "translate"
  | "shortcutHelp"
  | "shortcutHelpDismiss";

export interface CreateNativeAddonLoaderOptions {
  packageRoot: string;
  exists(path: string): boolean;
  requireFile(path: string): unknown;
}

export function createNativeHelperBinding(
  addon: NativeAddonBinding | undefined
): NativeHelperBinding {
  return {
    pasteFromClipboard: async () => {
      getAddon(addon).pasteFromClipboard();
    },
    copySelectionToClipboard: async () => {
      copySelectionToClipboardOn(getAddon(addon));
    },
    typeText: async (text) => {
      getAddon(addon).typeText(text);
    },
    getForegroundWindowHandle: async () => {
      return getForegroundWindowHandleOn(getAddon(addon));
    },
    focusWindow: async (windowHandle) => {
      focusWindowOn(getAddon(addon), windowHandle);
    },
    isEditableTargetFocused: async () => {
      return isEditableTargetFocusedOn(getAddon(addon));
    },
    muteOtherAppsForRecording: async (excludedProcessIds) => {
      muteOtherAppsForRecordingOn(getAddon(addon), excludedProcessIds);
    },
    restoreOtherAppsAudio: async () => {
      restoreOtherAppsAudioOn(getAddon(addon));
    },
    recognizeRightAltHotkey: (keyCode, transition) => {
      return getAddon(addon).recognizeRightAltHotkey?.(keyCode, transition);
    },
    configureKeyboardShortcuts: (direct, processSelection, translate) => {
      configureKeyboardShortcutsOn(getAddon(addon), direct, processSelection, translate);
    },
    startKeyboardHook: (onAction) => startKeyboardHookOn(getAddon(addon), onAction),
    stopKeyboardHook: () => stopKeyboardHookOn(getAddon(addon))
  };
}

export function createNativeHelperModule(loadAddon: NativeAddonLoader): NativeHelperBinding {
  return {
    pasteFromClipboard: async () => {
      getAddon(loadAddon()).pasteFromClipboard();
    },
    copySelectionToClipboard: async () => {
      copySelectionToClipboardOn(getAddon(loadAddon()));
    },
    typeText: async (text) => {
      getAddon(loadAddon()).typeText(text);
    },
    getForegroundWindowHandle: async () => {
      return getForegroundWindowHandleOn(getAddon(loadAddon()));
    },
    focusWindow: async (windowHandle) => {
      focusWindowOn(getAddon(loadAddon()), windowHandle);
    },
    isEditableTargetFocused: async () => {
      return isEditableTargetFocusedOn(getAddon(loadAddon()));
    },
    muteOtherAppsForRecording: async (excludedProcessIds) => {
      muteOtherAppsForRecordingOn(getAddon(loadAddon()), excludedProcessIds);
    },
    restoreOtherAppsAudio: async () => {
      restoreOtherAppsAudioOn(getAddon(loadAddon()));
    },
    recognizeRightAltHotkey: (keyCode, transition) => {
      return getAddon(loadAddon()).recognizeRightAltHotkey?.(keyCode, transition);
    },
    configureKeyboardShortcuts: (direct, processSelection, translate) => {
      configureKeyboardShortcutsOn(getAddon(loadAddon()), direct, processSelection, translate);
    },
    startKeyboardHook: (onAction) => startKeyboardHookOn(getAddon(loadAddon()), onAction),
    stopKeyboardHook: () => stopKeyboardHookOn(getAddon(loadAddon()))
  };
}

const defaultModule = createNativeHelperModule(loadNativeAddon);

export const pasteFromClipboard = defaultModule.pasteFromClipboard;
export const copySelectionToClipboard = defaultModule.copySelectionToClipboard;
export const typeText = defaultModule.typeText;
export const getForegroundWindowHandle = defaultModule.getForegroundWindowHandle;
export const focusWindow = defaultModule.focusWindow;
export const isEditableTargetFocused = defaultModule.isEditableTargetFocused;
export const muteOtherAppsForRecording = defaultModule.muteOtherAppsForRecording;
export const restoreOtherAppsAudio = defaultModule.restoreOtherAppsAudio;
export const recognizeRightAltHotkey = defaultModule.recognizeRightAltHotkey;
export const configureKeyboardShortcuts = defaultModule.configureKeyboardShortcuts;
export const startKeyboardHook = defaultModule.startKeyboardHook;
export const stopKeyboardHook = defaultModule.stopKeyboardHook;

function getForegroundWindowHandleOn(addon: NativeAddonBinding): string | undefined {
  if (typeof addon.getForegroundWindowHandle !== "function") {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: active window capture is not supported by the loaded addon");
  }

  return addon.getForegroundWindowHandle();
}

function copySelectionToClipboardOn(addon: NativeAddonBinding): void {
  if (typeof addon.copySelectionToClipboard !== "function") {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: copy selection is not supported by the loaded addon");
  }

  addon.copySelectionToClipboard();
}

function focusWindowOn(addon: NativeAddonBinding, windowHandle: string): void {
  if (typeof addon.focusWindow !== "function") {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: active window focus is not supported by the loaded addon");
  }

  addon.focusWindow(windowHandle);
}

function isEditableTargetFocusedOn(addon: NativeAddonBinding): boolean {
  if (typeof addon.isEditableTargetFocused !== "function") {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: editable target detection is not supported by the loaded addon");
  }

  return addon.isEditableTargetFocused();
}

function muteOtherAppsForRecordingOn(
  addon: NativeAddonBinding,
  excludedProcessIds: number[]
): void {
  if (typeof addon.muteOtherAppsForRecording !== "function") {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: audio ducking is not supported by the loaded addon");
  }

  addon.muteOtherAppsForRecording(excludedProcessIds);
}

function restoreOtherAppsAudioOn(addon: NativeAddonBinding): void {
  if (typeof addon.restoreOtherAppsAudio !== "function") {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: audio ducking is not supported by the loaded addon");
  }

  addon.restoreOtherAppsAudio();
}

function startKeyboardHookOn(
  addon: NativeAddonBinding,
  onAction: (action: NativeHotkeyAction) => void
): KeyboardHookHandle {
  if (typeof addon.startKeyboardHook !== "function" || typeof addon.stopKeyboardHook !== "function") {
    console.error("[native-helper] startKeyboardHookOn：addon 缺少 start/stopKeyboardHook 方法");
    throw new Error("NATIVE_HELPER_UNAVAILABLE: keyboard hook is not supported by the loaded addon");
  }

  let stopped = false;
  addon.startKeyboardHook((action) => {
    if (stopped) {
      console.log("[native-helper] 键盘 hook 回调已停止，忽略 action：", action);
      return;
    }
    console.log("[native-helper] 键盘 hook 收到 action：", action);
    onAction(action);
  });
  console.log("[native-helper] 键盘 hook 已挂载");

  return {
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      console.log("[native-helper] 请求停止键盘 hook");
      addon.stopKeyboardHook?.();
    }
  };
}

function configureKeyboardShortcutsOn(
  addon: NativeAddonBinding,
  direct: string,
  processSelection: string,
  translate: string
): void {
  if (typeof addon.configureKeyboardShortcuts !== "function") {
    console.warn("[native-helper] addon 缺少 configureKeyboardShortcuts，使用默认快捷键识别");
    return;
  }

  addon.configureKeyboardShortcuts(direct, processSelection, translate);
}

function stopKeyboardHookOn(addon: NativeAddonBinding): void {
  if (typeof addon.stopKeyboardHook !== "function") {
    console.error("[native-helper] stopKeyboardHookOn：addon 缺少 stopKeyboardHook 方法");
    throw new Error("NATIVE_HELPER_UNAVAILABLE: keyboard hook is not supported by the loaded addon");
  }
  console.log("[native-helper] 调用 stopKeyboardHook");
  addon.stopKeyboardHook();
}

function getAddon(addon: NativeAddonBinding | undefined): NativeAddonBinding {
  if (!addon) {
    throw new Error("NATIVE_HELPER_UNAVAILABLE: native addon is not loaded");
  }

  return addon;
}

export function getNativeAddonCandidatePaths(packageRoot: string): string[] {
  const pathApi = /^[a-zA-Z]:[\\/]/.test(packageRoot) ? path.win32 : path;
  const paths: string[] = [];
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    paths.push(pathApi.join(resourcesPath, "voice_native_helper.node"));
  }

  paths.push(
    pathApi.join(packageRoot, "target", "debug", "voice_native_helper.node"),
    pathApi.join(packageRoot, "dist", "voice_native_helper.node")
  );
  return paths;
}

export function createNativeAddonLoader(
  options: CreateNativeAddonLoaderOptions
): NativeAddonLoader {
  return () => {
    for (const candidatePath of getNativeAddonCandidatePaths(options.packageRoot)) {
      if (!options.exists(candidatePath)) {
        continue;
      }

      const candidate = options.requireFile(candidatePath);
      if (isNativeAddonBinding(candidate)) {
        return candidate;
      }
    }

    return undefined;
  };
}

function loadNativeAddon(): NativeAddonBinding | undefined {
  const require = createRequire(import.meta.url);
  const packageRoot = getPackageRoot(require);
  console.log("[native-helper] loadNativeAddon：包目录 =", packageRoot);
  const loader = createNativeAddonLoader({
    packageRoot,
    exists: (path) => {
      const ok = existsSync(path);
      console.log(`[native-helper] 候选路径 ${path}：${ok ? "命中" : "不存在"}`);
      return ok;
    },
    requireFile: (path) => {
      console.log(`[native-helper] 加载原生模块：${path}`);
      return require(path);
    }
  });
  const result = loader();
  console.log(
    "[native-helper] loadNativeAddon：",
    result ? "加载成功" : "加载失败（未找到可用候选）"
  );
  return result;
}

function getPackageRoot(require: NodeRequire): string {
  // 优先通过 Node module resolution 定位 @voice/native-helper 的真实包目录。
  // 这样即便本文件被 bundler 内联到宿主进程（例如 Electron main），仍能定位到
  // pnpm workspace 中的 packages/native-helper/，从而加载到 dist/voice_native_helper.node。
  try {
    return dirname(require.resolve("@voice/native-helper/package.json"));
  } catch {
    return dirname(dirname(fileURLToPath(import.meta.url)));
  }
}

function isNativeAddonBinding(candidate: unknown): candidate is NativeAddonBinding {
  if (typeof candidate !== "object" || candidate === null) {
    return false;
  }

  const maybeBinding = candidate as Partial<NativeAddonBinding>;
  return (
    typeof maybeBinding.pasteFromClipboard === "function" &&
    typeof maybeBinding.typeText === "function"
  );
}
