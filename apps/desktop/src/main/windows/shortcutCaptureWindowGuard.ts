import type { BrowserWindow } from "electron";

const WM_SYSCOMMAND = 0x0112;
const WM_INITMENU = 0x0116;
const SC_KEYMENU = 0xf100;

interface WindowAltSpaceGuardState {
  alwaysBlock: boolean;
  getCaptureTarget?: () => BrowserWindow | undefined;
  isCaptureActive?: () => boolean;
  nativeHooksInstalled: boolean;
  rendererHooksInstalled: boolean;
  systemMenuListenerInstalled: boolean;
  ctrlDown: boolean;
  leftAltDown: boolean;
  metaDown: boolean;
  rightAltAcceleratorCaptured: boolean;
  rightAltCaptureStarted: boolean;
  rightAltDown: boolean;
  rightAltSyntheticCtrlDown: boolean;
  shiftDown: boolean;
}

const guardStates = new WeakMap<BrowserWindow, WindowAltSpaceGuardState>();
const SHORTCUT_CAPTURE_ACCELERATOR_CHANNEL = "voice:shortcut-capture-accelerator";

const SYMBOL_KEY_ACCELERATORS: Record<string, string> = {
  Minus: "-",
  Equal: "=",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`"
};

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
    systemMenuListenerInstalled: false,
    ctrlDown: false,
    leftAltDown: false,
    metaDown: false,
    rightAltAcceleratorCaptured: false,
    rightAltCaptureStarted: false,
    rightAltDown: false,
    rightAltSyntheticCtrlDown: false,
    shiftDown: false
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
      resetKeyboardState(state);
      return;
    }
    if (
      input.type === "keyUp" &&
      (input.code === "AltRight" || input.key === "AltGraph") &&
      state.isCaptureActive?.() &&
      state.rightAltAcceleratorCaptured
    ) {
      event.preventDefault();
      resetRightAltCaptureState(state);
      return;
    }

    if (
      input.type === "keyUp" &&
      (input.code === "AltRight" || input.key === "AltGraph") &&
      state.isCaptureActive?.() &&
      state.rightAltCaptureStarted &&
      !state.rightAltAcceleratorCaptured
    ) {
      event.preventDefault();
      sendShortcutCaptureAccelerator(window, state, "RightAlt");
      resetRightAltCaptureState(state);
      return;
    }

    trackModifierState(state, input);
    if (input.code === "AltRight" || input.key === "AltGraph") {
      return;
    }
    if (
      input.type === "keyDown" &&
      input.alt &&
      (input.key === " " || input.key === "Space" || input.code === "Space")
    ) {
      event.preventDefault();
      if (
        state.isCaptureActive?.() &&
        isRightAltChordInput(state, input) &&
        !state.rightAltAcceleratorCaptured
      ) {
        sendShortcutCaptureAccelerator(window, state, "RightAlt+Space");
        state.rightAltAcceleratorCaptured = true;
      }
      return;
    }

    if (
      input.type === "keyDown" &&
      state.isCaptureActive?.() &&
      isRightAltChordInput(state, input) &&
      !state.rightAltAcceleratorCaptured
    ) {
      if (input.code === "ShiftRight") {
        event.preventDefault();
        sendShortcutCaptureAccelerator(window, state, "RightAlt+RightShift");
        state.rightAltAcceleratorCaptured = true;
        return;
      }

      const accelerator = buildRightAltAccelerator(state, input.code);
      if (accelerator) {
        event.preventDefault();
        sendShortcutCaptureAccelerator(window, state, accelerator);
        state.rightAltAcceleratorCaptured = true;
      }
    }
  });
}

function sendShortcutCaptureAccelerator(
  window: BrowserWindow,
  state: WindowAltSpaceGuardState,
  accelerator: string
): void {
  const target = state.getCaptureTarget?.();
  const receiver =
    target && !target.isDestroyed() && !target.webContents.isDestroyed()
      ? target
      : window;
  receiver.webContents.send(SHORTCUT_CAPTURE_ACCELERATOR_CHANNEL, {
    accelerator
  });
}

function resetKeyboardState(state: WindowAltSpaceGuardState): void {
  state.ctrlDown = false;
  state.leftAltDown = false;
  state.metaDown = false;
  state.rightAltAcceleratorCaptured = false;
  state.rightAltCaptureStarted = false;
  state.rightAltDown = false;
  state.rightAltSyntheticCtrlDown = false;
  state.shiftDown = false;
}

function resetRightAltCaptureState(state: WindowAltSpaceGuardState): void {
  state.rightAltAcceleratorCaptured = false;
  state.rightAltCaptureStarted = false;
  state.rightAltDown = false;
  state.rightAltSyntheticCtrlDown = false;
}

function trackModifierState(
  state: WindowAltSpaceGuardState,
  input: Electron.Input
): void {
  const isDown = input.type === "keyDown";
  if (input.key === "AltGraph") {
    if (isDown && state.ctrlDown && !state.leftAltDown) {
      state.rightAltSyntheticCtrlDown = true;
    }
    state.rightAltDown = isDown;
    if (isDown) {
      state.rightAltCaptureStarted = true;
      state.rightAltAcceleratorCaptured = false;
    }
    return;
  }

  switch (input.code) {
    case "ControlLeft":
    case "ControlRight":
      if (
        isDown &&
        input.control === true &&
        input.alt !== true &&
        !state.leftAltDown &&
        !state.rightAltDown &&
        !state.shiftDown &&
        !state.metaDown
      ) {
        state.rightAltSyntheticCtrlDown = true;
      }
      state.ctrlDown = isDown;
      if (!isDown) {
        state.rightAltSyntheticCtrlDown = false;
      }
      break;
    case "AltLeft":
      state.leftAltDown = isDown;
      break;
    case "AltRight":
      if (isDown && state.ctrlDown && !state.leftAltDown) {
        state.rightAltSyntheticCtrlDown = true;
      }
      state.rightAltDown = isDown;
      if (isDown) {
        state.rightAltCaptureStarted = true;
        state.rightAltAcceleratorCaptured = false;
      }
      break;
    case "ShiftLeft":
    case "ShiftRight":
      state.shiftDown = isDown;
      break;
    case "MetaLeft":
    case "MetaRight":
      state.metaDown = isDown;
      break;
    default:
      break;
  }
}

function isRightAltChordInput(
  state: WindowAltSpaceGuardState,
  input: Electron.Input
): boolean {
  if (state.rightAltDown || input.code === "AltRight" || input.key === "AltGraph") {
    return true;
  }

  return (
    input.alt === true &&
    input.control === true &&
    !state.leftAltDown &&
    (!state.ctrlDown || state.rightAltSyntheticCtrlDown || isRightSideModifierInput(input))
  );
}

function isRightSideModifierInput(input: Electron.Input): boolean {
  return Array.isArray(input.modifiers) && input.modifiers.includes("right");
}

function buildRightAltAccelerator(
  state: WindowAltSpaceGuardState,
  code: string
): string | undefined {
  const key = keyFromInputCode(code);
  if (!key) {
    return undefined;
  }

  const parts = ["Ctrl", "Alt", "Shift", "Super"].filter((modifier) => {
    switch (modifier) {
      case "Ctrl":
        return state.ctrlDown && !state.rightAltSyntheticCtrlDown;
      case "Alt":
        return state.leftAltDown;
      case "Shift":
        return state.shiftDown;
      case "Super":
        return state.metaDown;
      default:
        return false;
    }
  });
  parts.push("AltGr");
  return [...new Set(parts), key].join("+");
}

function keyFromInputCode(code: string): string | undefined {
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) {
    return code;
  }

  switch (code) {
    case "Space":
    case "Tab":
    case "Enter":
    case "Backspace":
    case "Delete":
    case "Insert":
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return code;
    case "Escape":
      return "Esc";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case "PrintScreen":
      return "PrintScreen";
    default:
      return SYMBOL_KEY_ACCELERATORS[code];
  }
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
  isCaptureActive: () => boolean,
  getCaptureTarget?: () => BrowserWindow | undefined
): void {
  const state = getOrCreateGuardState(window);
  state.isCaptureActive = isCaptureActive;
  state.getCaptureTarget = getCaptureTarget;
  ensureWindowAltSpaceGuard(window);
}

export function ensureShortcutCaptureWindowGuards(
  windows: BrowserWindow[],
  isCaptureActive: () => boolean,
  getCaptureTarget?: () => BrowserWindow | undefined
): void {
  for (const window of windows) {
    if (window.isDestroyed()) {
      continue;
    }
    wireShortcutCaptureWindowGuard(window, isCaptureActive, getCaptureTarget);
  }
}
