import type { BrowserWindow } from "electron";

const WM_SYSCOMMAND = 0x0112;
const WM_INITMENU = 0x0116;
const SC_KEYMENU = 0xf100;

interface WindowAltSpaceGuardState {
  alwaysBlock: boolean;
  isCaptureActive?: () => boolean;
  nativeHooksInstalled: boolean;
  rendererHooksInstalled: boolean;
  systemMenuListenerInstalled: boolean;
}

const guardStates = new WeakMap<BrowserWindow, WindowAltSpaceGuardState>();

export function shouldBlockSystemMenuCommand(
  wParam: number,
  isCaptureActive: boolean
): boolean {
  if (!isCaptureActive) {
    return false;
  }
  return (wParam & 0xfff0) === SC_KEYMENU;
}

function readWParam(wParam: unknown): number {
  if (typeof wParam === "number") {
    return wParam;
  }
  if (typeof wParam === "bigint") {
    return Number(wParam);
  }
  if (
    wParam &&
    typeof wParam === "object" &&
    "readInt32" in wParam &&
    typeof wParam.readInt32 === "function"
  ) {
    return wParam.readInt32();
  }
  return 0;
}

function shouldBlockForWindow(window: BrowserWindow): boolean {
  const state = guardStates.get(window);
  if (!state) {
    return false;
  }
  return state.alwaysBlock || (state.isCaptureActive?.() ?? false);
}

function getOrCreateGuardState(window: BrowserWindow): WindowAltSpaceGuardState {
  const existing = guardStates.get(window);
  if (existing) {
    return existing;
  }
  const state: WindowAltSpaceGuardState = {
    alwaysBlock: false,
    nativeHooksInstalled: false,
    rendererHooksInstalled: false,
    systemMenuListenerInstalled: false
  };
  guardStates.set(window, state);
  return state;
}

function ensureNativeAltSpaceHooks(window: BrowserWindow): void {
  const state = getOrCreateGuardState(window);
  if (state.nativeHooksInstalled || process.platform !== "win32") {
    return;
  }
  state.nativeHooksInstalled = true;

  window.hookWindowMessage(WM_SYSCOMMAND, (wParam) => {
    if (shouldBlockSystemMenuCommand(readWParam(wParam), shouldBlockForWindow(window))) {
      console.log("[shortcut-capture] 已拦截 WM_SYSCOMMAND SC_KEYMENU");
      return true;
    }
  });

  window.hookWindowMessage(WM_INITMENU, () => {
    if (shouldBlockForWindow(window)) {
      console.log("[shortcut-capture] 已拦截 WM_INITMENU");
      return true;
    }
  });
}

function ensureRendererAltSpaceHooks(window: BrowserWindow): void {
  const state = getOrCreateGuardState(window);
  if (state.rendererHooksInstalled) {
    return;
  }
  state.rendererHooksInstalled = true;

  window.webContents.on("before-input-event", (event, input) => {
    if (!shouldBlockForWindow(window)) {
      return;
    }
    if (input.type === "keyDown" && input.key === " " && input.alt) {
      event.preventDefault();
    }
  });
}

function ensureSystemContextMenuBlocked(window: BrowserWindow): void {
  const state = getOrCreateGuardState(window);
  if (state.systemMenuListenerInstalled) {
    return;
  }
  state.systemMenuListenerInstalled = true;

  window.on("system-context-menu", (event) => {
    if (!shouldBlockForWindow(window)) {
      return;
    }
    event.preventDefault();
    console.log("[shortcut-capture] 已阻止 system-context-menu");
  });
}

function ensureWindowAltSpaceGuard(window: BrowserWindow): void {
  ensureNativeAltSpaceHooks(window);
  ensureRendererAltSpaceHooks(window);
  ensureSystemContextMenuBlocked(window);
}

/**
 * 无边框窗口永久屏蔽 Alt+Space 触发的系统菜单（使用自绘窗口控制）。
 */
export function blockHomeWindowAltSpaceMenu(window: BrowserWindow): void {
  const state = getOrCreateGuardState(window);
  state.alwaysBlock = true;
  ensureWindowAltSpaceGuard(window);
}

/**
 * 录入快捷键时屏蔽 Windows 对 Alt+Space 的默认处理（左上角系统菜单）。
 */
export function wireShortcutCaptureWindowGuard(
  window: BrowserWindow,
  isCaptureActive: () => boolean
): void {
  const state = getOrCreateGuardState(window);
  state.isCaptureActive = isCaptureActive;
  ensureWindowAltSpaceGuard(window);
}

export function ensureShortcutCaptureWindowGuards(
  windows: BrowserWindow[],
  isCaptureActive: () => boolean
): void {
  for (const window of windows) {
    if (window.isDestroyed()) {
      continue;
    }
    wireShortcutCaptureWindowGuard(window, isCaptureActive);
  }
}
